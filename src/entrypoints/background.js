// @ts-nocheck
import 'webextension-polyfill'
import { browser } from 'wxt/browser'

const userAgent = navigator.userAgent
let isMobile = false
if (userAgent.includes('Android')) {
  isMobile = true
}

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

export default defineBackground(() => {
  let sidePanelPort = null
  let pendingSelectedText = null

  // Tải cài đặt và đăng ký lắng nghe thay đổi khi background script khởi động
  loadSettings()
  subscribeToSettingsChanges()

  // Function to create the context menu
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
      // It's possible this fails if the menu already exists, which is fine.
      console.log(
        'Context menu creation failed, it might already exist:',
        error
      )
    }
  }

  // Create the context menu on startup, specifically for Firefox persistence issue
  if (import.meta.env.BROWSER === 'firefox') {
    initializeContextMenu()
  }

  const YOUTUBE_URL_PATTERN_STRING = '*://*.youtube.com/watch*'
  const UDEMY_URL_PATTERN_STRING = '*://*.udemy.com/course/*/learn/*'
  const COURSERA_URL_PATTERN_STRING = '*://*.coursera.org/learn/*'

  const YOUTUBE_REGEX = /youtube\.com\/watch/i
  const UDEMY_REGEX = /udemy\.com\/course\/.*\/learn\//i
  const COURSERA_REGEX = /coursera\.org\/learn\//i

  const YOUTUBE_CONTENT_SCRIPT_PATH = 'content-scripts/youtubetranscript.js'

  const UDEMY_CONTENT_SCRIPT_PATH = 'content-scripts/udemy.js'

  const COURSERA_CONTENT_SCRIPT_PATH = 'content-scripts/coursera.js'

  // Hàm helper để inject content script
  async function injectContentScriptIntoTab(tabId, scriptPath) {
    if (import.meta.env.BROWSER === 'chrome') {
      if (!chrome.scripting) {
        return
      }
      try {
        // Kiểm tra xem script đã được inject chưa
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: (youtubeScriptPath, udemyScriptPath, courseraScriptPath) => {
            if (youtubeScriptPath === 'content-scripts/youtubetranscript.js') {
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
          return
        }

        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: [scriptPath],
        })
      } catch (err) {
        if (err.message?.includes('Cannot access contents of url')) {
        } else if (err.message?.includes('Cannot access chrome://')) {
        } else {
        }
      }
    } else if (import.meta.env.BROWSER === 'firefox') {
      try {
        const injected = await injectScript(tabId, [scriptPath])
        if (!injected) {
        }
      } catch (err) {
        if (err.message?.includes('Cannot access contents of url')) {
        } else {
        }
      }
    }
  }

  // Hàm helper để gửi tin nhắn đến side panel hoặc tab
  // Helper function to send messages, preferring the side panel port but falling back to runtime.sendMessage.
  // This is more robust against the service worker going inactive.
  async function sendMessageToSidePanel(message) {
    // First, try to send via the long-lived port if it exists.
    if (sidePanelPort) {
      try {
        sidePanelPort.postMessage(message)
        // If the message is sent successfully, we're done.
        return
      } catch (error) {
        sidePanelPort = null // Port is no longer valid.
      }
    }

    try {
      await browser.runtime.sendMessage(message)
    } catch (error) {
      // This error is expected if the side panel is not open.
      if (
        error.message.includes('Could not establish connection') ||
        error.message.includes('Receiving end does not exist')
      ) {
      } else {
      }
    }
  }

  if (import.meta.env.BROWSER === 'chrome') {
    if (!isMobile) {
      console.log('Hello Chrome.')
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    }

    //if mobile open popup

    if (isMobile) {
      console.log(userAgent + ' ___ ' + isMobile)
      chrome.action.onClicked.addListener(async (tab) => {
        browser.windows.create({
          url: browser.runtime.getURL('popup.html'),
          type: 'popup',
          width: 400,
          height: 600,
        })
      })
    }
  } else if (import.meta.env.BROWSER === 'firefox') {
    // background.js
    ;(async function init() {
      try {
        if (isMobile) {
          // Android: dùng popup
          await browser.browserAction.setPopup({ popup: 'popop.html' })
        } else {
          // Desktop: tắt popup => click icon sẽ gọi onClicked
          await browser.browserAction.setPopup({ popup: '' })
        }
      } catch (e) {
        console.warn('setPopup failed:', e)
      }
    })()
    // Desktop: click icon => mở sidebar
    browser.browserAction.onClicked.addListener(async () => {
      browser.sidebarAction.toggle()
    })
  }

  // 1. Action Click (Toolbar Icon)

  // 2. Listen for commands (keyboard shortcuts)
  browser.commands.onCommand.addListener(async (command) => {
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
  })

  // 3. Extension Install/Update
  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install' || details.reason === 'update') {
      // For Chrome, create the context menu on install/update.
      // For Firefox, this is handled on startup, but we can also do it here as a fallback.
      initializeContextMenu()

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
  })

  // 4. Listen for URL changes and tab updates
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
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
  })

  // 5. Listen for messages from other parts of the extension
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
  })

  // 6. Listen for connections from side panel
  browser.runtime.onConnect.addListener((port) => {
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
        } catch (error) {}
      })()

      if (pendingSelectedText) {
        try {
          sidePanelPort.postMessage({
            action: 'summarizeSelectedText',
            selectedText: pendingSelectedText,
          })
          pendingSelectedText = null
        } catch (error) {
          // Nếu gửi tin nhắn thất bại, không cần cố gắng mở lại side panel ở đây
          // vì logic mở side panel đã được xử lý khi pendingSelectedText được đặt.
          // Đặt lại pendingSelectedText để tránh lặp lại.
          pendingSelectedText = null
        }
      }

      sidePanelPort.onDisconnect.addListener(() => {
        sidePanelPort = null
      })
    }
  })

  // 7. Listen for tab activation changes
  browser.tabs.onActivated.addListener(async (activeInfo) => {
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
    } catch (error) {}
  })

  // 8. Listen for context menu clicks
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
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
  })
})
