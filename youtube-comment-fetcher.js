/**
 * YouTube Comment Fetcher - Content Script
 * Lấy 50 comment đầu tiên từ video YouTube
 */

;(function () {
  'use strict'

  // Helper class để traverse object
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

  // Lấy YouTube Config từ trang
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

  // Lấy Video ID từ URL
  function getVideoId() {
    const url = window.location.href
    const match = url.match(/[./]youtube\.com\/watch\?v=([-\w]+)/)
    return match ? match[1] : ''
  }

  // Lấy thông tin video
  function getVideoInfo() {
    const videoId = getVideoId()
    const ytData = new ObjectScanner(window.ytInitialData)

    const contents = ytData.mscan(
      'contents.twoColumnWatchNextResults.results.results.contents'
    )
    const commentsSection = contents
      .mscan('itemSectionRenderer', (section) => {
        return (
          section?.sectionIdentifier?.toLowerCase() === 'comments-entry-point'
        )
      })
      .mscan('contents.commentsEntryPointHeaderRenderer')

    const commentCount = commentsSection?.get('commentCount.simpleText') || '0'

    return {
      videoId,
      commentCount,
    }
  }

  // Lấy continuation token ban đầu - THEO ĐÚNG EXTENSION GỐC (3 BƯỚC FETCH)
  async function getInitialContinuation(ytConfig) {
    const videoId = getVideoId()
    const url = `https://www.youtube.com/youtubei/v1/next?key=${ytConfig.apiKey}`

    const headers = {
      accept: '*/*',
      'content-type': 'application/json',
      'x-youtube-client-name': ytConfig.clientName,
      'x-youtube-client-version': ytConfig.clientVersion,
    }

    // ========== BƯỚC 1: Fetch với videoId để lấy initial continuation ==========
    console.log('  🔍 [Step 1/3] Fetching with videoId...')
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
    console.log('  ✅ [Step 1/3] Status:', step1Response.status)

    // Tìm continuation token từ comment-item-section
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
      console.error(
        '  ❌ [Step 1/3] Không tìm thấy continuation từ comment-item-section'
      )
      return { continuation: null, clickTrackingParams: null }
    }

    console.log(
      '  ✅ [Step 1/3] Initial continuation:',
      initialContinuation.substring(0, 50) + '...'
    )

    // ========== BƯỚC 2: Fetch với initial continuation để lấy sortMenu ==========
    console.log(
      '  🔍 [Step 2/3] Fetching with initial continuation to get sortMenu...'
    )
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
    console.log('  ✅ [Step 2/3] Status:', step2Response.status)

    // Lấy sortMenu và continuation token
    // subMenuItems[0] = "Top comments" (sắp xếp theo phổ biến - mặc định YouTube)
    // subMenuItems[1] = "Newest first" (sắp xếp theo thời gian)
    const sortMenu = step2Scanner.mget(
      '**.sortMenu.sortFilterSubMenuRenderer.subMenuItems[0]'
    )
    const clickTrackingParams = sortMenu?.get('**.clickTrackingParams')
    const continuation = sortMenu?.get(
      'serviceEndpoint.continuationCommand.token'
    )

    if (!continuation || !clickTrackingParams) {
      console.error('  ❌ [Step 2/3] Không tìm thấy sortMenu hoặc continuation')
      console.log('  🔍 Response keys:', Object.keys(step2Data))
      return { continuation: null, clickTrackingParams: null }
    }

    console.log('  ✅ [Step 2/3] Found sortMenu continuation!')
    console.log('  🔍 Final:', {
      continuation: continuation.substring(0, 50) + '...',
      hasClickTracking: !!clickTrackingParams,
    })

    return { continuation, clickTrackingParams }
  }

  // Fetch comments với continuation token
  async function fetchComments(ytConfig, continuation, clickTrackingParams) {
    const url = `https://www.youtube.com/youtubei/v1/next?key=${ytConfig.apiKey}`

    console.log('  🔍 Fetching comments from:', url)

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

    console.log('  🔍 Request body:', {
      hasContinuation: !!continuation,
      hasClickTracking: !!clickTrackingParams,
      clientName: ytConfig.clientName,
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    })

    console.log('  🔍 Response status:', response.status, response.statusText)

    const data = await response.json()
    console.log('  🔍 Response data keys:', Object.keys(data))

    return new ObjectScanner(data)
  }

  // Fetch replies cho một comment
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
      console.error('  ❌ Failed to fetch replies:', response.status)
      return null
    }

    const data = await response.json()
    return new ObjectScanner(data)
  }

  // Parse comment từ commentRenderer (format cũ)
  function parseCommentLegacy(commentData, index) {
    const renderer = commentData.mscan('commentRenderer')

    // Lấy text content
    const contentRuns = renderer.marray('contentText.runs')
    const fullText = contentRuns.map((run) => run.get('text') || '').join('')

    // Lấy author info
    const author = {
      name: renderer.get('authorText.simpleText') || 'Unknown',
      channelId: renderer.get('authorEndpoint.browseEndpoint.browseId') || '',
      thumbnail: renderer.get('authorThumbnail.thumbnails.url') || '',
      isChannelOwner: !!renderer.get('authorIsChannelOwner'),
    }

    // Lấy metadata
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

  // Parse comment từ commentViewModel (format mới) với data từ frameworkUpdates
  function parseCommentViewModel(commentData, index, commentDataMap) {
    const viewModel = commentData.mscan('commentViewModel')

    // Lấy commentId từ viewModel
    const commentId = viewModel.get('commentId') || ''

    // Lấy payload data từ frameworkUpdates
    const payload =
      commentDataMap && commentDataMap[commentId]
        ? new ObjectScanner(commentDataMap[commentId])
        : null

    // Debug: Log structure lần đầu
    if (index === 1) {
      console.log(
        '  🔍 [DEBUG] commentViewModel keys:',
        Object.keys(viewModel.is || {})
      )
      if (payload) {
        console.log('  🔍 [DEBUG] payload structure:', payload.is)
      }
    }

    // Lấy data từ payload (frameworkUpdates) - ưu tiên cao nhất
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

  // Parse comment - auto detect format
  function parseComment(commentData, index, commentDataMap) {
    // Thử format cũ trước
    const legacyRenderer = commentData.mscan('commentRenderer')
    if (legacyRenderer.isAny()) {
      return parseCommentLegacy(commentData, index)
    }

    // Nếu không có, dùng format mới với data từ frameworkUpdates
    return parseCommentViewModel(commentData, index, commentDataMap)
  }

  // Parse replies từ response data
  async function parseRepliesFromResponse(responseData, commentDataMap) {
    const replies = []

    // Parse frameworkUpdates mutations cho reply data
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

    // Lấy reply items từ endpoints
    const endpoints = responseData.marray('onResponseReceivedEndpoints')

    for (let endpoint of endpoints) {
      // Thử appendContinuationItemsAction trước (thường dùng cho replies)
      let replyItems = endpoint.marray(
        'appendContinuationItemsAction.continuationItems'
      )

      // Nếu không có, thử reloadContinuationItemsCommand
      if (replyItems.length === 0) {
        replyItems = endpoint.marray(
          'reloadContinuationItemsCommand.continuationItems'
        )
      }

      for (let item of replyItems) {
        // Kiểm tra format legacy hoặc mới
        const hasLegacy = item.mscan('commentRenderer').isAny()
        const hasNew = item.mscan('commentViewModel').isAny()

        if (hasLegacy || hasNew) {
          try {
            // Pass toàn bộ item vào parseComment, không phải chỉ commentRenderer/commentViewModel
            const reply = parseComment(item, replies.length + 1, commentDataMap)
            replies.push(reply)
          } catch (err) {
            console.error('  ❌ Error parsing reply:', err)
          }
        }
      }
    }

    return replies
  }

  // Parse một batch comments từ response data (helper function cho pagination)
  function parseCommentBatch(responseData, commentDataMap) {
    // Parse frameworkUpdates để lấy comment data
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

    // Lấy comment items từ endpoints
    const endpoints = responseData.marray('onResponseReceivedEndpoints')
    let commentItems = []

    // THEO EXTENSION GỐC: endpoint[1] cho initial fetch, endpoint[0] cho pagination
    for (let i = endpoints.length - 1; i >= 0; i--) {
      const endpoint = endpoints[i]

      // Thử reloadContinuationItemsCommand (initial fetch)
      let items = endpoint.marray(
        'reloadContinuationItemsCommand.continuationItems'
      )

      // Thử appendContinuationItemsAction (pagination)
      if (items.length === 0) {
        items = endpoint.marray(
          'appendContinuationItemsAction.continuationItems'
        )
      }

      if (items.length > 0) {
        // Lọc bỏ commentsHeaderRenderer (chỉ có trong initial fetch)
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

  // Extract continuation token từ comment items
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

  // Fetch replies cho một comment (với pagination support)
  async function fetchCommentReplies(ytConfig, commentThread, commentDataMap) {
    // Tìm reply continuation token
    let replyContinuation = null

    // Thử format cũ: commentThreadRenderer.replies.commentRepliesRenderer.continuations
    const repliesRenderer = commentThread.mscan(
      'replies.commentRepliesRenderer'
    )
    if (repliesRenderer.isAny()) {
      replyContinuation =
        repliesRenderer.get(
          'continuations.continuationEndpoint.continuationCommand.token'
        ) ||
        repliesRenderer.get(
          'contents.continuationItemRenderer.continuationEndpoint.continuationCommand.token'
        )
    }

    // Thử format mới: tìm trong viewModel
    if (!replyContinuation) {
      replyContinuation = commentThread.get('repliesContinuation.token')
    }

    if (!replyContinuation) {
      return []
    }

    console.log('  🔍 Fetching replies with continuation...')

    const allReplies = []
    let pageCount = 0
    const maxPages = 10 // Giới hạn tối đa 10 pages để tránh infinite loop

    try {
      while (replyContinuation && pageCount < maxPages) {
        pageCount++

        const responseData = await fetchReplies(ytConfig, replyContinuation)
        if (!responseData) {
          break
        }

        const pageReplies = await parseRepliesFromResponse(
          responseData,
          commentDataMap
        )
        allReplies.push(...pageReplies)

        if (pageCount > 1) {
          console.log(
            `  📄 Page ${pageCount}: Fetched ${pageReplies.length} more replies (total: ${allReplies.length})`
          )
        }

        // Tìm continuation token cho page tiếp theo
        replyContinuation = null
        const endpoints = responseData.marray('onResponseReceivedEndpoints')

        for (let endpoint of endpoints) {
          // Tìm continuation trong appendContinuationItemsAction
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
                console.log(`  🔄 Found continuation for page ${pageCount + 1}`)
                break
              }
            }
          }

          if (replyContinuation) break
        }

        // Nếu không còn continuation, dừng lại
        if (!replyContinuation) {
          break
        }
      }

      console.log(
        `  ✅ Fetched ${allReplies.length} replies (${pageCount} page${
          pageCount > 1 ? 's' : ''
        })`
      )
      return allReplies
    } catch (err) {
      console.error('  ❌ Error fetching replies:', err)
      return allReplies // Trả về những gì đã fetch được
    }
  }

  // Main function - Lấy 50 comments with optional replies
  async function fetch50Comments(fetchRepliesOption = false) {
    console.log('🚀 Bắt đầu lấy 50 comment YouTube...')
    console.log('='.repeat(60))
    console.log(`📝 Fetch replies: ${fetchRepliesOption ? 'YES' : 'NO'}`)

    try {
      // 1. Lấy config
      console.log('\n📌 BƯỚC 1: Lấy YouTube Config...')
      const ytConfig = getYouTubeConfig()
      console.log('✅ Đã lấy YouTube config:', {
        hasApiKey: !!ytConfig.apiKey,
        apiKey: ytConfig.apiKey
          ? ytConfig.apiKey.substring(0, 20) + '...'
          : 'N/A',
        clientName: ytConfig.clientName,
        clientVersion: ytConfig.clientVersion,
        userLang: ytConfig.userLang,
      })

      // 2. Lấy video info
      console.log('\n📌 BƯỚC 2: Lấy Video Info...')
      const videoInfo = getVideoInfo()
      console.log('✅ Video Info:', videoInfo)

      // 3. Lấy continuation token (Fetch 2 lần: videoId -> initial cont -> sortMenu)
      console.log('\n📌 BƯỚC 3: Lấy Continuation Token (2 API calls)...')
      const { continuation, clickTrackingParams } =
        await getInitialContinuation(ytConfig)

      console.log('\n✅ Hoàn thành bước lấy continuation:', {
        hasContinuation: !!continuation,
        hasClickTracking: !!clickTrackingParams,
      })

      // Check nếu không có continuation token
      if (!continuation) {
        console.error('\n❌ KHÔNG THỂ LẤY COMMENT:')
        console.warn('  Nguyên nhân có thể:')
        console.warn('  1. Video này không có comment')
        console.warn('  2. Comment section bị tắt')
        console.warn('  3. Video là Premiere/Live stream chưa có comment')
        console.warn('\n💡 Giải pháp:')
        console.warn('  - Thử video khác có nhiều comment')
        console.warn('  - Scroll xuống comment section và đợi load xong')
        return []
      }

      // 4. Fetch comments với pagination (Bước 4/4)
      console.log('\n📌 BƯỚC 4: Fetch Comments từ API (với pagination)...')

      const comments = []
      const commentDataMap = {}
      let currentContinuation = continuation
      let pageCount = 0
      const maxPages = 5 // Tối đa 5 pages (20 comments/page = 100 comments)

      while (
        currentContinuation &&
        comments.length < 50 &&
        pageCount < maxPages
      ) {
        pageCount++

        console.log(`\n📄 Page ${pageCount}: Fetching comments...`)
        const responseData = await fetchComments(
          ytConfig,
          currentContinuation,
          clickTrackingParams
        )

        if (!responseData) {
          console.error('  ❌ Failed to fetch response')
          break
        }

        // Parse comment batch
        const commentItems = parseCommentBatch(responseData, commentDataMap)
        console.log(`  ✅ Found ${commentItems.length} items in this batch`)

        // Process each comment item
        for (let i = 0; i < commentItems.length; i++) {
          if (comments.length >= 50) {
            console.log('  ⏹️ Reached 50 comments limit, stopping...')
            break
          }

          const item = commentItems[i]
          const itemKeys = Object.keys(item.is || {})

          // Skip continuationItemRenderer (sẽ xử lý sau)
          if (itemKeys.includes('continuationItemRenderer')) {
            continue
          }

          // Lưu lại commentThreadRenderer để lấy replies sau
          const commentThreadRenderer = item.mscan('commentThreadRenderer')
          if (!commentThreadRenderer.isAny()) {
            continue
          }

          // Thử cả 2 format: legacy và mới
          let commentThread = commentThreadRenderer.mscan('comment')

          // Nếu không có, thử format mới với commentViewModel
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

              // Fetch replies nếu cần
              if (fetchRepliesOption && comment.replyCount > 0) {
                const replies = await fetchCommentReplies(
                  ytConfig,
                  commentThreadRenderer,
                  commentDataMap
                )
                comment.replies = replies
              } else {
                comment.replies = []
              }

              comments.push(comment)

              // Log mỗi 10 comments
              if (comments.length % 10 === 0 || comments.length <= 5) {
                console.log(
                  `  ✅ Comment #${comments.length}: ${
                    comment.author.name
                  } - "${comment.text.substring(0, 40)}..."`
                )
              }
            } catch (err) {
              console.error(`  ❌ Error parsing comment:`, err)
            }
          }
        }

        // Extract continuation cho page tiếp theo
        currentContinuation = extractContinuationFromComments(commentItems)

        if (currentContinuation && comments.length < 50) {
          console.log(
            `  🔄 Found continuation, will fetch page ${pageCount + 1}...`
          )
        } else if (!currentContinuation) {
          console.log('  ⏹️ No more continuation, reached end of comments')
          break
        }
      }

      console.log(`\n📊 Pagination Summary:`)
      console.log(`  • Total pages fetched: ${pageCount}`)
      console.log(`  • Total comments: ${comments.length}`)
      console.log(
        `  • Comments with replies: ${
          comments.filter((c) => c.replyCount > 0).length
        }`
      )

      console.log(
        `\n✅ Đã lấy được ${comments.length} comments (${pageCount} page${
          pageCount > 1 ? 's' : ''
        })`
      )

      if (comments.length === 0) {
        console.warn('⚠️ Không tìm thấy comment nào. Có thể:')
        console.warn('  - Video này tắt comment')
        console.warn('  - Chưa có comment nào')
        console.warn('  - YouTube đã thay đổi cấu trúc API')
        console.log('🔍 Kiểm tra console logs phía trên để debug')
        return []
      }

      console.log('📝 Danh sách comments:', comments)

      // Export ra file JSON (optional)
      const jsonData = JSON.stringify(comments, null, 2)
      console.log('📄 JSON Data:')
      console.log(jsonData)

      // Tạo download link
      downloadJSON(comments, `youtube_comments_${videoInfo.videoId}.json`)

      return comments
    } catch (error) {
      console.error('❌ Lỗi khi lấy comments:', error)
      throw error
    }
  }

  // Download JSON file
  function downloadJSON(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log(`💾 Đã tải xuống file: ${filename}`)
  }

  // Convenience function để fetch comments với replies
  async function fetch50CommentsWithReplies() {
    return await fetch50Comments(true)
  }

  // Expose functions globally để có thể gọi từ console
  window.fetch50Comments = fetch50Comments
  window.fetch50CommentsWithReplies = fetch50CommentsWithReplies

  // Tự động chạy khi trang load xong
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('📺 YouTube Comment Fetcher đã sẵn sàng!')
      console.log('💡 Gọi window.fetch50Comments() để lấy 50 comments')
      console.log(
        '💡 Gọi window.fetch50CommentsWithReplies() để lấy comments KÈM THEO replies'
      )
    })
  } else {
    console.log('📺 YouTube Comment Fetcher đã sẵn sàng!')
    console.log('💡 Gọi window.fetch50Comments() để lấy 50 comments')
    console.log(
      '💡 Gọi window.fetch50CommentsWithReplies() để lấy comments KÈM THEO replies'
    )
  }
})()
