// @ts-nocheck
/**
 * YouTube Comment Fetcher - Bridge Content Script (ISOLATED world)
 * Injects youtube_comments.js into MAIN world and handles message passing
 */

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  async main() {
    // Prevent multiple listener registrations
    if (window.youtubeCommentsBridgeListenerAdded) return
    window.youtubeCommentsBridgeListenerAdded = true

    console.log('[YouTubeCommentsBridge] Content script loaded')

    // Inject youtube_comments.js into MAIN world if not already loaded
    if (typeof window.fetchYouTubeComments === 'undefined') {
      const script = document.createElement('script')
      script.src = chrome.runtime.getURL('youtube_comments.js')
      script.onload = () => {
        console.log('[YouTubeCommentsBridge] Script injected successfully')
      }
      script.onerror = () => {
        console.error('[YouTubeCommentsBridge] Failed to inject script')
      }
      ;(document.head || document.documentElement).appendChild(script)
    }

    // Listen for responses from MAIN world
    const responseHandlers = new Map()

    window.addEventListener('message', (event) => {
      // Only accept messages from same origin
      if (event.source !== window) return

      if (event.data.type === 'YOUTUBE_COMMENTS_RESPONSE') {
        const handler = responseHandlers.get(event.data.requestId)
        if (handler) {
          handler(event.data.result)
          responseHandlers.delete(event.data.requestId)
        }
      }
    })

    // Setup message listener
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Only handle on watch page
      if (!location.href.includes('/watch')) {
        return false
      }

      if (message.action === 'fetchYouTubeComments') {
        const maxComments = message.maxComments || 80
        const maxRepliesPerComment = message.maxRepliesPerComment || 10

        // Generate unique request ID
        const requestId = `youtube-comments-${Date.now()}-${Math.random()}`

        // Store response handler
        responseHandlers.set(requestId, (result) => {
          sendResponse(result)
        })

        // Send request to MAIN world via postMessage
        window.postMessage(
          {
            type: 'YOUTUBE_COMMENTS_REQUEST',
            requestId: requestId,
            maxComments: maxComments,
            maxRepliesPerComment: maxRepliesPerComment,
          },
          '*'
        )

        // Set timeout for request (30 seconds)
        setTimeout(() => {
          if (responseHandlers.has(requestId)) {
            responseHandlers.delete(requestId)
            sendResponse({
              success: false,
              error:
                'Request timeout - YouTube comments script may not be loaded',
              comments: [],
              metadata: {
                totalComments: 0,
                totalReplies: 0,
                videoId: '',
                fetchedAt: new Date().toISOString(),
              },
            })
          }
        }, 30000)

        return true // Keep channel open for async response
      }

      return false
    })

    console.log('[YouTubeCommentsBridge] Ready')
  },
})
