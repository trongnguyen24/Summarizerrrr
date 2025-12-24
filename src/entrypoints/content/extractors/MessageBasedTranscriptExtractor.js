// @ts-nocheck
/**
 * MessageBasedTranscriptExtractor - Lấy transcript sử dụng youtube-transcript-plus
 * Thay thế cho phương pháp inject youtube_transcript.js
 */
import { fetchTranscript } from 'youtube-transcript-plus'
import { decode } from 'html-entities'

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
    // Normal watch URL: ?v=videoId
    const watchMatch = url.match(/[?&]v=([^&]+)/)
    if (watchMatch) return watchMatch[1]

    // Live URL: /live/videoId
    const liveMatch = url.match(/\/live\/([^/?#&]+)/)
    if (liveMatch) return liveMatch[1]

    return null
  }

  /**
   * Lấy title của video từ DOM
   * @returns {string|null} - Video title hoặc null nếu không tìm thấy
   */
  getVideoTitle() {
    try {
      // Try multiple selectors for YouTube title
      const titleSelectors = [
        'h1.ytd-watch-metadata yt-formatted-string',
        'h1.title yt-formatted-string',
        'h1 yt-formatted-string.ytd-watch-metadata',
        'ytd-watch-metadata h1',
      ]

      for (const selector of titleSelectors) {
        const titleElement = document.querySelector(selector)
        if (titleElement && titleElement.textContent) {
          return titleElement.textContent.trim()
        }
      }

      // Fallback to document title
      const docTitle = document.title
      if (docTitle) {
        // Remove " - YouTube" suffix if present
        return docTitle.replace(/ - YouTube$/, '').trim()
      }

      return null
    } catch (error) {
      console.error(
        '[MessageBasedTranscriptExtractor] Error getting video title:',
        error
      )
      return null
    }
  }

  /**
   * Format seconds to timestamp string MM:SS or HH:MM:SS
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted timestamp
   */
  formatTime(seconds) {
    const totalSeconds = Math.floor(seconds)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60

    const paddedSeconds = String(secs).padStart(2, '0')
    const paddedMinutes = String(minutes).padStart(2, '0')

    if (hours > 0) {
      const paddedHours = String(hours).padStart(2, '0')
      return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`
    } else {
      return `${paddedMinutes}:${paddedSeconds}`
    }
  }

  /**
   * Lấy transcript sử dụng youtube-transcript-plus
   * @param {boolean} includeTimestamps - Có bao gồm timestamp không
   * @param {string} preferredLang - Mã ngôn ngữ ưa thích
   * @returns {Promise<string|null>} - Transcript hoặc null nếu không thành công
   */
  async fetchTranscript(includeTimestamps = false, preferredLang = 'en') {
    try {
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

      // Prioritize the preferred language, then 'en', then auto-generated
      const languageCodes = [preferredLang]
      if (preferredLang !== 'en') {
        languageCodes.push('en')
      }
      const uniqueLanguageCodes = [...new Set(languageCodes)]

      for (const langCode of uniqueLanguageCodes) {
        try {
          // Add small delay to ensure fresh fetch
          await new Promise((resolve) => setTimeout(resolve, 100))
          
          // Use youtube-transcript-plus library
          const transcriptData = await fetchTranscript(videoId, { lang: langCode })

          if (
            transcriptData &&
            Array.isArray(transcriptData) &&
            transcriptData.length > 0
          ) {
            console.log(
              `[MessageBasedTranscriptExtractor] Fresh transcript found for language: ${langCode}, segments: ${transcriptData.length}`
            )

            // Decode HTML entities in transcript text
            const decodedTranscript = transcriptData.map((segment) => ({
              ...segment,
              text: decode(decode(segment.text.trim())).trim(),
            }))

            let result
            if (includeTimestamps) {
              // Get video title
              const videoTitle = this.getVideoTitle()

              // Format transcript with title - offset and duration are in SECONDS
              const transcriptContent = decodedTranscript
                .map((segment) => {
                  const startTime = this.formatTime(segment.offset)
                  return `[${startTime}] ${segment.text}`.trim()
                })
                .join('\n')

              // Add title at the beginning if available
              if (videoTitle) {
                result = `<title>${videoTitle}</title>\n\n${transcriptContent}`
              } else {
                result = transcriptContent
              }
            } else {
              result = decodedTranscript.map((segment) => segment.text).join(' ')
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

      // Try fetching default transcript without language specification
      try {
        console.log('[MessageBasedTranscriptExtractor] Trying default transcript...')
        const defaultTranscript = await fetchTranscript(videoId)
        
        if (defaultTranscript && Array.isArray(defaultTranscript) && defaultTranscript.length > 0) {
          console.log(
            `[MessageBasedTranscriptExtractor] Default transcript found, segments: ${defaultTranscript.length}`
          )

          const decodedTranscript = defaultTranscript.map((segment) => ({
            ...segment,
            text: decode(decode(segment.text.trim())).trim(),
          }))

          let result
          if (includeTimestamps) {
            const videoTitle = this.getVideoTitle()
            const transcriptContent = decodedTranscript
              .map((segment) => {
                const startTime = this.formatTime(segment.offset)
                return `[${startTime}] ${segment.text}`.trim()
              })
              .join('\n')

            if (videoTitle) {
              result = `<title>${videoTitle}</title>\n\n${transcriptContent}`
            } else {
              result = transcriptContent
            }
          } else {
            result = decodedTranscript.map((segment) => segment.text).join(' ')
          }

          this.transcriptCache.set(cacheKey, result)
          return result
        }
      } catch (error) {
        console.log(
          `[MessageBasedTranscriptExtractor] Default transcript also failed: ${error.message}`
        )
      }


      console.log('[MessageBasedTranscriptExtractor] API fetching disabled for DOM testing')


      // Try DOM scraping as last resort
      try {
        console.log('[MessageBasedTranscriptExtractor] Trying DOM scraping...')
        const domTranscript = await this.fetchTranscriptFromDOM(includeTimestamps)
        
        if (domTranscript) {
          console.log('[MessageBasedTranscriptExtractor] DOM transcript found')
          this.transcriptCache.set(cacheKey, domTranscript)
          return domTranscript
        }
      } catch (error) {
        console.log(
          `[MessageBasedTranscriptExtractor] DOM scraping failed: ${error.message}`
        )
      }

      console.log(
        '[MessageBasedTranscriptExtractor] No transcript found for any attempted method.'
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
   * Helper method to wait for an element to appear in the DOM
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Element>} - The found element
   */
  async waitForElement(selector, timeout = 5000) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector)
      if (element) {
        console.log(`[DOM] Element found: ${selector}`)
        return element
      }
      
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    throw new Error(`Element ${selector} not found within ${timeout}ms`)
  }

  /**
   * Fetch transcript by scraping the DOM (fallback method)
   * @param {boolean} includeTimestamps - Include timestamps in output
   * @returns {Promise<string|null>} - Transcript or null
   */
  async fetchTranscriptFromDOM(includeTimestamps = false) {
    try {
      console.log('[DOM] Starting DOM scraping for transcript...')
      
      // 1. Find transcript button using YouTube's standard tag (language-independent)
      let showButton = document.querySelector('ytd-video-description-transcript-section-renderer button')
      
      // If not found, try expanding description first
      if (!showButton) {
        console.log('[DOM] Button not found, trying to expand description...')
        const expandButton = document.querySelector('#expand')
        
        if (expandButton && expandButton.offsetParent !== null) {
          console.log('[DOM] Expanding description...')
          expandButton.click()
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Try finding button again
          showButton = document.querySelector('ytd-video-description-transcript-section-renderer button')
        }
      }
      
      // Fallback to old selectors if still not found
      if (!showButton) {
        console.log('[DOM] Trying fallback selectors...')
        showButton = document.querySelector('button[aria-label="Show transcript"]')
        
        if (!showButton) {
          const buttons = Array.from(document.querySelectorAll('button'))
          showButton = buttons.find(btn => 
            btn.textContent.toLowerCase().includes('transcript')
          )
        }
      }
      
      if (!showButton) {
        console.log('[DOM] Show transcript button not found after all attempts')
        return null
      }
      
      console.log('[DOM] Found transcript button, clicking...')
      showButton.click()
      
      // 2. Wait for transcript panel to appear
      await this.waitForElement(
        'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]',
        5000
      )
      
      // Small delay to ensure content is loaded
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 3. Get all transcript segments
      const segments = document.querySelectorAll('ytd-transcript-segment-renderer')
      
      if (!segments || segments.length === 0) {
        console.log('[DOM] No transcript segments found')
        return null
      }
      
      console.log(`[DOM] Found ${segments.length} transcript segments`)
      
      // 4. Parse segments with correct selectors
      const transcriptData = []
      segments.forEach(segment => {
        // Correct selectors based on inspection
        const timeElement = segment.querySelector('div.segment-start-offset')
        const textElement = segment.querySelector('yt-formatted-string.segment-text')
        
        if (textElement) {
          const text = textElement.textContent.trim()
          const timestamp = timeElement?.textContent?.trim() || '00:00'
          
          transcriptData.push({ text, timestamp })
        }
      })
      
      if (transcriptData.length === 0) {
        console.log('[DOM] No valid transcript data extracted')
        return null
      }
      
      console.log(`[DOM] Successfully parsed ${transcriptData.length} segments`)
      
      // 5. Format result
      let result
      if (includeTimestamps) {
        const videoTitle = this.getVideoTitle()
        const content = transcriptData
          .map(s => `[${s.timestamp}] ${s.text}`)
          .join('\n')
        
        result = videoTitle ? `<title>${videoTitle}</title>\n\n${content}` : content
      } else {
        result = transcriptData.map(s => s.text).join(' ')
      }
      
      console.log(`[DOM] Successfully extracted transcript (${result.length} characters)`)
      return result
      
    } catch (error) {
      console.error('[DOM] Error fetching transcript from DOM:', error)
      return null
    }
  }


  /**

   * Get raw transcript data (for SRT conversion, etc.)
   * @param {string} preferredLang - Preferred language code
   * @returns {Promise<Array|null>} - Raw transcript segments or null
   */
  async getRawTranscriptData(preferredLang = 'en') {
    try {
      const videoId = this.getVideoId()
      if (!videoId) return null

      const languageCodes = [preferredLang]
      if (preferredLang !== 'en') {
        languageCodes.push('en')
      }
      const uniqueLanguageCodes = [...new Set(languageCodes)]

      for (const langCode of uniqueLanguageCodes) {
        try {
          const transcriptData = await fetchTranscript(videoId, { lang: langCode })
          if (transcriptData && Array.isArray(transcriptData) && transcriptData.length > 0) {
            // Return decoded data with formatted times - offset and duration are in SECONDS
            return transcriptData.map((segment) => ({
              text: decode(decode(segment.text.trim())).trim(),
              startTime: this.formatTime(segment.offset),
              endTime: this.formatTime(segment.offset + segment.duration),
              offset: segment.offset,
              duration: segment.duration,
            }))
          }
        } catch (error) {
          console.log(`[MessageBasedTranscriptExtractor] getRawTranscriptData failed for ${langCode}`)
        }
      }

      // Try default transcript
      try {
        const defaultTranscript = await fetchTranscript(videoId)
        if (defaultTranscript && Array.isArray(defaultTranscript) && defaultTranscript.length > 0) {
          return defaultTranscript.map((segment) => ({
            text: decode(decode(segment.text.trim())).trim(),
            startTime: this.formatTime(segment.offset),
            endTime: this.formatTime(segment.offset + segment.duration),
            offset: segment.offset,
            duration: segment.duration,
          }))
        }
      } catch (error) {
        console.log('[MessageBasedTranscriptExtractor] Default getRawTranscriptData failed')
      }

      return null
    } catch (error) {
      console.error('[MessageBasedTranscriptExtractor] getRawTranscriptData error:', error)
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
