// @ts-nocheck
import 'webextension-polyfill'
import { injectScript, executeFunction } from '../services/chromeService.js'

export default defineBackground(() => {
  let sidePanelPort = null
  let pendingSelectedText = null

  const YOUTUBE_MATCH_PATTERN = '*://*.youtube.com/watch*'
  const CONTENT_SCRIPT_PATH = 'content-scripts/youtubetranscript.js'

  // Hàm helper để inject content script
  async function injectContentScriptIntoTab(tabId) {
    if (import.meta.env.BROWSER === 'chrome') {
      if (!chrome.scripting) {
        console.error(
          'chrome.scripting API is not available. Check permissions or context.'
        )
        return
      }
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () =>
            typeof window.isYoutubeTranscriptContentScriptReady === 'boolean',
        })

        if (results[0]?.result === true) {
          return
        }

        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: [CONTENT_SCRIPT_PATH],
        })
      } catch (err) {
        console.warn(
          `Failed to inject or check content script in tab ${tabId}:`,
          err,
          err.stack
        )
        if (err.message?.includes('Cannot access contents of url')) {
          console.warn(
            `Cannot access tab ${tabId}, possibly a chrome:// or protected page.`
          )
        } else if (err.message?.includes('Cannot access chrome://')) {
          console.warn(`Skipping chrome:// tab ${tabId}.`)
        } else {
          console.warn(`An unexpected error occurred for tab ${tabId}:`, err)
        }
      }
    } else if (import.meta.env.BROWSER === 'firefox') {
      try {
        const injected = await injectScript(tabId, [CONTENT_SCRIPT_PATH])
        if (!injected) {
          console.warn(
            `[background.js] Failed to inject content script into tab ${tabId}.`
          )
        }
      } catch (err) {
        console.warn(
          `Failed to inject or check content script in tab ${tabId}:`,
          err,
          err.stack
        )
        if (err.message?.includes('Cannot access contents of url')) {
          console.warn(
            `Cannot access tab ${tabId}, possibly a browser:// or protected page.`
          )
        } else {
          console.warn(`An unexpected error occurred for tab ${tabId}:`, err)
        }
      }
    }
  }

  // Hàm helper để gửi tin nhắn đến side panel hoặc tab
  async function sendMessageToSidePanel(message, tabId = null) {
    const target = tabId ? browser.tabs : browser.runtime
    const logPrefix = `[background.js] ${
      import.meta.env.BROWSER === 'chrome' ? 'Chrome' : 'Firefox'
    }:`

    if (sidePanelPort) {
      try {
        console.log(
          `${logPrefix} Side panel connected. Sending message via port.`,
          message
        )
        sidePanelPort.postMessage(message)
      } catch (error) {
        console.error(`${logPrefix} Error sending message via port:`, error)
        // Fallback to sendMessage if port fails
        if (tabId) {
          target.sendMessage(tabId, message).catch((err) => {
            console.warn(
              `${logPrefix} Fallback sendMessage to tab failed:`,
              err
            )
          })
        } else {
          target.sendMessage(message).catch((err) => {
            console.warn(
              `${logPrefix} Fallback sendMessage to runtime failed:`,
              err
            )
          })
        }
      }
    } else {
      console.log(
        `${logPrefix} Side panel not connected. Sending message via sendMessage.`,
        message
      )
      if (tabId) {
        target.sendMessage(tabId, message).catch((error) => {
          if (
            error.message.includes('Could not establish connection') ||
            error.message.includes('Receiving end does not exist')
          ) {
            console.warn(
              `${logPrefix} Side panel not open or no listener for message.`
            )
          } else {
            console.error(
              `${logPrefix} Error sending message via sendMessage:`,
              error
            )
          }
        })
      } else {
        target.sendMessage(message).catch((error) => {
          if (
            error.message.includes('Could not establish connection') ||
            error.message.includes('Receiving end does not exist')
          ) {
            console.warn(
              `${logPrefix} Side panel not open or no listener for message.`
            )
          } else {
            console.error(
              `${logPrefix} Error sending message via sendMessage:`,
              error
            )
          }
        })
      }
    }
  }

  // Logic khởi tạo cho Chrome
  if (import.meta.env.BROWSER === 'chrome') {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error(error))
  } else if (import.meta.env.BROWSER === 'firefox') {
    // Firefox specific action for browserAction.onClicked
    browser.browserAction.onClicked.addListener(() => {
      browser.sidebarAction.toggle()
    })
  }

  // 1. Action Click (Toolbar Icon)
  ;(import.meta.env.BROWSER === 'chrome'
    ? chrome.action
    : browser.browserAction
  ).onClicked.addListener(async (tab) => {
    if (!tab.id || !tab.url) {
      console.warn('Action clicked on a tab without ID or URL.')
      return
    }

    const currentTabInfo = {
      action: 'currentTabInfo',
      tabId: tab.id,
      tabUrl: tab.url,
      tabTitle: tab.title,
      isYouTube: tab.url.includes('youtube.com/watch'),
    }

    await sendMessageToSidePanel(currentTabInfo, tab.id)

    if (currentTabInfo.isYouTube) {
      await injectContentScriptIntoTab(tab.id)
    }
  })

  // 2. Extension Install/Update
  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install' || details.reason === 'update') {
      // Tạo context menu
      try {
        if (browser.contextMenus) {
          browser.contextMenus.create({
            id: 'summarizeSelectedText',
            title: 'Summarize selected text',
            type: 'normal',
            contexts: ['selection'],
          })
        } else {
          console.warn('[background.js] browser.contextMenus is not available.')
        }
      } catch (error) {
        console.error('[background.js] Error creating context menu:', error)
      }

      try {
        const tabs = await browser.tabs.query({
          url: YOUTUBE_MATCH_PATTERN,
        })
        for (const tab of tabs) {
          if (tab.id && tab.status === 'complete') {
            await injectContentScriptIntoTab(tab.id)
          }
        }
      } catch (error) {
        console.error(
          `Error querying or injecting into existing tabs: ${error}`
        )
      }
    }
  })

  // 3. Listen for URL changes and tab updates
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    const isYouTube = tab.url.includes('youtube.com/watch')
    const tabUpdatedInfo = {
      action: 'tabUpdated',
      isYouTube: isYouTube,
      tabId: tab.id,
      tabUrl: tab.url,
      tabTitle: changeInfo.title || tab.title,
    }

    if (changeInfo.title || changeInfo.status === 'complete') {
      await sendMessageToSidePanel(tabUpdatedInfo)
    }

    if (changeInfo.status === 'complete' && isYouTube) {
      await injectContentScriptIntoTab(tabId)
    }
  })

  // 4. Listen for messages from other parts of the extension (e.g., side panel)
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getTranscript' && message.tabId) {
      const targetTabId = message.tabId

      ;(async () => {
        try {
          // Gửi message đến content script để yêu cầu transcript
          const response = await browser.tabs.sendMessage(targetTabId, {
            action: 'fetchTranscript',
            lang: message.lang, // Truyền ngôn ngữ nếu có
          })

          if (response && response.success) {
            sendResponse({ transcript: response.transcript })
          } else {
            console.warn(
              `[background.js] Content script failed to get transcript for tab ${targetTabId}:`,
              response?.error || 'Unknown error.'
            )
            sendResponse({
              error:
                response?.error ||
                'Failed to get transcript from content script.',
            })
          }
        } catch (err) {
          console.error(
            `[background.js] Error executing script for tab ${targetTabId}:`,
            err
          )
          sendResponse({
            error:
              err.message || 'Unknown error occurred during script execution.',
          })
        }
      })()
      return true
    } else if (message.action === 'requestCurrentTabInfo') {
      ;(async () => {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        })
        const activeTab = tabs[0]
        const currentTabInfo = activeTab
          ? {
              action: 'currentTabInfo',
              tabId: activeTab.id,
              tabUrl: activeTab.url,
              tabTitle: activeTab.title,
              isYouTube: activeTab.url.includes('youtube.com/watch'),
            }
          : {
              action: 'currentTabInfo',
              error: 'No active tab found.',
            }

        if (sidePanelPort) {
          try {
            sidePanelPort.postMessage(currentTabInfo)
            console.log('[background.js] Sent currentTabInfo via port.')
          } catch (error) {
            console.error(
              '[background.js] Error sending currentTabInfo via port:',
              error
            )
            // Fallback to sendMessage if port fails (though less ideal for connect-based messages)
            browser.runtime.sendMessage(currentTabInfo).catch((err) => {
              console.warn('[background.js] Fallback sendMessage failed:', err)
            })
          }
        } else {
          // If sidePanelPort is not available, send via runtime.sendMessage as a fallback
          // This might happen if the side panel connects and immediately requests info before onConnect fully processes
          browser.runtime.sendMessage(currentTabInfo).catch((error) => {
            if (
              error.message.includes('Could not establish connection') ||
              error.message.includes('Receiving end does not exist')
            ) {
              console.warn(
                '[background.js] Side panel not open or no listener for currentTabInfo message.'
              )
            } else {
              console.error(
                '[background.js] Error sending currentTabInfo message via sendMessage:',
                error
              )
            }
          })
        }
      })()
      return true
    }
  })

  // 5. Listen for connections from side panel
  browser.runtime.onConnect.addListener((port) => {
    if (port.name === 'side-panel') {
      sidePanelPort = port
      console.log(
        `[background.js] ${
          import.meta.env.BROWSER === 'chrome' ? 'Chrome' : 'Firefox'
        }: Side panel connected.`
      )

      // Gửi thông tin tab hiện tại ngay lập tức khi side panel kết nối
      ;(async () => {
        try {
          const tabs = await browser.tabs.query({
            active: true,
            currentWindow: true,
          })
          const activeTab = tabs[0]
          const currentTabInfo = activeTab
            ? {
                action: 'currentTabInfo',
                tabId: activeTab.id,
                tabUrl: activeTab.url,
                tabTitle: activeTab.title,
                isYouTube: activeTab.url.includes('youtube.com/watch'),
              }
            : {
                action: 'currentTabInfo',
                error: 'No active tab found.',
              }
          sidePanelPort.postMessage(currentTabInfo)
          console.log(
            '[background.js] Sent currentTabInfo via port on connect.'
          )
        } catch (error) {
          console.error(
            '[background.js] Error sending currentTabInfo on connect:',
            error
          )
        }
      })()

      if (pendingSelectedText) {
        try {
          console.log(
            `[background.js] ${
              import.meta.env.BROWSER === 'chrome' ? 'Chrome' : 'Firefox'
            }: Sending pending summarizeSelectedText message via port...`
          )
          sidePanelPort.postMessage({
            action: 'summarizeSelectedText',
            selectedText: pendingSelectedText,
          })
          console.log(
            `[background.js] ${
              import.meta.env.BROWSER === 'chrome' ? 'Chrome' : 'Firefox'
            }: Pending summarizeSelectedText message sent via port.`
          )
          pendingSelectedText = null
        } catch (error) {
          console.error(
            `[background.js] ${
              import.meta.env.BROWSER === 'chrome' ? 'Chrome' : 'Firefox'
            }: Error sending pending summarizeSelectedText message via port:`,
            error
          )
        }
      }

      sidePanelPort.onDisconnect.addListener(() => {
        console.log(
          `[background.js] ${
            import.meta.env.BROWSER === 'chrome' ? 'Chrome' : 'Firefox'
          }: Side panel disconnected.`
        )
        sidePanelPort = null
      })
    }
  })

  // 6. Listen for tab activation changes
  browser.tabs.onActivated.addListener(async (activeInfo) => {
    try {
      const tab = await browser.tabs.get(activeInfo.tabId)

      if (tab && tab.url) {
        const isYouTube = tab.url.includes('youtube.com/watch')
        const tabUpdatedInfo = {
          action: 'tabUpdated',
          isYouTube: isYouTube,
          tabId: tab.id,
          tabUrl: tab.url,
          tabTitle: tab.title,
        }
        await sendMessageToSidePanel(tabUpdatedInfo)
      }
    } catch (error) {
      console.error('[background.js] Error in onActivated listener:', error)
    }
  })

  // 7. Listen for context menu clicks
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'summarizeSelectedText' && info.selectionText) {
      console.log(
        `[background.js] ${
          import.meta.env.BROWSER === 'chrome' ? 'Chrome' : 'Firefox'
        }: Context menu item clicked:`,
        info.menuItemId
      )
      console.log(
        `[background.js] ${
          import.meta.env.BROWSER === 'chrome' ? 'Chrome' : 'Firefox'
        }: Selected text:`,
        info.selectionText
      )

      const selectedText = info.selectionText

      if (!selectedText) {
        console.warn(
          `[background.js] ${
            import.meta.env.BROWSER === 'chrome' ? 'Chrome' : 'Firefox'
          }: No text selected for summarization.`
        )
        return
      }

      if (sidePanelPort) {
        try {
          console.log(
            `[background.js] ${
              import.meta.env.BROWSER === 'chrome' ? 'Chrome' : 'Firefox'
            }: Side panel is already connected. Sending message directly.`
          )
          sidePanelPort.postMessage({
            action: 'summarizeSelectedText',
            selectedText: selectedText,
          })
          console.log(
            `[background.js] ${
              import.meta.env.BROWSER === 'chrome' ? 'Chrome' : 'Firefox'
            }: summarizeSelectedText message sent via port.`
          )
          pendingSelectedText = null
        } catch (error) {
          console.error(
            `[background.js] ${
              import.meta.env.BROWSER === 'chrome' ? 'Chrome' : 'Firefox'
            }: Error sending summarizeSelectedText message via existing port:`,
            error
          )
          pendingSelectedText = selectedText
          console.warn(
            `[background.js] ${
              import.meta.env.BROWSER === 'chrome' ? 'Chrome' : 'Firefox'
            }: Retrying by storing pendingSelectedText and opening side panel.`
          )
          if (tab && tab.windowId) {
            try {
              if (import.meta.env.BROWSER === 'chrome') {
                await chrome.sidePanel.open({ windowId: tab.windowId })
              } else {
                await browser.sidebarAction.open()
              }
            } catch (openError) {
              console.error(
                `Error opening side panel after port error for window ${tab.windowId}: ${openError}`
              )
              pendingSelectedText = null
            }
          }
        }
      } else {
        pendingSelectedText = selectedText
        console.log(
          `[background.js] ${
            import.meta.env.BROWSER === 'chrome' ? 'Chrome' : 'Firefox'
          }: Side panel not connected. Storing selected text and attempting to open side panel.`
        )
        if (tab && tab.windowId) {
          try {
            if (import.meta.env.BROWSER === 'chrome') {
              await chrome.sidePanel.open({ windowId: tab.windowId })
              console.log(
                '[background.js] Chrome: Side panel opened successfully.'
              )
            } else {
              await browser.sidebarAction.open()
              console.log(
                '[background.js] Firefox: Sidebar opened successfully.'
              )
            }
          } catch (error) {
            console.error(
              `Error opening side panel from context menu for window ${tab.windowId}: ${error}`
            )
            pendingSelectedText = null
          }
        } else {
          console.warn(
            `[background.js] ${
              import.meta.env.BROWSER === 'chrome' ? 'Chrome' : 'Firefox'
            }: No tab or window ID available to open side panel.`
          )
          pendingSelectedText = null
        }
      }
    }
  })
})
