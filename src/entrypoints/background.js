// @ts-nocheck
import 'webextension-polyfill'
import { browser } from 'wxt/browser'

// These functions were previously imported from browserService.js.
// WXT provides the global `browser` object directly, which is webextension-polyfill compatible.

export async function injectScript(tabId, files) {
  if (!browser.scripting) {
    return false
  }
  try {
    await browser.scripting.executeScript({
      target: { tabId: tabId },
      files: files,
    })
    return true
  } catch (error) {
    return false
  }
}

export async function executeFunction(tabId, func, args = []) {
  if (!browser.scripting) {
    return null
  }
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId: tabId },
      func: func,
      args: args,
    })
    return results?.[0]?.result ?? null
  } catch (error) {
    return null
  }
}
import {
  loadSettings,
  subscribeToSettingsChanges,
} from '../stores/settingsStore.svelte.js'
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

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_ARCHIVE') {
    const url = browser.runtime.getURL('archive.html')
    browser.tabs.create({ url, active: true })
    // This is a fire-and-forget message, no response needed.
    return false
  }
})

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle synchronous messages first
  if (message.type === 'OPEN_SETTINGS') {
    const url = browser.runtime.getURL('settings.html')
    browser.tabs.create({ url, active: true })
    // This is a fire-and-forget message, no response needed.
    return true
  }
  return true
})

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_TO_HISTORY') {
    ;(async () => {
      try {
        const result = await addHistory(message.payload.historyData)
        console.log('SAVE_TO_HISTORY result:', result)
        sendResponse({ success: true, id: String(result) })
      } catch (error) {
        console.error('Error in SAVE_TO_HISTORY:', error)
        sendResponse({ success: false, error: error.message })
      }
    })()
    return true // Indicate async response
  }
})

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
        console.log('SAVE_TO_ARCHIVE newArchiveId:', newArchiveId)
        sendResponse({ success: true, newArchiveId: String(newArchiveId) })
      } catch (error) {
        console.error('Error in SAVE_TO_ARCHIVE:', error)
        sendResponse({ success: false, error: error.message })
      }
    })()
    return true // Indicate async response
  }
})

export default defineBackground(() => {
  let sidePanelPort = null
  let pendingSelectedText = null

  // Detect if running on any mobile browser
  const isMobileBrowser =
    typeof navigator !== 'undefined' &&
    (navigator.userAgent.includes('Mobile') ||
      navigator.userAgent.includes('Android') ||
      navigator.userAgent.includes('iPhone') ||
      navigator.userAgent.includes('iPad'))

  // Detect specific mobile browsers
  const isFirefoxMobile =
    import.meta.env.BROWSER === 'firefox' && isMobileBrowser
  const isChromiumMobile =
    import.meta.env.BROWSER === 'chrome' && isMobileBrowser

  // ===== EVENT LISTENER REGISTRATIONS (MOVED TO TOP FOR FIREFOX MOBILE STABILITY) =====

  // 1. Runtime message listeners
  browser.runtime.onMessage.addListener(messageHandler)

  // 9. Add listener for startup context menu verification (Firefox specific)
  if (import.meta.env.BROWSER === 'firefox') {
    // Firefox may lose context menus on restart, so we verify and recreate if needed
    browser.runtime.onStartup &&
      browser.runtime.onStartup.addListener(() => {
        setupContextMenus().catch((error) => {
          console.warn('Firefox startup context menu setup failed:', error)
        })
      })
  }

  // 2. Tab event listeners
  browser.tabs.onUpdated.addListener(tabUpdateHandler)
  browser.tabs.onActivated.addListener(tabActivationHandler)

  // 3. Command listener
  browser.commands.onCommand.addListener(commandHandler)

  // 4. Context menu listener
  browser.contextMenus.onClicked.addListener(contextMenuHandler)

  // 5. Connection listener
  browser.runtime.onConnect.addListener(connectionHandler)

  // 6. Install/Update listener
  browser.runtime.onInstalled.addListener(installUpdateHandler)

  // 7. Firefox specific browser action listener - Removed to avoid conflict with main actionClickHandler

  // 8. Chrome/Firefox action click listener
  ;(import.meta.env.BROWSER === 'chrome'
    ? chrome.action
    : browser.browserAction
  ).onClicked.addListener(actionClickHandler)

  // Mobile browser specific handling
  if (isMobileBrowser) {
    // Handle service worker suspension on mobile (especially Firefox)
    if (browser.runtime.onSuspend) {
      browser.runtime.onSuspend.addListener(() => {
        // Save necessary state before suspension
        sidePanelPort = null
      })
    }
  }

  // ===== HELPER FUNCTIONS =====

  // Helper function để setup context menus
  async function setupContextMenus() {
    try {
      // Xóa context menu hiện có nếu có
      if (browser.contextMenus) {
        // Firefox requires removing all menus before creating new ones
        if (import.meta.env.BROWSER === 'firefox') {
          try {
            await browser.contextMenus.removeAll()
          } catch (error) {
            // Ignore errors if no menus exist
          }
        }

        // Tạo context menu item
        browser.contextMenus.create({
          id: 'summarizeSelectedText',
          title: 'Summarize selected text',
          type: 'normal',
          contexts: ['selection'],
        })
      }
    } catch (error) {
      console.warn('Failed to setup context menus:', error)
      // On Firefox mobile, retry after a delay
      if (isFirefoxMobile) {
        setTimeout(() => {
          setupContextMenus().catch((err) =>
            console.warn('Retry setupContextMenus failed:', err)
          )
        }, 3000)
      }
    }
  }

  // Helper function để kiểm tra sidepanel/sidebar support
  async function isSidePanelSupported() {
    // Mobile browsers generally don't support side panels/sidebars
    if (isMobileBrowser) {
      return false
    }

    try {
      if (import.meta.env.BROWSER === 'chrome') {
        // Chrome: Kiểm tra chrome.sidePanel API có tồn tại
        // Sidepanel được giới thiệu từ Chrome 114+
        return (
          typeof chrome.sidePanel !== 'undefined' &&
          typeof chrome.sidePanel.open === 'function'
        )
      } else if (import.meta.env.BROWSER === 'firefox') {
        // Firefox: Kiểm tra browser.sidebarAction API
        // Sidebar không có sẵn trên Firefox Mobile
        return (
          typeof browser.sidebarAction !== 'undefined' &&
          typeof browser.sidebarAction.open === 'function'
        )
      }
    } catch (error) {
      // Nếu có lỗi khi truy cập API, coi như không hỗ trợ
      return false
    }
    return false
  }

  // Tải cài đặt và đăng ký lắng nghe thay đổi khi background script khởi động
  loadSettings()
  subscribeToSettingsChanges()

  // Setup context menus khi background script khởi động
  setupContextMenus().catch((error) => {
    console.warn('Initial setupContextMenus failed:', error)
  })

  const YOUTUBE_URL_PATTERN_STRING = '*://*.youtube.com/watch*'
  const UDEMY_URL_PATTERN_STRING = '*://*.udemy.com/course/*/learn/*'
  const COURSERA_URL_PATTERN_STRING = '*://*.coursera.org/learn/*'

  const YOUTUBE_REGEX = /youtube\.com\/watch/i
  const UDEMY_REGEX = /udemy\.com\/course\/.*\/learn\//i
  const COURSERA_REGEX = /coursera\.org\/learn\//i

  const YOUTUBE_CONTENT_SCRIPT_PATH = 'content-scripts/youtubetranscript.js'

  const UDEMY_CONTENT_SCRIPT_PATH = 'content-scripts/udemy.js'

  const COURSERA_CONTENT_SCRIPT_PATH = 'content-scripts/coursera.js'

  // Enhanced inject content script with retry logic for mobile browser stability
  async function injectContentScriptIntoTab(tabId, scriptPath) {
    const maxRetries = isMobileBrowser ? 5 : 3
    const retryDelay = isMobileBrowser ? 1500 : 1000

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (import.meta.env.BROWSER === 'chrome') {
          if (!chrome.scripting) {
            return false
          }

          // Kiểm tra xem script đã được inject chưa
          const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (youtubeScriptPath, udemyScriptPath, courseraScriptPath) => {
              if (
                youtubeScriptPath === 'content-scripts/youtubetranscript.js'
              ) {
                return (
                  typeof window.isYoutubeTranscriptContentScriptReady ===
                  'boolean'
                )
              } else if (udemyScriptPath === 'content-scripts/udemy.js') {
                return typeof window.isUdemyContentScriptReady === 'boolean'
              } else if (courseraScriptPath === 'content-scripts/coursera.js') {
                return typeof window.isCourseraContentScriptReady === 'boolean'
              }
              return false
            },
            args: [
              YOUTUBE_CONTENT_SCRIPT_PATH,
              UDEMY_CONTENT_SCRIPT_PATH,
              COURSERA_CONTENT_SCRIPT_PATH,
            ],
          })

          if (results[0]?.result === true) {
            return true
          }

          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: [scriptPath],
          })
          return true
        } else if (import.meta.env.BROWSER === 'firefox') {
          const injected = await injectScript(tabId, [scriptPath])
          if (injected) {
            return true
          } else if (attempt < maxRetries - 1) {
            // Wait before retry on Firefox mobile
            await new Promise((resolve) => setTimeout(resolve, retryDelay))
            continue
          }
          return false
        }
      } catch (err) {
        if (
          err.message?.includes('Cannot access contents of url') ||
          err.message?.includes('Cannot access chrome://')
        ) {
          // These are expected errors, don't retry
          return false
        }

        if (attempt < maxRetries - 1) {
          // Wait before retry for other errors
          await new Promise((resolve) => setTimeout(resolve, retryDelay))
          continue
        }
        return false
      }
    }
    return false
  }

  // Enhanced message sending with better error handling and reconnection for Firefox mobile
  async function sendMessageToSidePanel(message) {
    // First, try to send via the long-lived port if it exists
    if (sidePanelPort) {
      try {
        sidePanelPort.postMessage(message)
        return true
      } catch (error) {
        // Port is no longer valid, clear it
        sidePanelPort = null
      }
    }

    // Fallback to runtime.sendMessage
    try {
      await browser.runtime.sendMessage(message)
      return true
    } catch (error) {
      // Handle expected connection errors silently
      if (
        error.message.includes('Could not establish connection') ||
        error.message.includes('Receiving end does not exist')
      ) {
        return false
      }
      // Log unexpected errors for debugging
      if (isMobileBrowser) {
        console.warn('Mobile browser - sendMessageToSidePanel error:', error)
      }
      return false
    }
  }

  // Reconnection helper for side panel with Firefox mobile specific handling
  async function attemptSidePanelReconnection() {
    if (sidePanelPort) return true // Already connected

    try {
      // Try to establish connection by sending a ping message
      await browser.runtime.sendMessage({ action: 'ping' })
      return true
    } catch (error) {
      // On mobile browsers, try again after a delay
      if (isMobileBrowser) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        try {
          await browser.runtime.sendMessage({ action: 'ping' })
          return true
        } catch (retryError) {
          return false
        }
      }
      return false
    }
  }

  // ===== EVENT HANDLER FUNCTIONS =====

  // Message handler function
  async function messageHandler(message, sender, sendResponse) {
    // Handle asynchronous actions
    ;(async () => {
      try {
        if (message.action === 'getTranscript' && message.tabId) {
          const targetTabId = message.tabId
          const response = await browser.tabs.sendMessage(targetTabId, {
            action: 'fetchTranscript',
            lang: message.lang,
          })
          if (response && response.success) {
            sendResponse({ transcript: response.transcript })
          } else {
            sendResponse({
              error: response?.error || 'Failed to get transcript.',
            })
          }
        } else if (message.action === 'courseContentFetched') {
          if (sidePanelPort) {
            sidePanelPort.postMessage({
              action: 'courseContentAvailable',
              content: message.content,
              lang: message.lang,
              courseType: message.courseType,
            })
          }
        } else if (message.action === 'requestCurrentTabInfo') {
          const tabs = await browser.tabs.query({
            active: true,
            currentWindow: true,
          })
          const activeTab = tabs[0]
          const isYouTube = YOUTUBE_REGEX.test(activeTab?.url)
          const isUdemy = UDEMY_REGEX.test(activeTab?.url)
          const isCoursera = COURSERA_REGEX.test(activeTab?.url)

          const currentTabInfo = activeTab
            ? {
                action: 'currentTabInfo',
                tabId: activeTab.id,
                tabUrl: activeTab.url,
                tabTitle: activeTab.title,
                isYouTube: isYouTube,
                isUdemy: isUdemy,
                isCoursera: isCoursera,
              }
            : { action: 'currentTabInfo', error: 'No active tab found.' }

          if (sidePanelPort) {
            sidePanelPort.postMessage(currentTabInfo)
          } else {
            browser.runtime.sendMessage(currentTabInfo).catch(() => {})
          }
        } else if (message.action === 'REQUEST_SUMMARY') {
          const { type, payload, requestId } = message
          // Set loading state
          if (type === 'selectedText') {
            summaryState.isSelectedTextLoading.set(true)
            summaryState.selectedTextError.set(null)
          } else {
            summaryState.isLoading.set(true)
            summaryState.summaryError.set(null)
          }
          try {
            if (type === 'selectedText') {
              const selectedText = payload.text
              if (!selectedText) {
                throw new Error('No text selected for summarization.')
              }
              await summarizeSelectedText(selectedText)
              const summary = get(summaryState.selectedTextSummary)
              sendResponse({
                action: 'SUMMARY_RESPONSE',
                summary: summary,
                requestId: requestId,
              })
            } else if (type === 'pageSummary') {
              if (sidePanelPort) {
                sidePanelPort.postMessage({ action: 'summarizeCurrentPage' })
                sendResponse({
                  action: 'SUMMARY_STARTED',
                  requestId: requestId,
                })
              } else {
                throw new Error(
                  'Side panel not open. Please open the side panel to summarize the page.'
                )
              }
            } else {
              throw new Error(`Unknown summarization type: ${type}`)
            }
          } catch (error) {
            if (type === 'selectedText') {
              summaryState.selectedTextError.set(error.message)
            } else {
              summaryState.summaryError.set(error.message)
            }
            sendResponse({
              action: 'SUMMARY_ERROR',
              error: error.message,
              requestId: requestId,
            })
          } finally {
            if (type === 'selectedText') {
              summaryState.isSelectedTextLoading.set(false)
            } else {
              summaryState.isLoading.set(false)
            }
            logAllGeneratedSummariesToHistory()
          }
        }
      } catch (err) {
        console.error(
          `Error processing message type ${message.type || message.action}:`,
          err
        )
        sendResponse({ success: false, error: err.message })
      }
    })()

    // Return true to indicate that sendResponse will be called asynchronously.
    return true
  }

  // Tab update handler function
  async function tabUpdateHandler(tabId, changeInfo, tab) {
    const isYouTube = YOUTUBE_REGEX.test(tab.url)
    const isUdemy = UDEMY_REGEX.test(tab.url)
    const isCoursera = COURSERA_REGEX.test(tab.url)

    const tabUpdatedInfo = {
      action: 'tabUpdated',
      isYouTube: isYouTube,
      isUdemy: isUdemy,
      isCoursera: isCoursera,
      tabId: tab.id,
      tabUrl: tab.url,
      tabTitle: changeInfo.title || tab.title,
    }

    if (changeInfo.title || changeInfo.status === 'complete') {
      await sendMessageToSidePanel(tabUpdatedInfo)
    }

    if (changeInfo.status === 'complete') {
      if (isYouTube) {
        await injectContentScriptIntoTab(tabId, YOUTUBE_CONTENT_SCRIPT_PATH)
      } else if (isUdemy) {
        await injectContentScriptIntoTab(tabId, UDEMY_CONTENT_SCRIPT_PATH)
      } else if (isCoursera) {
        await injectContentScriptIntoTab(tabId, COURSERA_CONTENT_SCRIPT_PATH)
      }
    }
  }

  // Tab activation handler function
  async function tabActivationHandler(activeInfo) {
    try {
      const tab = await browser.tabs.get(activeInfo.tabId)

      if (tab && tab.url) {
        const isYouTube = YOUTUBE_REGEX.test(tab.url)
        const isUdemy = UDEMY_REGEX.test(tab.url)
        const isCoursera = COURSERA_REGEX.test(tab.url)

        const tabUpdatedInfo = {
          action: 'tabUpdated',
          isYouTube: isYouTube,
          isUdemy: isUdemy,
          isCoursera: isCoursera,
          tabId: tab.id,
          tabUrl: tab.url,
          tabTitle: tab.title,
        }
        await sendMessageToSidePanel(tabUpdatedInfo)

        if (isYouTube) {
          await injectContentScriptIntoTab(tab.id, YOUTUBE_CONTENT_SCRIPT_PATH)
        } else if (isUdemy) {
          await injectContentScriptIntoTab(tab.id, UDEMY_CONTENT_SCRIPT_PATH)
        } else if (isCoursera) {
          await injectContentScriptIntoTab(tab.id, COURSERA_CONTENT_SCRIPT_PATH)
        }
      }
    } catch (error) {
      if (isFirefoxMobile) {
        console.warn('Firefox mobile - tabActivationHandler error:', error)
      }
    }
  }

  // Command handler function
  async function commandHandler(command) {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    const activeTab = tabs[0]

    if (!activeTab || !activeTab.id || !activeTab.url) {
      return
    }

    if (command === 'summarize-current-page') {
      const isYouTube = YOUTUBE_REGEX.test(activeTab.url)
      const isUdemy = UDEMY_REGEX.test(activeTab.url)
      const isCoursera = COURSERA_REGEX.test(activeTab.url)

      const summarizePageInfo = {
        action: 'summarizeCurrentPage',
        tabId: activeTab.id,
        tabUrl: activeTab.url,
        tabTitle: activeTab.title,
        isYouTube: isYouTube,
        isUdemy: isUdemy,
        isCoursera: isCoursera,
      }
      await sendMessageToSidePanel(summarizePageInfo)

      // Đảm bảo side panel mở để hiển thị kết quả tóm tắt
      if (import.meta.env.BROWSER === 'chrome') {
        try {
          await chrome.sidePanel.open({ windowId: activeTab.windowId })
        } catch (error) {}
      } else if (import.meta.env.BROWSER === 'firefox') {
        try {
          await browser.sidebarAction.open()
        } catch (error) {}
      }
    } else if (command === 'open-prompt-page') {
      if (import.meta.env.BROWSER === 'chrome') {
        try {
          await chrome.tabs.create({
            url: chrome.runtime.getURL('prompt.html'),
          })
        } catch (error) {}
      } else if (import.meta.env.BROWSER === 'firefox') {
        try {
          await browser.tabs.create({
            url: browser.runtime.getURL('prompt.html'),
          })
        } catch (error) {}
      }
    } else if (command === 'open-archive-panel') {
      if (import.meta.env.BROWSER === 'chrome') {
        try {
          await chrome.tabs.create({
            url: chrome.runtime.getURL('archive.html'),
          })
        } catch (error) {}
      } else if (import.meta.env.BROWSER === 'firefox') {
        try {
          await browser.tabs.create({
            url: browser.runtime.getURL('archive.html'),
          })
        } catch (error) {}
      }
    }
  }

  // Context menu handler function
  async function contextMenuHandler(info, tab) {
    if (info.menuItemId === 'summarizeSelectedText' && info.selectionText) {
      const selectedText = info.selectionText

      if (!selectedText) return

      if (sidePanelPort) {
        try {
          sidePanelPort.postMessage({
            action: 'summarizeSelectedText',
            selectedText: selectedText,
          })
          pendingSelectedText = null
        } catch (error) {
          pendingSelectedText = selectedText
          if (tab && tab.windowId) {
            try {
              if (import.meta.env.BROWSER === 'chrome') {
                await chrome.sidePanel.open({ windowId: tab.windowId })
              } else {
                await browser.sidebarAction.open()
              }
            } catch (openError) {
              pendingSelectedText = null
            }
          }
        }
      } else {
        pendingSelectedText = selectedText
        if (tab && tab.windowId) {
          try {
            if (import.meta.env.BROWSER === 'chrome') {
              await chrome.sidePanel.open({ windowId: tab.windowId })
            } else {
              await browser.sidebarAction.open()
            }
          } catch (error) {
            pendingSelectedText = null
          }
        } else {
          pendingSelectedText = null
        }
      }
    }
  }

  // Connection handler function with enhanced reconnection logic
  function connectionHandler(port) {
    if (port.name === 'side-panel') {
      sidePanelPort = port

      // Gửi thông tin tab hiện tại ngay lập tức khi side panel kết nối
      ;(async () => {
        try {
          const tabs = await browser.tabs.query({
            active: true,
            currentWindow: true,
          })
          const activeTab = tabs[0]
          const isYouTube = YOUTUBE_REGEX.test(activeTab?.url)
          const isUdemy = UDEMY_REGEX.test(activeTab?.url)
          const isCoursera = COURSERA_REGEX.test(activeTab?.url)

          const currentTabInfo = activeTab
            ? {
                action: 'currentTabInfo',
                tabId: activeTab.id,
                tabUrl: activeTab.url,
                tabTitle: activeTab.title,
                isYouTube: isYouTube,
                isUdemy: isUdemy,
                isCoursera: isCoursera,
              }
            : {
                action: 'currentTabInfo',
                error: 'No active tab found.',
              }
          sidePanelPort.postMessage(currentTabInfo)
        } catch (error) {
          if (isFirefoxMobile) {
            console.warn('Firefox mobile - connectionHandler error:', error)
          }
        }
      })()

      if (pendingSelectedText) {
        try {
          sidePanelPort.postMessage({
            action: 'summarizeSelectedText',
            selectedText: pendingSelectedText,
          })
          pendingSelectedText = null
        } catch (error) {
          // Đặt lại pendingSelectedText để tránh lặp lại
          pendingSelectedText = null
        }
      }

      // Enhanced disconnect handling with reconnection attempt
      sidePanelPort.onDisconnect.addListener(() => {
        sidePanelPort = null
        // On Firefox mobile, attempt reconnection after delay
        if (isFirefoxMobile) {
          setTimeout(async () => {
            try {
              await attemptSidePanelReconnection()
            } catch (error) {
              console.warn('Firefox mobile - reconnection failed:', error)
            }
          }, 2000)
        }
      })
    }
  }

  // Install/Update handler function
  async function installUpdateHandler(details) {
    if (details.reason === 'install' || details.reason === 'update') {
      // Setup context menu
      await setupContextMenus()

      try {
        const youtubeTabs = await browser.tabs.query({
          url: YOUTUBE_URL_PATTERN_STRING,
        })
        for (const tab of youtubeTabs) {
          if (tab.id && tab.status === 'complete') {
            await injectContentScriptIntoTab(
              tab.id,
              YOUTUBE_CONTENT_SCRIPT_PATH
            )
          }
        }

        const udemyTabs = await browser.tabs.query({
          url: UDEMY_URL_PATTERN_STRING,
        })
        for (const tab of udemyTabs) {
          if (tab.id && tab.status === 'complete') {
            await injectContentScriptIntoTab(tab.id, UDEMY_CONTENT_SCRIPT_PATH)
          }
        }

        const courseraTabs = await browser.tabs.query({
          url: COURSERA_URL_PATTERN_STRING,
        })
        for (const tab of courseraTabs) {
          if (tab.id && tab.status === 'complete') {
            await injectContentScriptIntoTab(
              tab.id,
              COURSERA_CONTENT_SCRIPT_PATH
            )
          }
        }
      } catch (error) {}
    }
  }

  // Firefox browser action handler
  function firefoxBrowserActionHandler() {
    browser.sidebarAction.toggle()
  }

  // Main action click handler
  async function actionClickHandler(tab) {
    if (!tab.id || !tab.url) return

    // Logic cho Edge Mobile
    if (navigator.userAgentData) {
      const brands = navigator.userAgentData.brands
      const isMobile = navigator.userAgentData.mobile
      const isEdge = brands.some((brand) => brand.brand === 'Microsoft Edge')

      if (isEdge && isMobile) {
        chrome.windows.create({
          url: 'popup.html',
          type: 'popup',
          width: 400,
          height: 600,
        })
        return // Dừng thực thi để không chạy logic khác
      }
    } else {
      // Fallback cho trình duyệt cũ
      const ua = navigator.userAgent
      if (ua.includes('Edg/') && ua.includes('Mobile')) {
        chrome.windows.create({
          url: 'popup.html',
          type: 'popup',
          width: 400,
          height: 600,
        })
        return // Dừng thực thi
      }
    }

    // Kiểm tra xem sidepanel/sidebar có được hỗ trợ không
    const sidePanelSupported = await isSidePanelSupported()

    if (!sidePanelSupported) {
      // Trên mobile Firefox, mở popup.html trong một cửa sổ popup
      if (isMobileBrowser && import.meta.env.BROWSER === 'firefox') {
        chrome.windows.create({
          url: 'popup.html',
          type: 'popup',
          width: 400,
          height: 600,
        })
        return
      }
      // Trên Chrome mobile, không làm gì để cho popup tự nhiên mở
      // Trên desktop không hỗ trợ sidepanel, mở settings trong tab mới
      if (!isMobileBrowser) {
        const url = browser.runtime.getURL('settings.html')
        await browser.tabs.create({ url, active: true })
      }
      return
    }

    // Logic hiện tại khi sidepanel được hỗ trợ
    const isYouTube = YOUTUBE_REGEX.test(tab.url)
    const isUdemy = UDEMY_REGEX.test(tab.url)
    const isCoursera = COURSERA_REGEX.test(tab.url)

    const currentTabInfo = {
      action: 'currentTabInfo',
      tabId: tab.id,
      tabUrl: tab.url,
      tabTitle: tab.title,
      isYouTube: isYouTube,
      isUdemy: isUdemy,
      isCoursera: isCoursera,
    }

    await sendMessageToSidePanel(currentTabInfo)

    if (isYouTube) {
      await injectContentScriptIntoTab(tab.id, YOUTUBE_CONTENT_SCRIPT_PATH)
    } else if (isUdemy) {
      await injectContentScriptIntoTab(tab.id, UDEMY_CONTENT_SCRIPT_PATH)
    } else if (isCoursera) {
      await injectContentScriptIntoTab(tab.id, COURSERA_CONTENT_SCRIPT_PATH)
    }
  }

  // ===== INITIALIZATION LOGIC =====

  // Logic khởi tạo cho Chrome
  if (import.meta.env.BROWSER === 'chrome') {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => {})
  }
})
