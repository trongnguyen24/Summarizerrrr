// @ts-nocheck
import 'webextension-polyfill'
import { storage } from '@wxt-dev/storage'
import { browser } from 'wxt/browser'
import {
  loadSettings,
  subscribeToSettingsChanges,
} from '../stores/settingsStore.svelte.js'
import { settingsStorage } from '../services/wxtStorageService.js'
import {
  summaryState,
  summarizeSelectedText,
  logAllGeneratedSummariesToHistory,
} from '../stores/summaryStore.svelte.js'
import { get } from 'svelte/store'
import {
  addHistory,
  addSummary,
  updateHistoryArchivedStatus,
} from '@/lib/db/indexedDBService.js'
import { getAISDKModel, mapGenerationConfig } from '@/lib/api/aiSdkAdapter.js'
import { generateText } from 'ai'

// --- Helper Functions ---
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

// --- Service Classes ---

class OllamaCorsService {
  constructor() {
    this.ruleId = 1001
    this.initialized = false
  }
  async setupOllamaCorsRules(endpoint = 'http://127.0.0.1:11434') {
    if (!browser.declarativeNetRequest) return false
    try {
      const normalizedEndpoint = endpoint.endsWith('/')
        ? endpoint.slice(0, -1)
        : endpoint
      const requestRule = {
        id: this.ruleId,
        priority: 1,
        condition: {
          urlFilter: `${normalizedEndpoint}/*`,
          resourceTypes: ['xmlhttprequest'],
        },
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            { header: 'origin', operation: 'set', value: normalizedEndpoint },
          ],
        },
      }
      const responseRule = {
        id: this.ruleId + 1,
        priority: 1,
        condition: {
          urlFilter: `${normalizedEndpoint}/*`,
          resourceTypes: ['xmlhttprequest'],
        },
        action: {
          type: 'modifyHeaders',
          responseHeaders: [
            {
              header: 'Access-Control-Allow-Origin',
              operation: 'set',
              value: '*',
            },
            {
              header: 'Access-Control-Allow-Methods',
              operation: 'set',
              value: 'GET, POST, PUT, DELETE, OPTIONS',
            },
            {
              header: 'Access-Control-Allow-Headers',
              operation: 'set',
              value: 'Content-Type, Authorization',
            },
          ],
        },
      }
      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [this.ruleId, this.ruleId + 1],
        addRules: [requestRule, responseRule],
      })
      this.initialized = true
      console.log(
        '[OllamaCorsService] CORS rules setup for:',
        normalizedEndpoint
      )
      return true
    } catch (error) {
      console.error('[OllamaCorsService] Failed to setup CORS rules:', error)
      return false
    }
  }
  async updateEndpoint(newEndpoint) {
    if (!newEndpoint) return false
    return this.setupOllamaCorsRules(newEndpoint)
  }
}

class OllamaApiProxyService {
  async handleApiRequest(providerId, settings, systemInstruction, userPrompt) {
    try {
      const baseModel = getAISDKModel(providerId, settings)
      const generationConfig = mapGenerationConfig(settings)
      const { text } = await generateText({
        model: baseModel,
        system: systemInstruction,
        prompt: userPrompt,
        ...generationConfig,
      })
      return text
    } catch (error) {
      console.error(`[OllamaApiProxy] API request failed:`, error)
      throw error
    }
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
  const userAgent = navigator.userAgent
  const isMobile = userAgent.includes('Android')

  // --- Initial Setup ---
  loadSettings()

  // Watch settings storage directly for changes
  settingsStorage.watch((newValue, oldValue) => {
    console.log('[Background] Settings storage changed:', newValue)
    if (
      import.meta.env.BROWSER === 'chrome' &&
      newValue?.enableSidepanelSupport !== undefined
    ) {
      console.log(
        '[Background] Updating Chrome action behavior due to settings change'
      )
      updateChromeActionBehavior(newValue.enableSidepanelSupport)
    }
  })

  // Function to update Chrome action behavior
  let chromeActionListener = null
  function updateChromeActionBehavior(enableSidepanel) {
    if (import.meta.env.BROWSER !== 'chrome') return

    console.log(
      '[Background] updateChromeActionBehavior called with:',
      enableSidepanel
    )
    console.log('[Background] isMobile:', isMobile)

    try {
      // Remove existing listener if any
      if (chromeActionListener) {
        chrome.action.onClicked.removeListener(chromeActionListener)
        chromeActionListener = null
        console.log('[Background] Removed existing click listener')
      }

      if (!isMobile && enableSidepanel) {
        // Enable sidepanel
        console.log('[Background] Enabling sidepanel')
        chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true })
      } else {
        // Disable sidepanel and use popup instead
        console.log('[Background] Disabling sidepanel, using popup instead')
        chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: false })
        chromeActionListener = () => {
          console.log('[Background] Opening popup window')
          browser.windows.create({
            url: browser.runtime.getURL('popop.html'),
            type: 'popup',
            width: 400,
            height: 600,
          })
        }
        chrome.action.onClicked.addListener(chromeActionListener)
        console.log('[Background] Added popup click listener')
      }
    } catch (error) {
      console.error(
        '[Background] Error updating Chrome action behavior:',
        error
      )
    }
  }

  // Subscribe to settings changes - this function returns a watcher
  const unsubscribe = subscribeToSettingsChanges()
  console.log(
    '[Background] Settings change watcher setup:',
    unsubscribe ? 'success' : 'failed'
  )
  ;(async () => {
    try {
      const settings = await loadSettings()
      if (settings.selectedProvider === 'ollama') {
        await ollamaCorsService.setupOllamaCorsRules(
          settings.ollamaEndpoint || 'http://127.0.0.1:11434'
        )
      }
    } catch (error) {
      console.error(
        '[Background] Failed to initialize Ollama CORS service:',
        error
      )
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
      }
    } catch (error) {
      console.log('Context menu creation failed, might already exist:', error)
    }
  }

  // --- Browser/Platform Specific Setup ---
  if (import.meta.env.BROWSER === 'chrome') {
    // Setup Chrome action behavior based on settings
    async function setupChromeAction() {
      try {
        console.log('[Background] Starting to load settings...')
        const currentSettings = await loadSettings()
        console.log('[Background] Loaded settings:', currentSettings)
        console.log('[Background] Settings type:', typeof currentSettings)

        // Check if currentSettings is actually the resolved value or Promise
        if (currentSettings && typeof currentSettings.then === 'function') {
          console.log(
            '[Background] loadSettings returned a Promise, waiting...'
          )
          const resolvedSettings = await currentSettings
          console.log('[Background] Resolved settings:', resolvedSettings)
          const enableSidepanel =
            resolvedSettings?.enableSidepanelSupport ?? true
          updateChromeActionBehavior(enableSidepanel)
        } else if (currentSettings && typeof currentSettings === 'object') {
          console.log('[Background] loadSettings returned object directly')
          const enableSidepanel = currentSettings.enableSidepanelSupport ?? true
          console.log(
            '[Background] enableSidepanelSupport value:',
            currentSettings.enableSidepanelSupport
          )
          console.log('[Background] Using enableSidepanel:', enableSidepanel)
          updateChromeActionBehavior(enableSidepanel)
        } else {
          console.log(
            '[Background] loadSettings returned invalid data, using default'
          )
          updateChromeActionBehavior(true) // Default to true
        }
      } catch (error) {
        console.error('[Background] Error setting up Chrome action:', error)
        // Fallback to popup if settings load fails
        updateChromeActionBehavior(false)
      }
    }
    setupChromeAction()
  } else if (import.meta.env.BROWSER === 'firefox') {
    ;(async () => {
      try {
        if (isMobile) {
          await browser.browserAction.setPopup({ popup: 'popop.html' })
        } else {
          await browser.browserAction.setPopup({ popup: '' })
        }
      } catch (e) {
        console.warn('setPopup failed:', e)
      }
    })()
    browser.browserAction.onClicked.addListener(() => {
      browser.sidebarAction.toggle()
    })
  }

  // --- Consolidated Message Listener ---
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Async handlers that need `return true`
    if (message.type === 'CHECK_FIREFOX_PERMISSION') {
      // Chỉ xử lý cho Firefox
      if (import.meta.env.BROWSER === 'firefox') {
        ;(async () => {
          try {
            // Import permission service functions
            const { checkPermission } = await import(
              '../services/firefoxPermissionService.js'
            )
            const hasPermission = await checkPermission(message.url)
            sendResponse({
              success: true,
              hasPermission,
              url: message.url,
            })
          } catch (error) {
            console.error(
              '[Background] Error checking Firefox permissions:',
              error
            )
            sendResponse({
              success: false,
              error: error.message,
              url: message.url,
            })
          }
        })()
      } else {
        // Cho browser khác, luôn trả về true
        sendResponse({
          success: true,
          hasPermission: true,
          url: message.url,
        })
      }
      return true
    }
    if (message.type === 'OLLAMA_API_REQUEST') {
      ;(async () => {
        try {
          const result = await ollamaApiProxy.handleApiRequest(
            message.providerId,
            message.settings,
            message.systemInstruction,
            message.userPrompt
          )
          sendResponse({
            type: 'OLLAMA_API_RESPONSE',
            requestId: message.requestId,
            success: true,
            result,
          })
        } catch (error) {
          sendResponse({
            type: 'OLLAMA_API_ERROR',
            requestId: message.requestId,
            success: false,
            error: {
              message: error.message,
              type: error.type || 'PROXY_ERROR',
            },
          })
        }
      })()
      return true
    }
    if (message.type === 'SAVE_TO_HISTORY') {
      ;(async () => {
        try {
          const result = await addHistory(message.payload.historyData)
          sendResponse({ success: true, id: String(result) })
        } catch (error) {
          sendResponse({ success: false, error: error.message })
        }
      })()
      return true
    }
    if (message.type === 'SAVE_TO_ARCHIVE') {
      ;(async () => {
        try {
          const newArchiveId = await addSummary(message.payload.archiveEntry)
          if (message.payload.historySourceId) {
            await updateHistoryArchivedStatus(
              message.payload.historySourceId,
              true
            )
          }
          sendResponse({ success: true, newArchiveId: String(newArchiveId) })
        } catch (error) {
          sendResponse({ success: false, error: error.message })
        }
      })()
      return true
    }
    if (message.action === 'getTranscript' && message.tabId) {
      ;(async () => {
        try {
          const response = await browser.tabs.sendMessage(message.tabId, {
            action: 'fetchTranscript',
            lang: message.lang,
          })
          sendResponse(
            response && response.success
              ? { transcript: response.transcript }
              : { error: response?.error || 'Failed to get transcript.' }
          )
        } catch (err) {
          sendResponse({ success: false, error: err.message })
        }
      })()
      return true
    }
    if (message.action === 'REQUEST_SUMMARY') {
      ;(async () => {
        const { type, payload, requestId } = message
        try {
          if (type === 'selectedText') {
            await summarizeSelectedText(payload.text)
            const summary = get(summaryState.selectedTextSummary)
            sendResponse({ action: 'SUMMARY_RESPONSE', summary, requestId })
          } else {
            throw new Error(`Unsupported summary type: ${type}`)
          }
        } catch (error) {
          sendResponse({
            action: 'SUMMARY_ERROR',
            error: error.message,
            requestId,
          })
        }
      })()
      return true
    }

    // Sync handlers
    if (message.type === 'OPEN_ARCHIVE') {
      browser.tabs.create({
        url: browser.runtime.getURL('archive.html'),
        active: true,
      })
    } else if (message.type === 'OPEN_SETTINGS') {
      browser.tabs.create({
        url: browser.runtime.getURL('settings.html'),
        active: true,
      })
    } else if (message.type === 'UPDATE_OLLAMA_ENDPOINT') {
      ollamaCorsService.updateEndpoint(message.endpoint)
    } else if (message.action === 'courseContentFetched') {
      if (sidePanelPort)
        sidePanelPort.postMessage({
          action: 'courseContentAvailable',
          ...message,
        })
    } else if (message.action === 'requestCurrentTabInfo') {
      ;(async () => {
        try {
          const [activeTab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
          })
          if (!activeTab) return
          const YOUTUBE_REGEX = /youtube\.com\/watch/i
          const UDEMY_REGEX = /udemy\.com\/course\/.*\/learn\//i
          const COURSERA_REGEX = /coursera\.org\/learn\//i
          const info = {
            action: 'currentTabInfo',
            tabId: activeTab.id,
            tabUrl: activeTab.url,
            tabTitle: activeTab.title,
            isYouTube: YOUTUBE_REGEX.test(activeTab.url),
            isUdemy: UDEMY_REGEX.test(activeTab.url),
            isCoursera: COURSERA_REGEX.test(activeTab.url),
          }
          if (sidePanelPort) sidePanelPort.postMessage(info)
          else browser.runtime.sendMessage(info).catch(() => {})
        } catch (e) {}
      })()
    }
  })

  // --- Other Listeners ---
  browser.runtime.onConnect.addListener((port) => {
    if (port.name === 'side-panel') {
      sidePanelPort = port
      if (pendingSelectedText) {
        try {
          sidePanelPort.postMessage({
            action: 'summarizeSelectedText',
            selectedText: pendingSelectedText,
          })
          pendingSelectedText = null
        } catch (e) {
          pendingSelectedText = null
        }
      }
      port.onDisconnect.addListener(() => {
        sidePanelPort = null
      })
    }
  })

  browser.commands.onCommand.addListener(async (command) => {
    const [activeTab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })
    if (!activeTab) return

    if (command === 'summarize-current-page') {
      const YOUTUBE_REGEX = /youtube\.com\/watch/i
      const UDEMY_REGEX = /udemy\.com\/course\/.*\/learn\//i
      const COURSERA_REGEX = /coursera\.org\/learn\//i
      const summarizePageInfo = {
        action: 'summarizeCurrentPage',
        tabId: activeTab.id,
        tabUrl: activeTab.url,
        tabTitle: activeTab.title,
        isYouTube: YOUTUBE_REGEX.test(activeTab.url),
        isUdemy: UDEMY_REGEX.test(activeTab.url),
        isCoursera: COURSERA_REGEX.test(activeTab.url),
      }
      if (sidePanelPort) sidePanelPort.postMessage(summarizePageInfo)
      else browser.runtime.sendMessage(summarizePageInfo).catch(() => {})

      if (import.meta.env.BROWSER === 'chrome')
        await chrome.sidePanel.open({ windowId: activeTab.windowId })
      else await browser.sidebarAction.open()
    }
  })

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

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'summarizeSelectedText' && info.selectionText) {
      pendingSelectedText = info.selectionText
      if (sidePanelPort) {
        try {
          sidePanelPort.postMessage({
            action: 'summarizeSelectedText',
            selectedText: pendingSelectedText,
          })
          pendingSelectedText = null
        } catch (e) {
          /* Port might have just closed */
        }
      }

      if (pendingSelectedText) {
        // If message failed or port wasn't open
        if (tab?.windowId) {
          try {
            if (import.meta.env.BROWSER === 'chrome')
              await chrome.sidePanel.open({ windowId: tab.windowId })
            else await browser.sidebarAction.open()
          } catch (e) {
            pendingSelectedText = null
          }
        } else {
          pendingSelectedText = null
        }
      }
    }
  })

  // Tab change listeners
  const handleTabChange = async (tabId) => {
    try {
      const tab = await browser.tabs.get(tabId)
      if (!tab.url) return
      const YOUTUBE_REGEX = /youtube\.com\/watch/i
      const UDEMY_REGEX = /udemy\.com\/course\/.*\/learn\//i
      const COURSERA_REGEX = /coursera\.org\/learn\//i
      const info = {
        action: 'tabUpdated',
        tabId: tab.id,
        tabUrl: tab.url,
        tabTitle: tab.title,
        isYouTube: YOUTUBE_REGEX.test(tab.url),
        isUdemy: UDEMY_REGEX.test(tab.url),
        isCoursera: COURSERA_REGEX.test(tab.url),
      }
      if (sidePanelPort) sidePanelPort.postMessage(info)
      else browser.runtime.sendMessage(info).catch(() => {})
    } catch (e) {}
  }
  browser.tabs.onActivated.addListener((activeInfo) =>
    handleTabChange(activeInfo.tabId)
  )
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' || changeInfo.title) {
      handleTabChange(tabId)
    }
  })
})
