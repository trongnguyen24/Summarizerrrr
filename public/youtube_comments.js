// @ts-nocheck
/**
 * YouTube Comment Fetcher - MAIN World Script
 * Fetches YouTube comments and replies using YouTube's internal API
 * This script runs in MAIN world and has access to window.ytInitialData
 */

// ==================== HELPER CLASSES ====================

/**
 * ObjectScanner - Helper class to traverse nested objects
 */
class ObjectScanner {
  constructor(data) {
    this.is = data
  }

  isAny() {
    return this.is !== null && this.is !== undefined
  }

  get(path) {
    if (path && path.indexOf('.') >= 0) {
      return this.mscan(path).get()
    }
    if (
      this.is !== null &&
      typeof this.is === 'object' &&
      !Array.isArray(this.is) &&
      path
    ) {
      return this.is[path]
    }
    return this.is
  }

  mget(path) {
    return typeof path === 'number'
      ? new ObjectScanner(Array.isArray(this.is) ? this.is[path] : undefined)
      : this.mscan(path)
  }

  marray(path) {
    const val = this.get(path)
    return Array.isArray(val) ? val.map((v) => new ObjectScanner(v)) : []
  }

  mscan(path, filter) {
    const parts = path.split('.')

    const scan = (obj, idx) => {
      if (!obj || idx >= parts.length) {
        return obj && (!filter || filter(obj)) ? obj : undefined
      }

      if (parts[idx] === '**') {
        if (idx + 1 >= parts.length) return undefined
        return deepFind(obj, parts[idx + 1], (found) => scan(found, idx + 2))
      }

      const arrayMatch = parts[idx].match(/^(\w+)\[(\d+)\]$/)
      if (arrayMatch) {
        const key = arrayMatch[1]
        const arr = obj[key]
        const index = Number(arrayMatch[2])
        return scan(arr[index], idx + 1)
      }

      if (Array.isArray(obj) && obj.length > 0) {
        let result
        obj.some((item) => (result = scan(item, idx)))
        return result
      }

      return scan(obj[parts[idx]], idx + 1)
    }

    const deepFind = (obj, key, callback) => {
      if (!obj) return
      const val = obj[key]
      let result
      if (val && (result = callback(val))) return result
      if (typeof obj === 'object') {
        Object.values(obj).some((v) => (result = deepFind(v, key, callback)))
      }
      return result
    }

    return new ObjectScanner(scan(this.is, 0))
  }
}

// ==================== YOUTUBE API FUNCTIONS ====================

/**
 * Get YouTube configuration from page
 */
function getYouTubeConfig() {
  const win = new ObjectScanner(window)
  const ytcfg = win.mscan('ytcfg.data_')

  return {
    apiKey:
      ytcfg.get('INNERTUBE_API_KEY') ||
      ytcfg.get('WEB_PLAYER_CONTEXT_CONFIGS.**.innertubeApiKey') ||
      '',
    client: ytcfg.get('INNERTUBE_CONTEXT.client') || {},
    clientName: ytcfg.get('INNERTUBE_CONTEXT_CLIENT_NAME') || '1',
    clientVersion: ytcfg.get('INNERTUBE_CONTEXT_CLIENT_VERSION') || '',
    userLang:
      ytcfg.get('INNERTUBE_CONTEXT_HL') ||
      ytcfg.get('INNERTUBE_CONTEXT.client.hl') ||
      'en',
  }
}

/**
 * Get video ID from URL
 */
function getVideoId() {
  const url = window.location.href
  const match = url.match(/[./]youtube\.com\/watch\?v=([-\w]+)/)
  return match ? match[1] : ''
}

/**
 * Get initial continuation token (3-step process)
 */
async function getInitialContinuation(ytConfig) {
  const videoId = getVideoId()
  const url = `https://www.youtube.com/youtubei/v1/next?key=${ytConfig.apiKey}`

  const headers = {
    accept: '*/*',
    'content-type': 'application/json',
    'x-youtube-client-name': ytConfig.clientName,
    'x-youtube-client-version': ytConfig.clientVersion,
  }

  // Step 1: Fetch with videoId to get initial continuation
  console.log('[YouTubeComments] Step 1/3: Fetching with videoId...')
  const step1Response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      context: { client: ytConfig.client },
      videoId: videoId,
    }),
  })

  const step1Data = await step1Response.json()
  const step1Scanner = new ObjectScanner(step1Data)

  // Find continuation token from comment-item-section
  const commentItemSection = step1Scanner.mscan(
    '**.contents.twoColumnWatchNextResults.results.results.contents.itemSectionRenderer',
    (section) => {
      const identifier = section?.sectionIdentifier || ''
      return identifier.toLowerCase() === 'comment-item-section'
    }
  )

  const initialContinuation = commentItemSection?.get(
    'contents.continuationItemRenderer.continuationEndpoint.continuationCommand.token'
  )

  if (!initialContinuation) {
    console.error('[YouTubeComments] Step 1/3: No continuation found')
    return { continuation: null, clickTrackingParams: null }
  }

  // Step 2: Fetch with initial continuation to get sortMenu
  console.log('[YouTubeComments] Step 2/3: Fetching sortMenu...')
  const step2Response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      context: { client: ytConfig.client },
      continuation: initialContinuation,
    }),
  })

  const step2Data = await step2Response.json()
  const step2Scanner = new ObjectScanner(step2Data)

  // Get sortMenu (subMenuItems[0] = "Top comments")
  const sortMenu = step2Scanner.mget(
    '**.sortMenu.sortFilterSubMenuRenderer.subMenuItems[0]'
  )
  const clickTrackingParams = sortMenu?.get('**.clickTrackingParams')
  const continuation = sortMenu?.get(
    'serviceEndpoint.continuationCommand.token'
  )

  if (!continuation || !clickTrackingParams) {
    console.error('[YouTubeComments] Step 2/3: No sortMenu found')
    return { continuation: null, clickTrackingParams: null }
  }

  console.log('[YouTubeComments] Step 2/3: Found sortMenu continuation')
  return { continuation, clickTrackingParams }
}

/**
 * Fetch comments with continuation token
 */
async function fetchComments(ytConfig, continuation, clickTrackingParams) {
  const url = `https://www.youtube.com/youtubei/v1/next?key=${ytConfig.apiKey}`

  const headers = {
    accept: '*/*',
    'content-type': 'application/json',
    'x-youtube-client-name': ytConfig.clientName,
    'x-youtube-client-version': ytConfig.clientVersion,
  }

  const body = {
    context: {
      client: ytConfig.client,
      clickTracking: {
        clickTrackingParams: clickTrackingParams,
      },
    },
    continuation: continuation,
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body),
  })

  const data = await response.json()
  return new ObjectScanner(data)
}

/**
 * Fetch replies for a comment
 */
async function fetchReplies(ytConfig, continuation) {
  const url = `https://www.youtube.com/youtubei/v1/next?key=${ytConfig.apiKey}`

  const headers = {
    accept: '*/*',
    'content-type': 'application/json',
    'x-youtube-client-name': ytConfig.clientName,
    'x-youtube-client-version': ytConfig.clientVersion,
  }

  const body = {
    context: {
      client: ytConfig.client,
    },
    continuation: continuation,
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    console.error('[YouTubeComments] Failed to fetch replies:', response.status)
    return null
  }

  const data = await response.json()
  return new ObjectScanner(data)
}

// ==================== PARSING FUNCTIONS ====================

/**
 * Parse comment from commentRenderer (legacy format)
 */
function parseCommentLegacy(commentData, index) {
  const renderer = commentData.mscan('commentRenderer')

  // Get text content
  const contentRuns = renderer.marray('contentText.runs')
  const fullText = contentRuns.map((run) => run.get('text') || '').join('')

  // Get author info
  const author = {
    name: renderer.get('authorText.simpleText') || 'Unknown',
    channelId: renderer.get('authorEndpoint.browseEndpoint.browseId') || '',
    thumbnail: renderer.get('authorThumbnail.thumbnails.url') || '',
    isChannelOwner: !!renderer.get('authorIsChannelOwner'),
  }

  // Get metadata
  const commentId = renderer.get('commentId') || ''
  const publishedTime = renderer.get('publishedTimeText.runs.text') || ''
  const likeCount = renderer.get('voteCount.simpleText') || '0'
  const replyCount = Number(renderer.get('replyCount') || 0)

  return {
    index: index,
    commentId: commentId,
    author: author,
    text: fullText,
    publishedTime: publishedTime,
    likeCount: likeCount,
    replyCount: replyCount,
  }
}

/**
 * Parse comment from commentViewModel (new format)
 */
function parseCommentViewModel(commentData, index, commentDataMap) {
  const viewModel = commentData.mscan('commentViewModel')

  // Get commentId from viewModel
  const commentId = viewModel.get('commentId') || ''

  // Get payload data from frameworkUpdates
  const payload =
    commentDataMap && commentDataMap[commentId]
      ? new ObjectScanner(commentDataMap[commentId])
      : null

  // Get data from payload
  const content = payload?.get('properties.content.content') || ''

  const author = {
    name: payload?.get('author.displayName') || 'Unknown',
    channelId: payload?.get('author.channelId') || '',
    thumbnail: payload?.get('author.avatarThumbnailUrl') || '',
    isChannelOwner: !!payload?.get('author.isCreator'),
  }

  const publishedTime = payload?.get('properties.publishedTime') || ''
  const likeCount = payload?.get('toolbar.likeCountLiked') || '0'
  const replyCount = Number(payload?.get('toolbar.replyCount') || 0)

  return {
    index: index,
    commentId: commentId,
    author: author,
    text: content,
    publishedTime: publishedTime,
    likeCount: String(likeCount),
    replyCount: replyCount,
  }
}

/**
 * Parse comment - auto detect format
 */
function parseComment(commentData, index, commentDataMap) {
  // Try legacy format first
  const legacyRenderer = commentData.mscan('commentRenderer')
  if (legacyRenderer.isAny()) {
    return parseCommentLegacy(commentData, index)
  }

  // Otherwise use new format
  return parseCommentViewModel(commentData, index, commentDataMap)
}

/**
 * Parse replies from response data
 */
async function parseRepliesFromResponse(responseData, commentDataMap) {
  const replies = []

  // Parse frameworkUpdates mutations for reply data
  const mutations = responseData.marray(
    'frameworkUpdates.entityBatchUpdate.mutations'
  )
  mutations.forEach((mutation) => {
    const payload = mutation.mscan('payload.commentEntityPayload')
    if (payload.isAny()) {
      const commentId = payload.get('properties.commentId')
      if (commentId) {
        commentDataMap[commentId] = payload.is
      }
    }
  })

  // Get reply items from endpoints
  const endpoints = responseData.marray('onResponseReceivedEndpoints')

  for (let endpoint of endpoints) {
    // Try appendContinuationItemsAction first
    let replyItems = endpoint.marray(
      'appendContinuationItemsAction.continuationItems'
    )

    // If not found, try reloadContinuationItemsCommand
    if (replyItems.length === 0) {
      replyItems = endpoint.marray(
        'reloadContinuationItemsCommand.continuationItems'
      )
    }

    for (let item of replyItems) {
      const hasLegacy = item.mscan('commentRenderer').isAny()
      const hasNew = item.mscan('commentViewModel').isAny()

      if (hasLegacy || hasNew) {
        try {
          const reply = parseComment(item, replies.length + 1, commentDataMap)
          replies.push(reply)
        } catch (err) {
          console.error('[YouTubeComments] Error parsing reply:', err)
        }
      }
    }
  }

  return replies
}

/**
 * Parse a batch of comments from response data
 */
function parseCommentBatch(responseData, commentDataMap) {
  // Parse frameworkUpdates to get comment data
  const mutations = responseData.marray(
    'frameworkUpdates.entityBatchUpdate.mutations'
  )
  mutations.forEach((mutation) => {
    const payload = mutation.mscan('payload.commentEntityPayload')
    if (payload.isAny()) {
      const commentId = payload.get('properties.commentId')
      if (commentId) {
        commentDataMap[commentId] = payload.is
      }
    }
  })

  // Get comment items from endpoints
  const endpoints = responseData.marray('onResponseReceivedEndpoints')
  let commentItems = []

  // endpoint[1] for initial fetch, endpoint[0] for pagination
  for (let i = endpoints.length - 1; i >= 0; i--) {
    const endpoint = endpoints[i]

    // Try reloadContinuationItemsCommand (initial fetch)
    let items = endpoint.marray(
      'reloadContinuationItemsCommand.continuationItems'
    )

    // Try appendContinuationItemsAction (pagination)
    if (items.length === 0) {
      items = endpoint.marray('appendContinuationItemsAction.continuationItems')
    }

    if (items.length > 0) {
      // Filter out commentsHeaderRenderer
      commentItems = items.filter((item) => {
        const keys = Object.keys(item.is || {})
        return !keys.includes('commentsHeaderRenderer')
      })

      if (commentItems.length > 0) {
        break
      }
    }
  }

  return commentItems
}

/**
 * Extract continuation token from comment items
 */
function extractContinuationFromComments(commentItems) {
  for (let item of commentItems) {
    const contRenderer = item.mscan('continuationItemRenderer')
    if (contRenderer.isAny()) {
      const continuation = contRenderer.get(
        'continuationEndpoint.continuationCommand.token'
      )
      if (continuation) {
        return continuation
      }
    }
  }
  return null
}

/**
 * Fetch replies for a comment (with pagination support)
 */
async function fetchCommentReplies(
  ytConfig,
  commentThread,
  commentDataMap,
  maxReplies
) {
  // Find reply continuation token
  let replyContinuation = null

  // Try legacy format
  const repliesRenderer = commentThread.mscan('replies.commentRepliesRenderer')
  if (repliesRenderer.isAny()) {
    replyContinuation =
      repliesRenderer.get(
        'continuations.continuationEndpoint.continuationCommand.token'
      ) ||
      repliesRenderer.get(
        'contents.continuationItemRenderer.continuationEndpoint.continuationCommand.token'
      )
  }

  // Try new format
  if (!replyContinuation) {
    replyContinuation = commentThread.get('repliesContinuation.token')
  }

  if (!replyContinuation) {
    return []
  }

  const allReplies = []
  let pageCount = 0
  const maxPages = 10 // Max 10 pages to avoid infinite loop

  try {
    while (
      replyContinuation &&
      pageCount < maxPages &&
      allReplies.length < maxReplies
    ) {
      pageCount++

      const responseData = await fetchReplies(ytConfig, replyContinuation)
      if (!responseData) {
        break
      }

      const pageReplies = await parseRepliesFromResponse(
        responseData,
        commentDataMap
      )

      // Only add replies up to maxReplies limit
      const remainingSlots = maxReplies - allReplies.length
      const repliesToAdd = pageReplies.slice(0, remainingSlots)
      allReplies.push(...repliesToAdd)

      // If we've reached the limit, stop fetching
      if (allReplies.length >= maxReplies) {
        break
      }

      // Find continuation token for next page
      replyContinuation = null
      const endpoints = responseData.marray('onResponseReceivedEndpoints')

      for (let endpoint of endpoints) {
        const continuationItems = endpoint.marray(
          'appendContinuationItemsAction.continuationItems'
        )

        for (let item of continuationItems) {
          const contRenderer = item.mscan('continuationItemRenderer')
          if (contRenderer.isAny()) {
            replyContinuation = contRenderer.get(
              'continuationEndpoint.continuationCommand.token'
            )
            if (replyContinuation) {
              break
            }
          }
        }

        if (replyContinuation) break
      }

      // If no more continuation, stop
      if (!replyContinuation) {
        break
      }
    }

    return allReplies
  } catch (err) {
    console.error('[YouTubeComments] Error fetching replies:', err)
    return allReplies // Return what we've fetched so far
  }
}

// ==================== MAIN FETCH FUNCTION ====================

/**
 * Main function to fetch YouTube comments
 * @param {number} maxComments - Maximum number of comments to fetch (default: 50)
 * @param {number} maxRepliesPerComment - Maximum replies per comment (default: 10)
 * @returns {Promise<Object>} Result object with comments and metadata
 */
async function fetchYouTubeComments(
  maxComments = 80,
  maxRepliesPerComment = 10
) {
  console.log(`[YouTubeComments] Fetching ${maxComments} comments...`)

  try {
    // 1. Get YouTube config
    const ytConfig = getYouTubeConfig()
    if (!ytConfig.apiKey) {
      throw new Error('YouTube API key not found')
    }

    const videoId = getVideoId()
    if (!videoId) {
      throw new Error('Not on a YouTube watch page')
    }

    // 2. Get initial continuation token (3-step process)
    const { continuation, clickTrackingParams } = await getInitialContinuation(
      ytConfig
    )

    if (!continuation) {
      return {
        success: false,
        error: 'Comments are disabled or unavailable for this video',
        comments: [],
        metadata: {
          totalComments: 0,
          totalReplies: 0,
          videoId: videoId,
          fetchedAt: new Date().toISOString(),
        },
      }
    }

    // 3. Fetch comments with pagination
    const comments = []
    const commentDataMap = {}
    let currentContinuation = continuation
    let pageCount = 0
    const maxPages = 5 // Max 5 pages (20 comments/page = 100 comments)
    let totalReplies = 0

    while (
      currentContinuation &&
      comments.length < maxComments &&
      pageCount < maxPages
    ) {
      pageCount++

      console.log(`[YouTubeComments] Page ${pageCount}: Fetching...`)
      const responseData = await fetchComments(
        ytConfig,
        currentContinuation,
        clickTrackingParams
      )

      if (!responseData) {
        break
      }

      // Parse comment batch
      const commentItems = parseCommentBatch(responseData, commentDataMap)

      // Process each comment item
      for (let i = 0; i < commentItems.length; i++) {
        if (comments.length >= maxComments) {
          break
        }

        const item = commentItems[i]
        const itemKeys = Object.keys(item.is || {})

        // Skip continuationItemRenderer
        if (itemKeys.includes('continuationItemRenderer')) {
          continue
        }

        // Get commentThreadRenderer
        const commentThreadRenderer = item.mscan('commentThreadRenderer')
        if (!commentThreadRenderer.isAny()) {
          continue
        }

        // Try both formats: legacy and new
        let commentThread = commentThreadRenderer.mscan('comment')

        // If not found, try new format with commentViewModel
        if (!commentThread.isAny()) {
          commentThread = commentThreadRenderer.mscan('commentViewModel')
        }

        if (commentThread.isAny()) {
          try {
            const comment = parseComment(
              commentThread,
              comments.length + 1,
              commentDataMap
            )

            // Fetch replies if needed
            if (comment.replyCount > 0 && maxRepliesPerComment > 0) {
              const replies = await fetchCommentReplies(
                ytConfig,
                commentThreadRenderer,
                commentDataMap,
                maxRepliesPerComment
              )
              comment.replies = replies
              totalReplies += replies.length
            } else {
              comment.replies = []
            }

            comments.push(comment)
          } catch (err) {
            console.error('[YouTubeComments] Error parsing comment:', err)
          }
        }
      }

      // Extract continuation for next page
      currentContinuation = extractContinuationFromComments(commentItems)

      if (!currentContinuation || comments.length >= maxComments) {
        break
      }
    }

    console.log(
      `[YouTubeComments] Fetched ${comments.length} comments with ${totalReplies} replies`
    )

    return {
      success: true,
      comments: comments,
      metadata: {
        totalComments: comments.length,
        totalReplies: totalReplies,
        videoId: videoId,
        fetchedAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('[YouTubeComments] Error:', error)
    return {
      success: false,
      error: error.message,
      comments: [],
      metadata: {
        totalComments: 0,
        totalReplies: 0,
        videoId: getVideoId() || '',
        fetchedAt: new Date().toISOString(),
      },
    }
  }
}

// ==================== EXPOSE GLOBAL FUNCTION ====================

// Listen for requests from ISOLATED world via postMessage
window.addEventListener('message', async (event) => {
  // Only accept messages from same origin
  if (event.source !== window) return

  if (event.data.type === 'YOUTUBE_COMMENTS_REQUEST') {
    console.log(
      '[YouTubeComments] Received request from ISOLATED world:',
      event.data
    )

    try {
      const result = await fetchYouTubeComments(
        event.data.maxComments,
        event.data.maxRepliesPerComment
      )

      // Send response back to ISOLATED world
      window.postMessage(
        {
          type: 'YOUTUBE_COMMENTS_RESPONSE',
          requestId: event.data.requestId,
          result: result,
        },
        '*'
      )

      console.log('[YouTubeComments] Response sent to ISOLATED world')
    } catch (error) {
      console.error('[YouTubeComments] Error processing request:', error)

      // Send error response
      window.postMessage(
        {
          type: 'YOUTUBE_COMMENTS_RESPONSE',
          requestId: event.data.requestId,
          result: {
            success: false,
            error: error.message,
            comments: [],
            metadata: {
              totalComments: 0,
              totalReplies: 0,
              videoId: '',
              fetchedAt: new Date().toISOString(),
            },
          },
        },
        '*'
      )
    }
  }
})

console.log(
  '[YouTubeComments] MAIN world script loaded and listening for postMessage'
)
