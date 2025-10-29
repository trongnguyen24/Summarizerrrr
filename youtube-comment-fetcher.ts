// youtube-comment-fetcher.ts
// Content script để lấy comment từ YouTube sử dụng Innertube API

interface CommentItem {
  commentId: string
  author: string
  authorAvatar: string
  content: string
  likes: number
  replies: number
  publishedTime: string
  isVerified: boolean
  isChannelOwner: boolean
  timestamp?: string
}

interface CommentResponse {
  comments: CommentItem[]
  continuation?: string
}

class YouTubeCommentFetcher {
  private apiKey: string = ''
  private clientName: string = '1'
  private clientVersion: string = ''
  private videoId: string = ''

  constructor() {
    this.init()
  }

  private async init(): Promise<void> {
    // Lấy thông tin cấu hình từ trang YouTube
    await this.extractConfig()

    // Lấy video ID từ URL
    this.videoId = this.extractVideoId()

    if (!this.videoId) {
      console.error('Không thể tìm thấy video ID')
      return
    }

    console.log('YouTube Comment Fetcher đã sẵn sàng cho video:', this.videoId)
  }

  private async extractConfig(): Promise<void> {
    try {
      // Lấy ytcfg data từ trang
      const ytcfg = (window as any).ytcfg?.data_

      if (ytcfg) {
        this.apiKey = ytcfg.INNERTUBE_API_KEY || ''
        this.clientName = ytcfg.INNERTUBE_CONTEXT_CLIENT_NAME || '1'
        this.clientVersion = ytcfg.INNERTUBE_CONTEXT_CLIENT_VERSION || ''
      }

      // Nếu không tìm thấy trong ytcfg, thử lấy từ các nguồn khác
      if (!this.apiKey) {
        this.apiKey =
          (window as any).ytplayer?.web_player_context_config
            ?.innertubeApiKey || ''
      }

      console.log('Đã lấy cấu hình API:', {
        apiKey: this.apiKey ? 'Đã lấy' : 'Không tìm thấy',
        clientName: this.clientName,
        clientVersion: this.clientVersion,
      })
    } catch (error) {
      console.error('Lỗi khi lấy cấu hình:', error)
    }
  }

  private extractVideoId(): string {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('v') || ''
  }

  private buildHeaders(): Record<string, string> {
    return {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'content-type': 'application/json',
      'x-youtube-client-name': this.clientName,
      'x-youtube-client-version': this.clientVersion,
      'x-youtube-time-zone':
        Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      'x-youtube-utc-offset': Math.abs(
        new Date().getTimezoneOffset()
      ).toString(),
    }
  }

  private buildInitialBody(): Record<string, any> {
    return {
      context: {
        client: {
          clientName: this.clientName,
          clientVersion: this.clientVersion,
        },
      },
      videoId: this.videoId,
    }
  }

  private buildContinuationBody(continuation: string): Record<string, any> {
    return {
      context: {
        client: {
          clientName: this.clientName,
          clientVersion: this.clientVersion,
        },
      },
      continuation: continuation,
    }
  }

  private async fetchInitialComments(): Promise<CommentResponse> {
    try {
      // Lấy token continuation đầu tiên
      const initialDataResponse = await fetch(
        `https://www.youtube.com/youtubei/v1/next?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify(this.buildInitialBody()),
          credentials: 'include',
        }
      )

      if (!initialDataResponse.ok) {
        throw new Error(
          `Lỗi khi lấy dữ liệu ban đầu: ${initialDataResponse.status}`
        )
      }

      const initialData = await initialDataResponse.json()

      // Tìm token continuation cho comment
      let continuationToken = this.extractContinuationToken(initialData)

      if (!continuationToken) {
        console.warn(
          'Không tìm thấy continuation token, thử phương pháp thay thế'
        )
        // Thử các phương pháp khác để tìm token
        continuationToken = this.findAlternativeContinuationToken(initialData)
      }

      if (!continuationToken) {
        throw new Error('Không thể tìm thấy continuation token')
      }

      // Lấy comment đầu tiên
      return await this.fetchCommentsWithToken(continuationToken)
    } catch (error) {
      console.error('Lỗi khi lấy comment ban đầu:', error)
      throw error
    }
  }

  private extractContinuationToken(data: any): string | null {
    try {
      // Thử các đường dẫn khác nhau để tìm token
      const paths = [
        'onResponseReceivedEndpoints.1.appendContinuationItemsAction.continuationItems.0.continuationItemRenderer.continuationEndpoint.continuationCommand.token',
        'onResponseReceivedEndpoints.0.appendContinuationItemsAction.continuationItems.0.continuationItemRenderer.continuationEndpoint.continuationCommand.token',
        'contents.twoColumnWatchNextResults.results.results.1.itemSectionRenderer.contents.0.commentsEntryPointHeaderRenderer.commentRenderer.navigationEndpoint.commandMetadata.webCommandMetadata.url',
        'header.commentsHeaderRenderer.commentsEntryPointRenderer.commentRenderer.navigationEndpoint.commandMetadata.webCommandMetadata.url',
      ]

      for (const path of paths) {
        const token = this.getNestedValue(data, path)
        if (token) {
          console.log('Đã tìm thấy continuation token qua path:', path)
          return token
        }
      }
      return null
    } catch (error) {
      console.error('Lỗi khi trích xuất continuation token:', error)
      return null
    }
  }

  private findAlternativeContinuationToken(data: any): string | null {
    try {
      // Tìm trong các section khác
      const sections = [
        'contents.twoColumnWatchNextResults.results.results',
        'contents.twoColumnWatchNextResults.secondaryResults.secondaryResults',
        'onResponseReceivedEndpoints',
      ]

      for (const section of sections) {
        const sectionData = this.getNestedValue(data, section)
        if (sectionData && Array.isArray(sectionData)) {
          for (const item of sectionData) {
            if (item?.itemSectionRenderer?.contents) {
              for (const content of item.itemSectionRenderer.contents) {
                if (
                  content?.continuationItemRenderer?.continuationEndpoint
                    ?.continuationCommand?.token
                ) {
                  return content.continuationItemRenderer.continuationEndpoint
                    .continuationCommand.token
                }
              }
            }
          }
        }
      }
      return null
    } catch (error) {
      console.error('Lỗi khi tìm continuation token thay thế:', error)
      return null
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private async fetchCommentsWithToken(
    continuationToken: string
  ): Promise<CommentResponse> {
    try {
      const response = await fetch(
        `https://www.youtube.com/youtubei/v1/next?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify(this.buildContinuationBody(continuationToken)),
          credentials: 'include',
        }
      )

      if (!response.ok) {
        throw new Error(`Lỗi khi lấy comment: ${response.status}`)
      }

      const data = await response.json()
      const comments = this.parseCommentsFromResponse(data)
      const nextContinuation = this.extractNextContinuationToken(data)

      return {
        comments,
        continuation: nextContinuation || undefined,
      }
    } catch (error) {
      console.error('Lỗi khi lấy comment với token:', error)
      throw error
    }
  }

  private extractNextContinuationToken(data: any): string | null {
    try {
      const paths = [
        'onResponseReceivedEndpoints.0.appendContinuationItemsAction.continuationItems.0.continuationItemRenderer.continuationEndpoint.continuationCommand.token',
        'onResponseReceivedEndpoints.1.reloadContinuationItemsCommand.continuationItems.0.continuationItemRenderer.continuationEndpoint.continuationCommand.token',
      ]

      for (const path of paths) {
        const token = this.getNestedValue(data, path)
        if (token) {
          return token
        }
      }
      return null
    } catch (error) {
      console.error('Lỗi khi trích xuất continuation token tiếp theo:', error)
      return null
    }
  }

  private parseCommentsFromResponse(data: any): CommentItem[] {
    try {
      const comments: CommentItem[] = []

      // Xử lý các định dạng response khác nhau
      let commentItems = []

      // Thử lấy từ appendContinuationItemsAction
      if (
        data.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction
          ?.continuationItems
      ) {
        commentItems =
          data.onResponseReceivedEndpoints[0].appendContinuationItemsAction
            .continuationItems
      }
      // Thử lấy từ reloadContinuationItemsCommand
      else if (
        data.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand
          ?.continuationItems
      ) {
        commentItems =
          data.onResponseReceivedEndpoints[1].reloadContinuationItemsCommand
            .continuationItems
      }

      for (const item of commentItems) {
        if (item.commentThreadRenderer?.comment) {
          const comment = this.parseCommentRenderer(
            item.commentThreadRenderer.comment
          )
          if (comment) {
            comments.push(comment)
          }
        }
      }

      return comments
    } catch (error) {
      console.error('Lỗi khi phân tích comment:', error)
      return []
    }
  }

  private parseCommentRenderer(commentData: any): CommentItem | null {
    try {
      const renderer = commentData.commentRenderer || commentData

      if (!renderer) return null

      // Lấy nội dung comment
      let content = ''
      if (renderer.contentText?.simpleText) {
        content = renderer.contentText.simpleText
      } else if (renderer.contentText?.runs) {
        content = renderer.contentText.runs
          .map((run: any) => run.text || '')
          .join('')
      }

      // Lấy thông tin tác giả
      const author = renderer.authorText?.simpleText || ''
      const authorAvatar = renderer.authorThumbnail?.thumbnails?.[0]?.url || ''
      const likes = parseInt(renderer.voteCount?.simpleText || '0') || 0
      const replies = parseInt(renderer.replyCount || '0') || 0
      const publishedTime = renderer.publishedTimeText?.simpleText || ''
      const isVerified = renderer.verifiedAuthor || false
      const isChannelOwner = renderer.authorIsChannelOwner || false
      const commentId = renderer.commentId || ''

      // Kiểm tra timestamp trong comment
      let timestamp
      if (renderer.contentText?.runs) {
        for (const run of renderer.contentText.runs) {
          if (run.navigationEndpoint?.watchEndpoint?.startTimeSeconds) {
            timestamp =
              run.navigationEndpoint.watchEndpoint.startTimeSeconds.toString()
            break
          }
        }
      }

      return {
        commentId,
        author,
        authorAvatar,
        content,
        likes,
        replies,
        publishedTime,
        isVerified,
        isChannelOwner,
        timestamp,
      }
    } catch (error) {
      console.error('Lỗi khi phân tích comment renderer:', error)
      return null
    }
  }

  public async getAllComments(
    maxComments: number = 100
  ): Promise<CommentItem[]> {
    try {
      console.log(`Bắt đầu lấy ${maxComments} comment...`)

      const allComments: CommentItem[] = []
      let continuation = ''
      let attempts = 0
      const maxAttempts = 50 // Giới hạn để tránh vòng lặp vô hạn

      // Lấy batch đầu tiên
      const initialResponse = await this.fetchInitialComments()
      allComments.push(...initialResponse.comments)
      continuation = initialResponse.continuation || ''

      // Tiếp tục lấy cho đến khi đủ comment hoặc hết
      while (
        continuation &&
        allComments.length < maxComments &&
        attempts < maxAttempts
      ) {
        console.log(`Đã lấy ${allComments.length} comment, đang tiếp tục...`)

        const response = await this.fetchCommentsWithToken(continuation)
        allComments.push(...response.comments)
        continuation = response.continuation || ''
        attempts++

        // Đợi một chút để tránh rate limit
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      console.log(`Hoàn thành! Đã lấy ${allComments.length} comment`)
      return allComments
    } catch (error) {
      console.error('Lỗi khi lấy tất cả comment:', error)
      return []
    }
  }
}

// Khởi tạo và sử dụng
const commentFetcher = new YouTubeCommentFetcher()

// Hàm toàn cục để sử dụng từ extension
;(window as any).YouTubeCommentFetcher = {
  getAllComments: (maxComments?: number) =>
    commentFetcher.getAllComments(maxComments),
  getVideoId: () => commentFetcher['videoId'],
}

console.log('YouTube Comment Fetcher đã được tải thành công!')
