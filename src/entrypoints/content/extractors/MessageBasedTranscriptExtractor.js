// @ts-nocheck
/**
 * MessageBasedTranscriptExtractor - Lấy transcript thông qua getCaptions function
 * Thay thế cho YouTubeTranscriptExtractor sử dụng DOM interaction
 */
export class MessageBasedTranscriptExtractor {
  /**
   * Khởi tạo extractor với ngôn ngữ mặc định
   * @param {string} defaultLang - Mã ngôn ngữ mặc định (ví dụ: 'vi', 'en')
   */
  constructor(defaultLang = 'en') {
    this.defaultLang = defaultLang
    this.transcriptCache = new Map() // Cache transcript theo videoId
    this.lastVideoId = null
  }

  /**
   * Clear cache cho video cụ thể hoặc toàn bộ cache
   * @param {string|null} videoId - Video ID cần clear cache, null để clear toàn bộ
   */
  clearCache(videoId = null) {
    if (videoId) {
      this.transcriptCache.delete(videoId)
      console.log(
        `[MessageBasedTranscriptExtractor] Cache cleared for video: ${videoId}`
      )
    } else {
      this.transcriptCache.clear()
      console.log('[MessageBasedTranscriptExtractor] All cache cleared')
    }
  }

  /**
   * Kiểm tra và clear cache nếu video đã thay đổi
   */
  checkVideoChange() {
    const currentVideoId = this.getVideoId()
    if (currentVideoId && currentVideoId !== this.lastVideoId) {
      console.log(
        `[MessageBasedTranscriptExtractor] Video changed from ${this.lastVideoId} to ${currentVideoId}`
      )
      // Clear cache của video cũ (giữ lại cache của video mới nếu có)
      if (this.lastVideoId) {
        this.clearCache(this.lastVideoId)
      }
      this.lastVideoId = currentVideoId
      return true
    }
    return false
  }

  /**
   * Kiểm tra xem transcript đã được cache chưa
   * @param {string} videoId - Video ID
   * @param {string} preferredLang - Ngôn ngữ ưa thích
   * @param {boolean} includeTimestamps - Có bao gồm timestamp không
   * @returns {boolean} - True nếu đã có trong cache
   */
  isTranscriptCached(videoId, preferredLang = 'en', includeTimestamps = false) {
    const cacheKey = `${videoId}_${preferredLang}_${includeTimestamps}`
    return this.transcriptCache.has(cacheKey)
  }

  /**
   * Lấy video ID từ URL hiện tại
   * @returns {string|null} Video ID hoặc null nếu không tìm thấy
   */
  getVideoId() {
    const url = window.location.href
    const match = url.match(/[?&]v=([^&]+)/)
    return match ? match[1] : null
  }

  /**
   * Kiểm tra xem getCaptions function có sẵn không
   * @returns {boolean} - True nếu getCaptions có sẵn
   */
  isCaptionsAvailable() {
    return typeof getCaptions !== 'undefined'
  }

  /**
   * Lấy transcript sử dụng getCaptions function
   * @param {boolean} includeTimestamps - Có bao gồm timestamp không
   * @param {string} preferredLang - Mã ngôn ngữ ưa thích
   * @returns {Promise<string|null>} - Transcript hoặc null nếu không thành công
   */
  async fetchTranscript(includeTimestamps = false, preferredLang = 'en') {
    try {
      const videoUrl = window.location.href
      const videoId = this.getVideoId()

      if (!videoId) {
        console.log('[MessageBasedTranscriptExtractor] No video ID found.')
        return null
      }

      // Always check if video has changed and clear cache if needed
      const videoChanged = this.checkVideoChange()

      // Create cache key
      const cacheKey = `${videoId}_${preferredLang}_${includeTimestamps}`

      // Check cache first - even if video changed, we might have cached this specific request
      if (this.transcriptCache.has(cacheKey)) {
        console.log(
          `[MessageBasedTranscriptExtractor] Using cached transcript for ${cacheKey}`
        )
        return this.transcriptCache.get(cacheKey)
      }

      if (!this.isCaptionsAvailable()) {
        console.error(
          '[MessageBasedTranscriptExtractor] getCaptions function is not available. Make sure youtube_transcript.js is loaded.'
        )
        return null
      }

      console.log(
        `[MessageBasedTranscriptExtractor] Fetching fresh transcript for video: ${videoId}, lang: ${preferredLang}, videoChanged: ${videoChanged}`
      )

      // Force clear any existing cache for this video if video changed
      if (videoChanged) {
        // Clear all cache entries for this video ID
        for (const key of this.transcriptCache.keys()) {
          if (key.startsWith(`${videoId}_`)) {
            this.transcriptCache.delete(key)
          }
        }
        console.log(
          `[MessageBasedTranscriptExtractor] Cleared all cache for video: ${videoId}`
        )
      }

      // Prioritize the preferred language, then fall back to others
      const languageCodes = [preferredLang, 'en', 'vi', 'zz']
      const uniqueLanguageCodes = [...new Set(languageCodes)]

      for (const langCode of uniqueLanguageCodes) {
        try {
          // Add small delay to ensure fresh fetch
          await new Promise((resolve) => setTimeout(resolve, 100))
          const transcriptData = await getCaptions(videoUrl, langCode)

          if (
            transcriptData &&
            Array.isArray(transcriptData) &&
            transcriptData.length > 0
          ) {
            console.log(
              `[MessageBasedTranscriptExtractor] Fresh transcript found for language: ${langCode}, segments: ${transcriptData.length}`
            )

            let result
            if (includeTimestamps) {
              result = transcriptData
                .map((segment) => {
                  const timeRange =
                    segment.startTime && segment.endTime
                      ? `[${segment.startTime} → ${segment.endTime}]`
                      : segment.startTime
                      ? `[${segment.startTime}]`
                      : ''
                  return `${timeRange} ${segment.text}`.trim()
                })
                .join('\n')
            } else {
              result = transcriptData.map((segment) => segment.text).join(' ')
            }

            // Cache the fresh result
            this.transcriptCache.set(cacheKey, result)
            console.log(
              `[MessageBasedTranscriptExtractor] Fresh transcript cached with key: ${cacheKey}, length: ${result.length}`
            )

            return result
          }
        } catch (error) {
          console.log(
            `[MessageBasedTranscriptExtractor] No transcript for language ${langCode}: ${error.message}`
          )
        }
      }

      console.log(
        '[MessageBasedTranscriptExtractor] No transcript found for any attempted language.'
      )
      return null
    } catch (error) {
      console.error(
        '[MessageBasedTranscriptExtractor] An error occurred while fetching transcript:',
        error
      )
      return null
    }
  }

  /**
   * Lấy transcript không có timestamp
   * @param {string} preferredLang - Mã ngôn ngữ ưa thích
   * @returns {Promise<string|null>} - Transcript hoặc null nếu không thành công
   */
  async getPlainTranscript(preferredLang = this.defaultLang) {
    console.log(
      `[MessageBasedTranscriptExtractor] Fetching plain transcript for language: ${preferredLang}`
    )
    const result = await this.fetchTranscript(false, preferredLang)
    if (result) {
      console.log(
        `[MessageBasedTranscriptExtractor] Plain transcript fetched successfully (${result.length} characters)`
      )
    }
    return result
  }

  /**
   * Lấy transcript có timestamp
   * @param {string} preferredLang - Mã ngôn ngữ ưa thích
   * @returns {Promise<string|null>} - Transcript có timestamp hoặc null nếu không thành công
   */
  async getTimestampedTranscript(preferredLang = this.defaultLang) {
    console.log(
      `[MessageBasedTranscriptExtractor] Fetching timestamped transcript for language: ${preferredLang}`
    )
    const result = await this.fetchTranscript(true, preferredLang)
    if (result) {
      console.log(
        `[MessageBasedTranscriptExtractor] Timestamped transcript fetched successfully (${result.length} characters)`
      )
    }
    return result
  }

  /**
   * Wrapper cho getTranscript với cả hai options
   * @param {string} preferredLang - Mã ngôn ngữ ưa thích
   * @param {boolean} includeTimestamps - Có bao gồm timestamp không
   * @returns {Promise<string|null>} - Transcript hoặc null nếu không thành công
   */
  async getTranscript(
    preferredLang = this.defaultLang,
    includeTimestamps = false
  ) {
    if (includeTimestamps) {
      return this.getTimestampedTranscript(preferredLang)
    } else {
      return this.getPlainTranscript(preferredLang)
    }
  }

  /**
   * Làm sạch text từ transcript (giữ tương thích với YouTubeTranscriptExtractor)
   * @param {string} text - Text cần làm sạch
   * @returns {string} - Text đã làm sạch
   */
  cleanTranscriptText(text) {
    return text
      .replace(/\n/g, ' ')
      .replace(/♪|'|\"|\.\{2,\}|\<[\s\S]*?\>|\{[\s\S]*?\}|\[[\s\S]*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Định dạng milliseconds thành chuỗi thời gian MM:SS hoặc HH:MM:SS (giữ tương thích)
   * @param {number} ms - Thời gian tính bằng milliseconds
   * @returns {string} - Chuỗi thời gian đã định dạng
   */
  formatMilliseconds(ms) {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const paddedSeconds = String(seconds).padStart(2, '0')
    const paddedMinutes = String(minutes).padStart(2, '0')

    if (hours > 0) {
      const paddedHours = String(hours).padStart(2, '0')
      return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`
    } else {
      return `${paddedMinutes}:${paddedSeconds}`
    }
  }
}
