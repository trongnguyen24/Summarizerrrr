// @ts-nocheck
/**
 * Cloud-sync messages. The 10-second debounce lives here rather than in the
 * caller on purpose: the side panel or popup that asked for the sync is often
 * closed before the timer fires, and the background survives that.
 */
import { browser } from 'wxt/browser'
import { settingsStorage } from '@/services/wxtStorageService.js'

/**
 * @param {{setupAutoSyncAlarm: () => Promise<void>, autoSyncAlarmName: string}} deps
 *   Owned by `index.js` — the alarm name and the setup routine are also used by
 *   `onInstalled`/`onStartup`/`onAlarm`, which are not message handlers.
 */
export function createSyncHandlers({ setupAutoSyncAlarm, autoSyncAlarmName }) {
  return {
    // Auto-sync alarm control messages from cloudSyncService
    SETUP_AUTO_SYNC_ALARM: (message, sender, sendResponse) => {
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
    },

    CLEAR_AUTO_SYNC_ALARM: (message, sender, sendResponse) => {
      ;(async () => {
        try {
          await browser.alarms.clear(autoSyncAlarmName)
          console.log('[Background] Auto-sync alarm cleared by request')
          sendResponse({ success: true })
        } catch (error) {
          console.error('[Background] Failed to clear auto-sync alarm:', error)
          sendResponse({ success: false, error: error.message })
        }
      })()
      return true
    },

    // Handle TRIGGER_SYNC from sidepanel/popup - debounce in background to survive closure
    TRIGGER_SYNC: (message, sender, sendResponse) => {
      ;(async () => {
        try {
          const { syncStorage, pullData } = await import('@/services/cloudSync/cloudSyncService.svelte.js')
          const stored = await syncStorage.getValue()

          // Check settings first
          const currentSettings = await settingsStorage.getValue()
          const isCloudSyncEnabled = currentSettings?.tools?.cloudSync?.enabled ?? true

          if (!isCloudSyncEnabled) {
            console.log('[Background] TRIGGER_SYNC skipped: cloudSync tool is disabled')
            sendResponse({ success: false, reason: 'cloudSync_disabled' })
            return
          }

          if (!stored.isLoggedIn || !stored.autoSyncEnabled) {
            console.log('[Background] TRIGGER_SYNC skipped: not logged in or auto sync disabled')
            sendResponse({ success: false, reason: 'not_logged_in_or_auto_disabled' })
            return
          }

          if (stored.needsReauth) {
            console.log('[Background] TRIGGER_SYNC skipped: reconnect required')
            sendResponse({ success: false, reason: 'needs_reauth' })
            return
          }

          // Clear existing debounce timer and set a new one
          // Use globalThis instead of window (service worker doesn't have window)
          if (globalThis.syncDebounceTimer) {
            clearTimeout(globalThis.syncDebounceTimer)
          }

          const DEBOUNCE_DELAY = 10 * 1000 // 10 seconds
          console.log(`[Background] Scheduling sync in ${DEBOUNCE_DELAY / 1000}s...`)

          globalThis.syncDebounceTimer = setTimeout(async () => {
            try {
              console.log('[Background] Executing debounced sync...')
              await pullData()
              console.log('[Background] Debounced sync completed')
            } catch (syncError) {
              console.error('[Background] Debounced sync failed:', syncError)
            }
          }, DEBOUNCE_DELAY)

          sendResponse({ success: true, scheduled: true })
        } catch (error) {
          console.error('[Background] Failed to handle TRIGGER_SYNC:', error)
          sendResponse({ success: false, error: error.message })
        }
      })()
      return true
    },
  }
}
