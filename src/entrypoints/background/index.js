// @ts-nocheck
import 'webextension-polyfill'
import { storage } from '@wxt-dev/storage'
import { browser } from 'wxt/browser'
import {
  loadSettings,
  subscribeToSettingsChanges,
} from '@/stores/settingsStore.svelte.js'
import { settingsStorage } from '@/services/wxtStorageService.js'
import { initSync } from '@/services/cloudSync/cloudSyncService.svelte.js'
import { loadSettingsWithReadiness } from './settingsBootstrap.js'
import {
  OllamaCorsService,
  OllamaApiProxyService,
} from './ollamaService.js'
import { describeTab } from './tabInfo.js'
import { createMessageRouter } from './messageRouter.js'
import { createSyncHandlers } from './handlers/syncHandlers.js'
import { createSummarizeHandlers } from './handlers/summarizeHandlers.js'
import { createPermissionHandlers } from './handlers/permissionHandlers.js'
import { createOllamaHandlers } from './handlers/ollamaHandlers.js'
import { createStorageHandlers } from './handlers/storageHandlers.js'
import { createExternalChatHandlers } from './handlers/externalChatHandlers.js'
import { createNavigationHandlers } from './handlers/navigationHandlers.js'
import {
  ALL_URLS,
  hasAllSitesAccess,
  listGrantedSites,
  domainToOriginPattern,
} from '@/services/firefoxSitePermissionService.js'

export async function injectScript(tabId, files) {
  if (!browser.scripting) return false
  try {
    await browser.scripting.executeScript({ target: { tabId }, files })
    return true
  } catch (error) {
    return false
  }
}

export async function executeFunction(tabId, func, args = []) {
  if (!browser.scripting) return null
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func,
      args,
    })
    return results?.[0]?.result ?? null
  } catch (error) {
    return null
  }
}

// --- Main Background Logic ---

export default defineBackground(() => {
  async function migrateStorageFromSyncToLocal() {
    const keysToMigrate = ['settings', 'theme', 'appState']

    for (const key of keysToMigrate) {
      try {
        const syncData = await storage.getItem(`sync:${key}`)
        if (syncData && Object.keys(syncData).length > 0) {
          const localData = (await storage.getItem(`local:${key}`)) || {}

          // Merge sync data into local data, with sync data taking precedence.
          const mergedData = { ...localData, ...syncData }

          // 1. Write to local storage
          await storage.setItem(`local:${key}`, mergedData)

          // 2. After successful write, remove from sync storage
          await storage.removeItem(`sync:${key}`)
        }
      } catch (error) {
        console.error(
          `Error migrating '${key}' from sync to local storage:`,
          error
        )
      }
    }
  }

  const ollamaCorsService = new OllamaCorsService()
  const ollamaApiProxy = new OllamaApiProxyService()
  let sidePanelPort = null
  let pendingSelectedText = null
  let pendingConversationResume = null
  // Sync cache of settings.showFloatingButton — updated from storage so we can read it synchronously
  // in the context menu handler (before any await, within the user gesture window).
  let cachedFabEnabled = true // Default true; will be updated on init and on storage changes
  ;(async () => {
    try {
      const result = await chrome.storage.local.get('settings')
      if (result.settings?.showFloatingButton !== undefined) {
        cachedFabEnabled = result.settings.showFloatingButton
        console.log('[Background] cachedFabEnabled init:', cachedFabEnabled)
      }
    } catch (e) {}
  })()
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings?.newValue?.showFloatingButton !== undefined) {
      cachedFabEnabled = changes.settings.newValue.showFloatingButton
      console.log('[Background] cachedFabEnabled updated:', cachedFabEnabled)
    }
  })
  const userAgent = navigator.userAgent
  const isMobile = userAgent.includes('Android') || userAgent.includes('Mobile')
  const isEdgeMobile =
    (userAgent.includes('Edge') && userAgent.includes('Mobile'))

  // --- Firefox Mobile Popup Setup (Must run early) ---
  if (import.meta.env.BROWSER === 'firefox') {
    ;(async () => {
      try {
        if (isMobile) {
          console.log('[Background] Firefox Mobile detected, setting popup')
          await browser.browserAction.setPopup({ popup: 'popop.html' })
        } else {
          await browser.browserAction.setPopup({ popup: '' })
        }
      } catch (e) {
        console.warn('[Background] setPopup failed:', e)
      }
    })()

    // Handle sidebar toggle for desktop
    if (!isMobile) {
      browser.browserAction.onClicked.addListener(() => {
        browser.sidebarAction.toggle()
      })
    }

    // --- Dynamic Content Script Registration ---
    const DYNAMIC_SCRIPT_ID = 'dynamic-content-script'

    async function getDynamicContentScriptFiles() {
      // Directly return the firefox content script files
      // WXT builds firefox.content.js to content-scripts/firefox.js
      return {
        js: ['content-scripts/firefox.js'],
        css: ['content-scripts/firefox.css'],
      }
    }

    // Recomputes which origins the dynamic FAB content script should match,
    // from the current permission grants, and re-registers it accordingly.
    // Per-site grants are invisible to a hardcoded `matches: ['<all_urls>']`
    // registration, so this replaces that fixed value with a live one:
    //   - all-sites access granted -> ['<all_urls>']
    //   - else the per-site patterns from listGrantedSites()
    //   - else [] -> unregister
    // Always unregister before re-registering (rather than
    // `updateContentScripts()`, which has been unreliable in Firefox for
    // `matches` changes) — this also naturally covers the "not currently
    // registered" state after a worker restart.
    async function syncDynamicContentScripts() {
      try {
        const files = await getDynamicContentScriptFiles()
        if (!files) {
          console.warn(
            '[Background] Could not find main content script files for dynamic registration'
          )
          return
        }

        let matches = []
        if (await hasAllSitesAccess()) {
          matches = [ALL_URLS]
        } else {
          const grantedSites = await listGrantedSites()
          matches = grantedSites
            .map((domain) => domainToOriginPattern(domain))
            .filter(Boolean)
        }

        if (matches.length === 0) {
          await unregisterDynamicContentScript()
          return
        }

        // Exclude domains that already have static content scripts to prevent double execution
        const excludeMatches = [
          '*://*.youtube.com/*',
          '*://*.udemy.com/*',
          '*://*.coursera.org/*',
          '*://*.reddit.com/*',
          '*://*.wikipedia.org/*',
        ]

        await unregisterDynamicContentScript()
        await browser.scripting.registerContentScripts([
          {
            id: DYNAMIC_SCRIPT_ID,
            js: files.js,
            css: files.css,
            matches,
            excludeMatches: excludeMatches,
            runAt: 'document_end',
            persistAcrossSessions: true,
          },
        ])
        console.log(
          '[Background] Dynamic content script registered for matches:',
          matches
        )
      } catch (error) {
        console.error(
          '[Background] Failed to sync dynamic content script:',
          error
        )
      }
    }

    async function unregisterDynamicContentScript() {
      try {
        await browser.scripting.unregisterContentScripts({
          ids: [DYNAMIC_SCRIPT_ID],
        })
        console.log('[Background] Dynamic content script unregistered')
      } catch (error) {
        // Ignore error if script wasn't registered
      }
    }

    // Listen for permission changes. Any origin change (not just
    // <all_urls>/*://*/*) can add or remove a per-site grant, so the FAB
    // registration must be recomputed whenever any origin is added/removed.
    browser.permissions.onAdded.addListener(async (permissions) => {
      if (permissions.origins?.length) {
        await syncDynamicContentScripts()
      }
    })

    browser.permissions.onRemoved.addListener(async (permissions) => {
      if (permissions.origins?.length) {
        await syncDynamicContentScripts()
      }
    })

    // Check on startup
    syncDynamicContentScripts()
  }

  // --- Initial Setup ---
  // Only load settings for Chrome as it handles iconClickAction
  if (import.meta.env.BROWSER === 'chrome') {
    loadSettings()

    // Watch settings storage directly for changes
    settingsStorage.watch((newValue, oldValue) => {
      console.log('[Background] Settings storage changed:', newValue)
      if (newValue?.iconClickAction !== undefined) {
        console.log(
          '[Background] Updating Chrome action behavior due to settings change'
        )
        updateChromeActionBehavior(newValue.iconClickAction)
      }
    })
  }

  // Function to update Chrome action behavior (Chrome only)
  function updateChromeActionBehavior(iconClickAction) {
    // Double check for Chrome to prevent any Firefox execution
    if (import.meta.env.BROWSER !== 'chrome') return

    try {
      // Force popup for mobile devices regardless of settings
      if (isMobile) {
        console.log('[Background] Mobile detected, setting action to POPUP')
        chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: false })
        browser.action.setPopup({
          popup: browser.runtime.getURL('popop.html'),
        })
        return
      }

      // Desktop behavior based on settings
      switch (iconClickAction) {
        case 'popup':
          console.log('[Background] Setting action to POPUP')
          chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: false })
          browser.action.setPopup({
            popup: browser.runtime.getURL('popop.html'),
          })
          break

        case 'floating':
          console.log('[Background] Setting action to FLOATING')
          chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: false })
          browser.action.setPopup({ popup: '' }) // Clear popup to enable onClicked
          break

        case 'sidepanel':
        default:
          console.log('[Background] Setting action to SIDEPANEL')
          chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true })
          browser.action.setPopup({ popup: '' }) // Clear popup to enable onClicked
          break
      }
    } catch (error) {
      console.error(
        '[Background] Error updating Chrome action behavior:',
        error
      )
    }
  }

  // Single, persistent listener for the browser action (Chrome only)
  if (import.meta.env.BROWSER === 'chrome') {
    browser.action.onClicked.addListener(async (tab) => {
      const settings = await settingsStorage.getValue()
      const action = settings?.iconClickAction ?? 'sidepanel'

      if (action === 'floating') {
        console.log('[Background] Floating action clicked, toggling panel...')
        try {
          await browser.tabs.sendMessage(tab.id, {
            type: 'TOGGLE_FLOATING_PANEL',
          })
        } catch (error) {
          console.error(
            '[Background] Could not send TOGGLE_FLOATING_PANEL message:',
            error
          )
        }
      }
      // Note: 'popup' action is handled by browser.action.setPopup and will not trigger this listener.
      // 'sidepanel' action is handled by chrome.sidePanel.setPanelBehavior and also won't trigger this listener.
    })
  }

  // Subscribe to settings changes on every browser. This used to be gated to
  // Chrome, which left the Firefox background holding whatever settings it read
  // at start-up: MV2 background pages are persistent, so unlike Chrome's MV3
  // worker they never restart and re-read. Since `updateSettings()` rewrites the
  // *entire* settings object from in-memory state, any background write on a
  // stale copy would silently revert every change made in the settings page
  // since browser start.
  const unsubscribe = subscribeToSettingsChanges()
  console.log(
    '[Background] Settings change watcher setup:',
    unsubscribe ? 'success' : 'failed'
  )
  ;(async () => {
    try {
      // Wait a bit for settings to be ready, then initialize Ollama if needed
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const settings = await loadSettingsWithReadiness()
      if (settings && settings.selectedProvider === 'ollama') {
        await ollamaCorsService.setupOllamaCorsRules(
          settings.ollamaEndpoint || 'http://127.0.0.1:11434'
        )
        console.log('[Background] Ollama CORS service initialized successfully')
      }
    } catch (error) {
      console.error(
        '[Background] Failed to initialize Ollama CORS service:',
        error
      )
    }
  })()

  // ============================================
  // CLOUD SYNC AUTO-SYNC SETUP (Industry Standard)
  // Uses WXT browser.alarms API for cross-browser support
  // ============================================

  const AUTO_SYNC_ALARM_NAME = 'cloudAutoSync'
  const AUTO_SYNC_PERIOD_MINUTES = 10 // Sync every 10 minutes

  /**
   * Setup auto-sync alarm if user has enabled it
   * This is called on install, startup, and when settings change
   */
  async function setupAutoSyncAlarm() {
    try {
      // Check if Cloud Sync tool is enabled in settings
      const settings = await settingsStorage.getValue()
      // Default to true if not set (backward compatibility)
      const isCloudSyncEnabled = settings?.tools?.cloudSync?.enabled ?? true

      if (!isCloudSyncEnabled) {
        console.log('[Background] Cloud Sync tool is disabled, clearing alarm...')
        await browser.alarms.clear(AUTO_SYNC_ALARM_NAME)
        return
      }

      const { syncStorage } = await import('@/services/cloudSync/cloudSyncService.svelte.js')
      const stored = await syncStorage.getValue()

      if (stored.isLoggedIn && stored.autoSyncEnabled && !stored.needsReauth) {
        // Check if alarm already exists
        const existingAlarm = await browser.alarms.get(AUTO_SYNC_ALARM_NAME)
        if (!existingAlarm) {
          await browser.alarms.create(AUTO_SYNC_ALARM_NAME, {
            periodInMinutes: AUTO_SYNC_PERIOD_MINUTES
          })
          console.log(`[Background] Auto-sync alarm created: every ${AUTO_SYNC_PERIOD_MINUTES} minutes`)
        } else {
          console.log('[Background] Auto-sync alarm already exists')
        }
      } else {
        // Clear alarm if not logged in, auto-sync disabled, or the grant died
        await browser.alarms.clear(AUTO_SYNC_ALARM_NAME)
        console.log('[Background] Auto-sync alarm cleared (disabled, not logged in, or reconnect required)')
      }
    } catch (error) {
      console.error('[Background] Failed to setup auto-sync alarm:', error)
    }
  }

  // Watch for Cloud Sync settings changes (Cross-browser)
  // This ensures the alarm is cleared immediately when the user disables the tool
  // Also triggers sync when any settings change (since bind:value bypasses updateSettings())
  settingsStorage.watch(async (newValue, oldValue) => {
    // Check if Cloud Sync enabled state changed
    const newEnabled = newValue?.tools?.cloudSync?.enabled
    const oldEnabled = oldValue?.tools?.cloudSync?.enabled

    if (newEnabled !== oldEnabled) {
      console.log(`[Background] Cloud Sync enabled state changed to: ${newEnabled}, updating alarm...`)
      await setupAutoSyncAlarm()
    }

    // Trigger sync when settings change (handles bind:value which bypasses updateSettings)
    // Only trigger if Cloud Sync is enabled and user is logged in
    if (newEnabled !== false) { // Default is true
      try {
        const { syncStorage, pullData } = await import('@/services/cloudSync/cloudSyncService.svelte.js')
        const stored = await syncStorage.getValue()

        if (stored.isLoggedIn && stored.autoSyncEnabled) {
          // Compare settings (excluding lastModified to avoid false positives)
          const oldCopy = { ...oldValue }
          const newCopy = { ...newValue }
          delete oldCopy?.lastModified
          delete newCopy?.lastModified

          if (JSON.stringify(oldCopy) !== JSON.stringify(newCopy)) {
            console.log('[Background] Settings changed, triggering debounced sync...')

            // Clear existing debounce timer and set a new one
            // Use globalThis instead of window (service worker doesn't have window)
            if (globalThis.syncDebounceTimer) {
              clearTimeout(globalThis.syncDebounceTimer)
            }

            const DEBOUNCE_DELAY = 10 * 1000 // 10 seconds
            globalThis.syncDebounceTimer = setTimeout(async () => {
              try {
                console.log('[Background] Executing debounced sync for settings change...')
                await pullData()
                console.log('[Background] Settings sync completed')
              } catch (syncError) {
                console.error('[Background] Settings sync failed:', syncError)
              }
            }, DEBOUNCE_DELAY)
          }
        }
      } catch (error) {
        console.warn('[Background] Failed to check sync status:', error)
      }
    }
  })

  // Setup alarm on extension install
  browser.runtime.onInstalled.addListener(async () => {
    console.log('[Background] Extension installed, checking auto-sync...')
    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for storage
    await setupAutoSyncAlarm()
    await runSoftDeleteCleanup() // Run cleanup on install
  })

  // Setup alarm on browser startup
  browser.runtime.onStartup.addListener(async () => {
    console.log('[Background] Browser started, ensuring auto-sync alarm exists...')
    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for storage
    await setupAutoSyncAlarm()
    await runSoftDeleteCleanup() // Run cleanup on startup
  })

  // Soft delete cleanup - runs once per day
  async function runSoftDeleteCleanup() {
    try {
      console.log('[Background] 🧹 Checking soft delete cleanup...')
      const { cleanupStorage } = await import('@/services/wxtStorageService.js')
      const lastCleanup = await cleanupStorage.getValue()
      const today = new Date().toDateString()

      console.log(`[Background] Last cleanup: ${lastCleanup || 'never'}, Today: ${today}`)

      if (lastCleanup !== today) {
        console.log('[Background] Running soft delete cleanup...')
        const { cleanupSoftDeletedItems } = await import('@/lib/db/indexedDBService.js')
        const cleaned = await cleanupSoftDeletedItems()
        await cleanupStorage.setValue(today)
        console.log(`[Background] ✅ Cleanup complete. Removed ${cleaned} items older than 30 days.`)
      } else {
        console.log('[Background] ⏭️ Cleanup already done today, skipping.')
      }
    } catch (e) {
      console.warn('[Background] ❌ Soft delete cleanup failed:', e)
    }
  }

  // Listen for alarm trigger
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === AUTO_SYNC_ALARM_NAME) {
      const now = new Date().toLocaleString()
      console.log(`[Background] ⏰ AUTO-SYNC ALARM TRIGGERED at ${now}`)

      try {
        const { pullData, syncStorage } = await import('@/services/cloudSync/cloudSyncService.svelte.js')

        // Check settings first
        const settings = await settingsStorage.getValue()
        const isCloudSyncEnabled = settings?.tools?.cloudSync?.enabled ?? true

        if (!isCloudSyncEnabled) {
          console.log('[Background] Auto-sync skipped: cloudSync tool is disabled')
          // Self-heal: clear the alarm if it shouldn't be running
          await browser.alarms.clear(AUTO_SYNC_ALARM_NAME)
          return
        }

        const stored = await syncStorage.getValue()

        if (!stored.isLoggedIn || !stored.autoSyncEnabled) {
          console.log('[Background] Auto-sync skipped: not logged in or disabled')
          // Clear alarm since auto-sync is disabled
          await browser.alarms.clear(AUTO_SYNC_ALARM_NAME)
          return
        }

        if (stored.needsReauth) {
          console.log('[Background] Auto-sync skipped: reconnect required')
          // Nothing will succeed until the user re-authorises; stop waking up
          // every 10 minutes. login() re-arms the alarm.
          await browser.alarms.clear(AUTO_SYNC_ALARM_NAME)
          return
        }

        await pullData()
        console.log('[Background] Auto-sync completed successfully')
      } catch (error) {
        console.error('[Background] Auto-sync failed:', error)
      }
    }
  })

  // Initialize Cloud Sync service (one-time init on load)
  ;(async () => {
    try {
      // Wait for storage to be ready
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await initSync()
      console.log('[Background] Cloud Sync service initialized')

      // Also ensure alarm is setup (for cases where extension is already installed)
      await setupAutoSyncAlarm()
    } catch (error) {
      console.error('[Background] Failed to initialize Cloud Sync:', error)
    }
  })()

  function initializeContextMenu() {
    try {
      if (browser.contextMenus) {
        browser.contextMenus.create({
          id: 'summarizeSelectedText',
          title: 'Summarize selected text',
          type: 'normal',
          contexts: ['selection'],
        })

        // Context menu for links - Quick Summary in new tab
        browser.contextMenus.create({
          id: 'quickSummaryLink',
          title: 'Summarize in new tab',
          type: 'normal',
          contexts: ['link'],
        })

        // Create context menu for Chrome (action) and Firefox (browser_action)
        const contexts = []
        if (browser.action) contexts.push('action')
        if (browser.browserAction) contexts.push('browser_action')

        if (contexts.length > 0) {
          browser.contextMenus.create({
            id: 'openSettings',
            title: 'Open Settings',
            type: 'normal',
            contexts: contexts,
          })
          browser.contextMenus.create({
            id: 'openHistory',
            title: 'Open History',
            type: 'normal',
            contexts: contexts,
          })
          browser.contextMenus.create({
            id: 'openPromptEditor',
            title: 'Open Prompt Editor',
            type: 'normal',
            contexts: contexts,
          })
        }
      }
    } catch (error) {
      console.log('Context menu creation failed, might already exist:', error)
    }
  }

  // Dynamic context menu visibility: hide "Summarize selected text" when clicking on links
  // Uses onShown event (Firefox) or the handler approach (Chrome - onShown not available)
  // Note: Firefox Mobile doesn't have contextMenus API at all, so we need to check for it first
  if (browser.contextMenus?.onShown) {
    // Firefox supports onShown for dynamic updates
    browser.contextMenus.onShown.addListener((info, tab) => {
      const isLinkContext = info.contexts.includes('link')
      const hasSelection = info.contexts.includes('selection') && info.selectionText

      // Hide summarizeSelectedText when clicking on a link
      if (isLinkContext) {
        browser.contextMenus.update('summarizeSelectedText', { visible: false })
        browser.contextMenus.refresh()
      } else if (hasSelection) {
        // Show it when there's only selection (no link)
        browser.contextMenus.update('summarizeSelectedText', { visible: true })
        browser.contextMenus.refresh()
      }
    })

    // Reset visibility when menu is hidden
    browser.contextMenus.onHidden.addListener(() => {
      browser.contextMenus.update('summarizeSelectedText', { visible: true })
    })
  }

  // --- Browser/Platform Specific Setup ---
  if (import.meta.env.BROWSER === 'chrome') {
    // Setup Chrome action behavior based on settings with enhanced retry and fallback
    async function setupChromeAction() {
      // Immediately clear any manifest popup override
      try {
        await browser.action.setPopup({ popup: '' })
        console.log('[Background] Cleared manifest popup override')
      } catch (error) {
        console.warn('[Background] Failed to clear popup:', error)
      }

      const MAX_RETRIES = 6
      const INITIAL_DELAY = 100 // Start with 100ms
      const MAX_DELAY = 3000 // Cap at 3s

      for (let i = 0; i < MAX_RETRIES; i++) {
        try {
          console.log(`[Background] Attempt ${i + 1} to load settings...`)
          const settings = await loadSettingsWithReadiness()

          if (settings && settings.iconClickAction) {
            console.log(
              `[Background] Settings loaded successfully. Setting action to: ${settings.iconClickAction}`
            )
            updateChromeActionBehavior(settings.iconClickAction)
            return // Success, exit the function
          }

          console.warn(
            '[Background] Settings not ready or invalid:',
            settings
              ? 'settings loaded but missing iconClickAction'
              : 'settings is null/undefined'
          )
        } catch (error) {
          console.error(
            `[Background] Error on attempt ${i + 1} to set up Chrome action:`,
            error
          )
        }

        // If not the last attempt, wait with exponential backoff
        if (i < MAX_RETRIES - 1) {
          const delay = Math.min(INITIAL_DELAY * Math.pow(1.5, i), MAX_DELAY)
          console.log(
            `[Background] Waiting ${delay}ms before retry ${i + 2}...`
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }

      // Fallback to safe default behavior
      console.warn(
        `[Background] Failed to load settings after ${MAX_RETRIES} attempts. Using fallback default behavior.`
      )
      try {
        // Use popup for mobile, sidepanel for desktop as fallback
        const fallbackAction = isMobile ? 'popup' : 'sidepanel'
        updateChromeActionBehavior(fallbackAction)
        console.log(
          `[Background] Applied fallback action behavior: ${fallbackAction}`
        )
      } catch (error) {
        console.error('[Background] Failed to apply fallback behavior:', error)
      }
    }
    setupChromeAction()
  }


  // --- Consolidated Message Listener ---
  // One dispatch table instead of ~540 lines of sequential `if`. Each domain
  // module owns its own message types; see ./messageRouter.js for the
  // `return true` contract, which is unchanged.
  browser.runtime.onMessage.addListener(
    createMessageRouter([
      createSyncHandlers({
        setupAutoSyncAlarm,
        autoSyncAlarmName: AUTO_SYNC_ALARM_NAME,
      }),
      createSummarizeHandlers(),
      createPermissionHandlers({ getSidePanelPort: () => sidePanelPort }),
      createOllamaHandlers({ ollamaApiProxy, ollamaCorsService }),
      createStorageHandlers(),
      createExternalChatHandlers(),
      createNavigationHandlers({
        getSidePanelPort: () => sidePanelPort,
        setPendingConversationResume: (conversationId) => {
          pendingConversationResume = conversationId
        },
      }),
    ])
  )

  // --- Other Listeners ---
  browser.runtime.onConnect.addListener((port) => {
    if (port.name === 'side-panel') {
      sidePanelPort = port
      if (pendingConversationResume) {
        const conversationId = pendingConversationResume
        pendingConversationResume = null
        setTimeout(() => sidePanelPort?.postMessage({ action: 'resumeConversation', conversationId }), 500)
      }
      if (pendingSelectedText) {
        // Delay sending to allow sidepanel's messageHandler to fully mount and register its listener.
        // Without delay, the message can arrive before the Svelte component's onMount has run.
        const textToSend = pendingSelectedText
        pendingSelectedText = null
        setTimeout(() => {
          if (sidePanelPort) {
            try {
              sidePanelPort.postMessage({
                action: 'summarizeSelectedText',
                selectedText: textToSend,
              })
              console.log('[Background] Sent pendingSelectedText to sidepanel after delay')
            } catch (e) {
              console.error('[Background] Failed to send pendingSelectedText after delay:', e)
            }
          }
        }, 500)
      }
      port.onDisconnect.addListener(() => {
        sidePanelPort = null
      })
    }
  })

  // browser.commands API is not available on Firefox mobile
  // Wrap in try-catch and check for API availability
  if (browser.commands && browser.commands.onCommand) {
    try {
      browser.commands.onCommand.addListener(async (command) => {
        const [activeTab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        })
        if (!activeTab) return

        if (command === 'summarize-current-page') {
          const summarizePageInfo = describeTab(activeTab, 'summarizeCurrentPage')
          if (sidePanelPort) sidePanelPort.postMessage(summarizePageInfo)
          else browser.runtime.sendMessage(summarizePageInfo).catch(() => {})

          // Browser-specific panel opening
          if (import.meta.env.BROWSER === 'chrome') {
            await chrome.sidePanel.open({ windowId: activeTab.windowId })
          } else {
            await browser.sidebarAction.open()
          }
        }
      })
      console.log('[Background] browser.commands listener registered')
    } catch (error) {
      console.warn('[Background] browser.commands not available (mobile?):', error)
    }
  } else {
    console.log('[Background] browser.commands API not available, skipping keyboard shortcuts')
  }

  browser.runtime.onInstalled.addListener(async (details) => {
    // Run migration only on install/update, not on every startup
    if (details.reason === 'install' || details.reason === 'update') {
      await migrateStorageFromSyncToLocal()
    }

    initializeContextMenu()
  })
  if (import.meta.env.BROWSER === 'firefox') {
    browser.runtime.onStartup.addListener(() => initializeContextMenu())
  }

  // Firefox Mobile doesn't support contextMenus API, so check before using
  if (browser.contextMenus) {
    browser.contextMenus.onClicked.addListener(async (info, tab) => {
    // Minimum 20 characters to avoid accidental triggers on very short selections
    const MIN_SELECTION_LENGTH = 20
    if (info.menuItemId === 'summarizeSelectedText' && info.selectionText && info.selectionText.trim().length >= MIN_SELECTION_LENGTH) {
      pendingSelectedText = info.selectionText
      console.log('[Background] Context menu: summarizeSelectedText clicked')

      // --- Detect extension pages (archive, settings, prompt) where FAB is NOT available ---
      const extensionBaseUrl = browser.runtime.getURL('')
      const isExtensionPage = tab?.url?.startsWith(extensionBaseUrl)

      if (isExtensionPage) {
        console.log('[Background] Extension page detected, forcing sidepanel route')
      }

      // --- STEP 1: Pre-open sidepanel/sidebar within user gesture when FAB won't handle ---
      // Both Chrome and Firefox require user gesture for opening side panel/sidebar.
      // The gesture expires after the first await, so we must open BEFORE trying FAB.
      // When FAB is enabled on a normal page: skip pre-open, let FAB handle it.
      // When FAB is disabled or extension page: pre-open now.
      let sidePanelPreOpened = false
      if ((!cachedFabEnabled || isExtensionPage) && !sidePanelPort && tab?.id) {
        try {
          if (import.meta.env.BROWSER === 'chrome') {
            await chrome.sidePanel.open({ tabId: tab.id })
          } else {
            await browser.sidebarAction.open()
          }
          sidePanelPreOpened = true
          console.log('[Background] Panel pre-opened (FAB disabled or extension page)')
        } catch (e) {
          console.error('[Background] Failed to pre-open panel:', e)
        }
      }

      // --- STEP 2: Try FAB (content script) — skip for extension pages ---
      let fabHandled = false
      if (tab?.id && !isExtensionPage) {
        try {
          const fabResponse = await browser.tabs.sendMessage(tab.id, {
            type: 'SUMMARIZE_SELECTED_TEXT_FAB',
            selectedText: pendingSelectedText,
          })
          if (fabResponse?.success) {
            console.log('[Background] summarizeSelectedText handled by FAB content script')
            fabHandled = true
            pendingSelectedText = null
          }
        } catch (fabError) {
          console.log('[Background] FAB content script not available, sidepanel will handle:', fabError.message)
        }
      }

      // --- STEP 3: Fallback to sidepanel/sidebar if FAB did not handle ---
      if (!fabHandled) {
        console.log('[Background] Routing to sidepanel. sidePanelPort exists:', !!sidePanelPort)
        if (sidePanelPort) {
          try {
            sidePanelPort.postMessage({
              action: 'summarizeSelectedText',
              selectedText: pendingSelectedText,
            })
            pendingSelectedText = null
          } catch (e) {
            console.error('[Background] Failed to send to sidepanel port:', e)
          }
        }
        // Need to open panel if not yet open and no port connected
        if (pendingSelectedText && !sidePanelPreOpened) {
          try {
            if (import.meta.env.BROWSER === 'chrome' && tab?.id) {
              await chrome.sidePanel.open({ tabId: tab.id })
              sidePanelPreOpened = true
              console.log('[Background] Sidepanel opened as fallback')
            } else if (import.meta.env.BROWSER === 'firefox') {
              // Firefox: user gesture still valid — sendMessage resolved in <10ms
              await browser.sidebarAction.open()
              sidePanelPreOpened = true
              console.log('[Background] Firefox sidebar opened as fallback after FAB unavailable')
            }
          } catch (fallbackError) {
            console.warn('[Background] Sidepanel/sidebar open failed:', fallbackError.message)
            pendingSelectedText = null
          }
        }
      }
    } else if (info.menuItemId === 'openSettings') {
      browser.tabs.create({
        url: browser.runtime.getURL('settings.html'),
        active: true,
      })
    } else if (info.menuItemId === 'openHistory') {
      browser.tabs.create({
        url: browser.runtime.getURL('archive.html'),
        active: true,
      })
    } else if (info.menuItemId === 'openPromptEditor') {
      browser.tabs.create({
        url: browser.runtime.getURL('prompt.html'),
        active: true,
      })
    } else if (info.menuItemId === 'quickSummaryLink' && info.linkUrl) {
      // Quick Summary for any link - open in background tab and trigger summarization
      console.log('[Background] Quick Summary Link clicked:', info.linkUrl)

      // Helper function to extract YouTube video ID from URL
      const extractVideoIdFromUrl = (url) => {
        if (!url) return null
        try {
          const urlObj = new URL(url)
          if (urlObj.hostname.includes('youtube.com')) {
            if (urlObj.pathname === '/watch') {
              return urlObj.searchParams.get('v')
            }
            if (urlObj.pathname.startsWith('/shorts/')) {
              return urlObj.pathname.split('/')[2]
            }
          }
          if (urlObj.hostname === 'youtu.be') {
            return urlObj.pathname.slice(1)
          }
        } catch {
          return null
        }
        return null
      }

      const youtubeVideoId = extractVideoIdFromUrl(info.linkUrl)

      if (youtubeVideoId) {
        // YouTube link - use existing Quick Summary logic
        console.log('[Background] YouTube link detected, videoId:', youtubeVideoId)

        const currentSettings = await settingsStorage.getValue()
        const autoplayMode = currentSettings?.quickSummaryAutoplay || 'pause'

        const newTab = await browser.tabs.create({
          url: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
          active: false
        })

        // Send QUICK_SUMMARY_TRIGGER after tab loads
        const sendTrigger = async (tabId, retries = 5) => {
          for (let i = 0; i < retries; i++) {
            try {
              await new Promise(r => setTimeout(r, 2000))
              await browser.tabs.sendMessage(tabId, {
                type: 'QUICK_SUMMARY_TRIGGER',
                videoId: youtubeVideoId,
                autoplayMode
              })
              console.log(`[Background] QUICK_SUMMARY_TRIGGER sent to tab ${tabId}`)
              return
            } catch (e) {
              console.log(`[Background] Retry ${i + 1}/${retries} - content script not ready`)
            }
          }
        }
        sendTrigger(newTab.id)
      } else {
        // Generic website - open tab and trigger FAB summarization
        console.log('[Background] Generic link, opening in new tab')

        const newTab = await browser.tabs.create({
          url: info.linkUrl,
          active: false
        })

        // Send QUICK_SUMMARY_TRIGGER_GENERIC after tab loads
        const sendGenericTrigger = async (tabId, retries = 8) => {
          for (let i = 0; i < retries; i++) {
            try {
              await new Promise(r => setTimeout(r, 2000))
              await browser.tabs.sendMessage(tabId, {
                type: 'QUICK_SUMMARY_TRIGGER_GENERIC'
              })
              console.log(`[Background] QUICK_SUMMARY_TRIGGER_GENERIC sent to tab ${tabId}`)
              return
            } catch (e) {
              console.log(`[Background] Retry ${i + 1}/${retries} - content script not ready`)
            }
          }
          console.error('[Background] Failed to send QUICK_SUMMARY_TRIGGER_GENERIC after retries')
        }
        sendGenericTrigger(newTab.id)
      }
    }
    })
  } // End of if (browser.contextMenus)

  // Tab change listeners
  const handleTabChange = async (tabId) => {
    try {
      const tab = await browser.tabs.get(tabId)
      if (!tab.url) return
      const info = describeTab(tab, 'tabUpdated')
      if (sidePanelPort) sidePanelPort.postMessage(info)
      else browser.runtime.sendMessage(info).catch(() => {})
    } catch (e) {}
  }
  browser.tabs.onActivated.addListener((activeInfo) =>
    handleTabChange(activeInfo.tabId)
  )
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' || changeInfo.title) {
      // Only handle tab change if this tab is currently active
      // This prevents title updates from background tabs (e.g., Messenger notifications)
      try {
        const [activeTab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        })

        if (activeTab && activeTab.id === tabId) {
          handleTabChange(tabId)
        }
      } catch (error) {
        console.error('[Background] Error checking active tab:', error)
      }
    }
  })

  // MEMORY FIX: Cleanup per-tab cache when browser tab is closed
  browser.tabs.onRemoved.addListener(async (tabId) => {
    try {
      const { clearTabState } = await import('@/services/tabCacheService.js')
      clearTabState(tabId)
      console.log(`[Background] Cleared tab state for tab ${tabId}`)
    } catch (e) {
      // Ignore - tabCacheService might not be loaded
    }
  })
})
