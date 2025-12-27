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
} from '../stores/summaryStore.svelte.js'
import { get } from 'svelte/store'
import {
  addHistory,
  addSummary,
  updateHistoryArchivedStatus,
} from '@/lib/db/indexedDBService.js'
import { getAISDKModel, mapGenerationConfig } from '@/lib/api/aiSdkAdapter.js'
import { generateText } from 'ai'
import { aiConfig } from '../lib/config/aiConfig.js'
import { generateAISummaryPrompt, generateYouTubeAISummaryPrompt } from '../lib/prompts/templates/aiSummary.js'
import { initSync } from '../services/cloudSync/cloudSyncService.svelte.js'

// --- Helper Functions ---

/**
 * Checks if browser storage is ready and accessible
 * @returns {Promise<boolean>} True if storage is ready
 */
async function isStorageReady() {
  try {
    // Try to write and read a test value to verify storage is working
    const testKey = '__storage_readiness_test__'
    const testValue = Date.now().toString()
    await browser.storage.local.set({ [testKey]: testValue })
    const result = await browser.storage.local.get(testKey)
    await browser.storage.local.remove(testKey)
    return result[testKey] === testValue
  } catch (error) {
    console.warn('[Background] Storage readiness check failed:', error)
    return false
  }
}

/**
 * Load settings directly from browser.storage with multiple key patterns
 * @returns {Promise<Object|null>} Settings object or null if failed
 */
async function loadSettingsDirectly() {
  try {
    // Try multiple possible storage keys based on discovered patterns
    const possibleKeys = [
      'settings',
      'local:settings',
      'wxt:settings',
      'local_settings',
    ]

    for (const key of possibleKeys) {
      const result = await browser.storage.local.get(key)
      const storedSettings = result[key]

      if (
        storedSettings &&
        typeof storedSettings === 'object' &&
        Object.keys(storedSettings).length > 0
      ) {
        return storedSettings
      }
    }

    return null
  } catch (error) {
    console.error('[Background] Error loading settings directly:', error)
    return null
  }
}

/**
 * Initialize default settings if none exist
 * @returns {Promise<Object>} Default settings object
 */
async function initializeDefaultSettings() {
  const defaultSettings = {
    iconClickAction: 'floating', // Use floating as default for this fix
    selectedProvider: 'gemini',
    hasCompletedOnboarding: false,
    // Add other essential defaults as needed
  }

  try {
    // Try to save default settings to storage
    await browser.storage.local.set({ 'local:settings': defaultSettings })
    console.log(
      '[Background] Initialized default settings:',
      defaultSettings.iconClickAction
    )
    return defaultSettings
  } catch (error) {
    console.error('[Background] Failed to initialize default settings:', error)
    return defaultSettings // Return anyway, don't persist but use in memory
  }
}

/**
 * Enhanced settings loading with multiple fallback strategies
 * @returns {Promise<Object|null>} Settings object or null if failed
 */
async function loadSettingsWithReadiness() {
  try {
    // Strategy 1: Check if storage is ready and try WXT storage
    if (await isStorageReady()) {
      try {
        const settings = await loadSettings()
        if (
          settings &&
          typeof settings === 'object' &&
          settings.iconClickAction
        ) {
          return settings
        }
      } catch (error) {
        console.warn('[Background] WXT storage failed, trying direct access')
      }
    }

    // Strategy 2: Direct browser.storage access as backup
    const directSettings = await loadSettingsDirectly()
    if (directSettings && directSettings.iconClickAction) {
      return directSettings
    }

    // Strategy 3: Initialize default settings as last resort
    const defaultSettings = await initializeDefaultSettings()
    if (defaultSettings && defaultSettings.iconClickAction) {
      return defaultSettings
    }

    console.warn('[Background] All settings loading strategies failed')
    return null
  } catch (error) {
    console.error('[Background] Error in loadSettingsWithReadiness:', error)
    return null
  }
}

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

/**
 * Waits for chat provider tab to be fully loaded and content script ready
 * Handles Cloudflare checks, slow networks, and SPA delays
 * @param {number} tabId - Tab ID
 * @param {string} provider - Provider ID (grok, gemini, chatgpt, perplexity)
 * @param {number} maxWaitTime - Maximum wait time in ms
 * @returns {Promise<boolean>} True if ready
 */
async function waitForChatTabReady(tabId, provider, maxWaitTime = 10000) {
  const startTime = Date.now()
  const checkInterval = 500

  console.log(`[Background] Waiting for ${provider} tab to be ready...`)

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const tab = await browser.tabs.get(tabId)

      // Check if tab is complete and not on challenge/error pages
      const isNotBlocked =
        !tab.url.includes('challenges.cloudflare.com') &&
        !tab.url.includes('error') &&
        !tab.url.includes('blocked')

      if (tab.status === 'complete' && isNotBlocked) {
        // Try to ping content script
        try {
          await browser.tabs.sendMessage(tabId, { type: 'PING' })
          const elapsed = Date.now() - startTime
          console.log(`[Background] ${provider} tab ready after ${elapsed}ms`)
          return true
        } catch (pingError) {
          console.log(
            `[Background] ${provider} content script not ready, retrying...`
          )
        }
      }
    } catch (error) {
      console.warn(`[Background] Error checking ${provider} tab status:`, error)
    }

    await new Promise((resolve) => setTimeout(resolve, checkInterval))
  }

  console.warn(
    `[Background] ${provider} tab ready timeout after ${maxWaitTime}ms`
  )
  return false
}

/**
 * Sends message to chat provider tab with retry mechanism
 * @param {number} tabId - Tab ID
 * @param {Object} message - Message object
 * @param {string} provider - Provider ID (for logging)
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} retryDelay - Delay between retries in ms
 * @returns {Promise<boolean>} True if sent successfully
 */
async function sendChatMessageWithRetry(
  tabId,
  message,
  provider,
  maxRetries = 3,
  retryDelay = 1000
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await browser.tabs.sendMessage(tabId, message)
      console.log(
        `[Background] Message sent to ${provider} on attempt ${i + 1}`
      )
      return true
    } catch (error) {
      console.warn(
        `[Background] ${provider} message send attempt ${i + 1} failed:`,
        error.message
      )
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
      }
    }
  }
  return false
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

    async function registerDynamicContentScript() {
      try {
        const files = await getDynamicContentScriptFiles()
        if (!files) {
          console.warn(
            '[Background] Could not find main content script files for dynamic registration'
          )
          return
        }

        // Check if already registered
        const existing = await browser.scripting.getRegisteredContentScripts({
          ids: [DYNAMIC_SCRIPT_ID],
        })
        if (existing && existing.length > 0) {
          console.log('[Background] Dynamic content script already registered')
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

        await browser.scripting.registerContentScripts([
          {
            id: DYNAMIC_SCRIPT_ID,
            js: files.js,
            css: files.css,
            matches: ['<all_urls>'],
            excludeMatches: excludeMatches,
            runAt: 'document_end',
            persistAcrossSessions: true,
          },
        ])
        console.log(
          '[Background] Dynamic content script registered for <all_urls>'
        )
      } catch (error) {
        console.error(
          '[Background] Failed to register dynamic content script:',
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

    // Listen for permission changes
    browser.permissions.onAdded.addListener(async (permissions) => {
      if (
        permissions.origins &&
        permissions.origins.some((o) => o === '<all_urls>' || o === '*://*/*')
      ) {
        await registerDynamicContentScript()
      }
    })

    browser.permissions.onRemoved.addListener(async (permissions) => {
      if (
        permissions.origins &&
        permissions.origins.some((o) => o === '<all_urls>' || o === '*://*/*')
      ) {
        await unregisterDynamicContentScript()
      }
    })

    // Check on startup
    browser.permissions
      .contains({ origins: ['<all_urls>'] })
      .then((hasPermission) => {
        if (hasPermission) {
          registerDynamicContentScript()
        }
      })
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

  // Subscribe to settings changes - this function returns a watcher (Chrome only)
  if (import.meta.env.BROWSER === 'chrome') {
    const unsubscribe = subscribeToSettingsChanges()
    console.log(
      '[Background] Settings change watcher setup:',
      unsubscribe ? 'success' : 'failed'
    )
  }
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
  
  // ============================================
  // CLOUD SYNC AUTO-SYNC SETUP (Industry Standard)
  // Uses WXT browser.alarms API for cross-browser support
  // ============================================
  
  const AUTO_SYNC_ALARM_NAME = 'cloudAutoSync'
  const AUTO_SYNC_PERIOD_MINUTES = 3 // Sync every 3 minutes
  
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

      const { syncStorage } = await import('../services/cloudSync/cloudSyncService.svelte.js')
      const stored = await syncStorage.getValue()
      
      if (stored.isLoggedIn && stored.autoSyncEnabled) {
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
        // Clear alarm if not logged in or auto-sync disabled
        await browser.alarms.clear(AUTO_SYNC_ALARM_NAME)
        console.log('[Background] Auto-sync alarm cleared (disabled or not logged in)')
      }
    } catch (error) {
      console.error('[Background] Failed to setup auto-sync alarm:', error)
    }
  }
  
  // Watch for Cloud Sync settings changes (Cross-browser)
  // This ensures the alarm is cleared immediately when the user disables the tool
  settingsStorage.watch(async (newValue, oldValue) => {
    // Check if Cloud Sync enabled state changed
    const newEnabled = newValue?.tools?.cloudSync?.enabled
    const oldEnabled = oldValue?.tools?.cloudSync?.enabled
    
    if (newEnabled !== oldEnabled) {
      console.log(`[Background] Cloud Sync enabled state changed to: ${newEnabled}, updating alarm...`)
      await setupAutoSyncAlarm()
    }
  })
  
  // Setup alarm on extension install
  browser.runtime.onInstalled.addListener(async () => {
    console.log('[Background] Extension installed, checking auto-sync...')
    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for storage
    await setupAutoSyncAlarm()
  })
  
  // Setup alarm on browser startup
  browser.runtime.onStartup.addListener(async () => {
    console.log('[Background] Browser started, ensuring auto-sync alarm exists...')
    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for storage
    await setupAutoSyncAlarm()
  })
  
  // Listen for alarm trigger
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === AUTO_SYNC_ALARM_NAME) {
      const now = new Date().toLocaleString()
      console.log(`[Background] ⏰ AUTO-SYNC ALARM TRIGGERED at ${now}`)
      
      try {
        const { pullData, syncStorage } = await import('../services/cloudSync/cloudSyncService.svelte.js')
        
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
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Async handlers that need `return true`

    // Auto-sync alarm control messages from cloudSyncService
    if (message.type === 'SETUP_AUTO_SYNC_ALARM') {
      ;(async () => {
        try {
          await setupAutoSyncAlarm()
          sendResponse({ success: true })
        } catch (error) {
          console.error('[Background] Failed to setup auto-sync alarm:', error)
          sendResponse({ success: false, error: error.message })
        }
      })()
      return true
    }
    
    if (message.type === 'CLEAR_AUTO_SYNC_ALARM') {
      ;(async () => {
        try {
          await browser.alarms.clear(AUTO_SYNC_ALARM_NAME)
          console.log('[Background] Auto-sync alarm cleared by request')
          sendResponse({ success: true })
        } catch (error) {
          console.error('[Background] Failed to clear auto-sync alarm:', error)
          sendResponse({ success: false, error: error.message })
        }
      })()
      return true
    }

    // YouTube Comments Fetch - Forward to content script in same tab
    if (message.action === 'fetchYouTubeComments') {
      ;(async () => {
        try {
          console.log(
            '[Background] Forwarding fetchYouTubeComments to tab:',
            sender.tab?.id
          )

          if (!sender.tab?.id) {
            throw new Error('No tab ID available from sender')
          }

          // Forward message to content script in the same tab
          const response = await browser.tabs.sendMessage(sender.tab.id, {
            action: 'fetchYouTubeComments',
            videoId: message.videoId,
            maxComments: message.maxComments,
          })

          console.log(
            '[Background] Received comments response:',
            response?.success
          )
          sendResponse(response)
        } catch (error) {
          console.error(
            '[Background] Error forwarding fetchYouTubeComments:',
            error
          )
          sendResponse({
            success: false,
            error: error.message || 'Failed to fetch comments',
          })
        }
      })()
      return true
    }

    if (message.type === 'PERMISSION_CHANGED') {
      // Broadcast permission change to all tabs and sidepanel
      ;(async () => {
        try {
          console.log('[Background] Broadcasting permission change:', message)

          // Send to sidepanel if connected
          if (sidePanelPort) {
            sidePanelPort.postMessage({
              type: 'PERMISSION_CHANGED',
              permissionKey: message.permissionKey,
              value: message.value,
              timestamp: Date.now(),
            })
          }

          // Send to all tabs (for content scripts that might be listening)
          const tabs = await browser.tabs.query({})
          for (const tab of tabs) {
            try {
              await browser.tabs.sendMessage(tab.id, {
                type: 'PERMISSION_CHANGED',
                permissionKey: message.permissionKey,
                value: message.value,
                timestamp: Date.now(),
              })
            } catch (error) {
              // Ignore errors for tabs without content scripts
              // console.log(`Tab ${tab.id} không có content script`)
            }
          }

          sendResponse({ success: true, broadcasted: true })
        } catch (error) {
          console.error(
            '[Background] Error broadcasting permission change:',
            error
          )
          sendResponse({ success: false, error: error.message })
        }
      })()
      return true
    }
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
          // Validate payload
          if (!message.payload || !message.payload.historyData) {
            throw new Error('Invalid payload: missing historyData')
          }

          const result = await addHistory(message.payload.historyData)
          sendResponse({ success: true, id: String(result) })
        } catch (error) {
          const errorMessage =
            error?.message ||
            error?.toString() ||
            'Unknown error occurred while saving to history'
          console.error('[Background] SAVE_TO_HISTORY error:', error)
          sendResponse({ success: false, error: errorMessage })
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
    if (message.type === 'SUMMARIZE_ON_GEMINI') {
      handleAISummarization('gemini', message.transcript, sendResponse)
      return true
    }
    if (message.type === 'SUMMARIZE_ON_GEMINI_WITH_URL') {
      handleGeminiWithYouTubeURL(message.youtubeUrl, sendResponse)
      return true
    }
    if (message.type === 'SUMMARIZE_ON_CHATGPT') {
      handleAISummarization('chatgpt', message.transcript, sendResponse)
      return true
    }
    if (message.type === 'SUMMARIZE_ON_PERPLEXITY') {
      handleAISummarization('perplexity', message.transcript, sendResponse)
      return true
    }
    if (message.type === 'SUMMARIZE_ON_GROK') {
      handleAISummarization('grok', message.transcript, sendResponse)
      return true
    }

    // Deep Dive Tool message handler
    if (message.type === 'OPEN_DEEP_DIVE_CHAT') {
      ;(async () => {
        try {
          console.log('[Background] Opening Deep Dive chat:', message.provider)

          // Validate message
          if (!message.provider || !message.url || !message.prompt) {
            throw new Error('Invalid message: missing provider, url, or prompt')
          }

          // Create new tab with chat provider
          const tab = await browser.tabs.create({
            url: message.url,
            active: true,
          })

          console.log(
            `[Background] Created tab ${tab.id} for ${message.provider}`
          )

          // ✅ UNIFIED: Wait for tab to be fully ready (all providers)
          const isReady = await waitForChatTabReady(
            tab.id,
            message.provider,
            10000
          )

          if (!isReady) {
            throw new Error(
              `${message.provider} page failed to load. Please check your connection.`
            )
          }

          // ✅ UNIFIED: Send message with retry (all providers)
          const messageType = getProviderMessageType(message.provider)
          const sent = await sendChatMessageWithRetry(
            tab.id,
            {
              type: messageType,
              content: message.prompt,
            },
            message.provider,
            3,
            1000
          )

          if (sent) {
            console.log(
              `[Background] Sent prompt to ${message.provider} content script`
            )
            sendResponse({ success: true, tabId: tab.id })
          } else {
            throw new Error(
              `Failed to send message to ${message.provider} after retries`
            )
          }
        } catch (error) {
          console.error('[Background] Error opening Deep Dive chat:', error)
          sendResponse({ success: false, error: error.message })
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
      const url = message.tab
        ? browser.runtime.getURL(`settings.html?tab=${message.tab}`)
        : browser.runtime.getURL('settings.html')
      browser.tabs.create({
        url,
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
            // Browser-specific panel opening
            if (import.meta.env.BROWSER === 'chrome') {
              await chrome.sidePanel.open({ windowId: tab.windowId })
            } else {
              await browser.sidebarAction.open()
            }
          } catch (e) {
            pendingSelectedText = null
          }
        } else {
          pendingSelectedText = null
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

  // --- AI Service Helper Functions ---

  /**
   * Validates if the AI service is supported
   * @param {string} service - The AI service name
   * @returns {boolean} True if service is supported
   */
  function validateService(service) {
    return aiConfig[service] !== undefined
  }

  /**
   * Creates a new tab for the specified AI service
   * @param {string} service - The AI service name
   * @param {Object} config - The service configuration
   * @returns {Promise<Object>} The created tab object
   */
  async function createAITab(service, config) {
    console.log(`[Background] Creating ${service} tab`)
    const tab = await browser.tabs.create({
      url: config.url,
      active: true,
    })
    console.log(`[Background] ${service} tab created: ${tab.id}`)
    return tab
  }

  /**
   * Builds the prompt for AI summarization
   * @param {string} transcript - The transcript to summarize
   * @param {string} summaryLang - The language for summary
   * @returns {string} The formatted prompt
   */
  function buildPrompt(transcript, summaryLang) {
    return generateAISummaryPrompt(transcript, summaryLang)
  }

  /**
   * Sends content to a tab with retry mechanism
   * @param {number} tabId - The ID of the tab
   * @param {string} messageType - The message type to send
   * @param {string} content - The content to send
   * @param {number} retries - Current retry count
   * @param {number} maxRetries - Maximum retry attempts
   * @param {string} service - The AI service name (for logging)
   * @param {Function} sendResponse - The response callback function
   * @returns {Promise<void>}
   */
  async function sendContentToTab(
    tabId,
    messageType,
    content,
    retries,
    maxRetries,
    service,
    sendResponse
  ) {
    try {
      await browser.tabs.sendMessage(tabId, {
        type: messageType,
        content: content,
      })

      console.log(`[Background] Transcript sent to ${service} successfully`)
      sendResponse({ success: true, tabId: tabId })
    } catch (error) {
      if (retries < maxRetries) {
        retries++
        console.log(`[Background] ${service} retry ${retries}/${maxRetries}`)
        setTimeout(
          () =>
            sendContentToTab(
              tabId,
              messageType,
              content,
              retries,
              maxRetries,
              service,
              sendResponse
            ),
          1000
        )
      } else {
        console.error(
          `[Background] ${service} content script not ready after max retries`
        )
        sendResponse({
          success: false,
          error: `${service} content script not ready`,
        })
      }
    }
  }

  /**
   * Gets the appropriate message type for each chat provider
   * @param {string} provider - Provider ID
   * @returns {string} Message type for content script
   */
  function getProviderMessageType(provider) {
    const messageTypeMap = {
      gemini: 'FILL_GEMINI_FORM',
      chatgpt: 'FILL_CHATGPT_FORM',
      perplexity: 'FILL_PERPLEXITY_FORM',
      grok: 'FILL_GROK_FORM',
    }
    return messageTypeMap[provider] || 'FILL_GEMINI_FORM'
  }

  // --- AI Service Handler (Generalized) ---
  async function handleAISummarization(service, transcript, sendResponse) {
    try {
      console.log(`[Background] Processing ${service} summarization request`)

      // Validate service
      if (!validateService(service)) {
        throw new Error(`Unsupported AI service: ${service}`)
      }

      const config = aiConfig[service]

      // Load settings to get summary language
      const settings = await loadSettingsWithReadiness()
      const summaryLang = settings?.summaryLang || 'English'

      // Create AI service tab
      const tab = await createAITab(service, config)

      // Build prompt
      const prompt = buildPrompt(transcript, summaryLang)
      console.log(`[Background] ${service} prompt length:`, prompt.length)

      // Send content to tab with retry mechanism
      setTimeout(() => {
        sendContentToTab(
          tab.id,
          config.messageType,
          prompt,
          0,
          15,
          service,
          sendResponse
        )
      }, 2000)
    } catch (error) {
      console.error(`[Background] Error processing ${service} request:`, error)
      sendResponse({ success: false, error: error.message })
    }
  }

  // --- Gemini with YouTube URL Handler ---
  /**
   * Handle Gemini summarization using YouTube URL directly (when no transcript is available)
   * Gemini can process YouTube videos directly through the URL
   * @param {string} youtubeUrl - The YouTube video URL
   * @param {Function} sendResponse - The response callback function
   */
  async function handleGeminiWithYouTubeURL(youtubeUrl, sendResponse) {
    try {
      console.log('[Background] Processing Gemini with YouTube URL:', youtubeUrl)

      const config = aiConfig['gemini']
      if (!config) {
        throw new Error('Gemini configuration not found')
      }

      // Load settings to get summary language
      const settings = await loadSettingsWithReadiness()
      const summaryLang = settings?.summaryLang || 'English'

      // Create Gemini tab
      const tab = await createAITab('gemini', config)

      // Build prompt with YouTube URL
      const prompt = generateYouTubeAISummaryPrompt(youtubeUrl, summaryLang)
      console.log('[Background] Gemini YouTube URL prompt length:', prompt.length)

      // Send content to tab with retry mechanism
      setTimeout(() => {
        sendContentToTab(
          tab.id,
          config.messageType,
          prompt,
          0,
          15,
          'gemini',
          sendResponse
        )
      }, 2000)
    } catch (error) {
      console.error('[Background] Error processing Gemini with YouTube URL:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

})
