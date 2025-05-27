// @ts-nocheck
/**
 * Class quản lý việc trích xuất và xử lý YouTube transcript
 */

class YouTubeTranscriptExtractor {
  constructor(defaultLang = 'vi') {
    this.defaultLang = defaultLang
    this.cache = new Map()
    this.retryDelay = 1000
    this.maxRetries = 3
  }

  // Utility: Extract video ID from URL
  extractVideoId(url = window.location.href) {
    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
    )
    return match ? match[1] : null
  }

  // Utility: Add random delay to avoid detection
  async randomDelay() {
    const delay = Math.random() * 500 + 200
    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  // Method 1: Parse from DOM - ytInitialPlayerResponse
  async getPlayerResponseFromDOM() {
    console.log('🔍 Method 1: Extracting from DOM ytInitialPlayerResponse...')

    try {
      // Check window object first
      if (window.ytInitialPlayerResponse) {
        console.log('✅ Found ytInitialPlayerResponse in window object')
        return window.ytInitialPlayerResponse
      }

      // Search in script tags
      const scripts = document.querySelectorAll('script:not([src])')
      for (const script of scripts) {
        const content = script.textContent || script.innerText

        // Multiple patterns to match different YouTube layouts
        const patterns = [
          /var ytInitialPlayerResponse = ({.+?});/s,
          /ytInitialPlayerResponse\s*=\s*({.+?});\s*(?:var|window|<\/script)/s,
          /"ytInitialPlayerResponse":({.+?}),"ytInitialData"/s,
          /window\["ytInitialPlayerResponse"\]\s*=\s*({.+?});/s,
        ]

        for (const pattern of patterns) {
          const match = content.match(pattern)
          if (match && match[1]) {
            try {
              const response = JSON.parse(match[1])
              console.log(
                '✅ Method 1 successful: Found via script tag pattern'
              )
              return response
            } catch (e) {
              console.warn('⚠️ JSON parse error for pattern match:', e.message)
            }
          }
        }
      }

      // Try alternative approach - check for YTPlayer config
      const ytPlayerMatch = document.documentElement.innerHTML.match(
        /ytplayer\.config\s*=\s*({.+?});/s
      )
      if (ytPlayerMatch) {
        try {
          const config = JSON.parse(ytPlayerMatch[1])
          if (config.args && config.args.player_response) {
            const playerResponse = JSON.parse(config.args.player_response)
            console.log('✅ Method 1 successful: Found via ytplayer.config')
            return playerResponse
          }
        } catch (e) {
          console.warn('⚠️ Error parsing ytplayer.config:', e.message)
        }
      }

      console.log('❌ Method 1 failed: No ytInitialPlayerResponse found in DOM')
      return null
    } catch (error) {
      console.error('❌ Method 1 error:', error)
      return null
    }
  }

  // Method 2: Fetch page and parse HTML
  async getPlayerResponseFromFetch() {
    console.log('🔍 Method 2: Fetching page HTML...')

    try {
      const videoId = this.extractVideoId()
      if (!videoId) {
        console.log('❌ Method 2 failed: No video ID found')
        return null
      }

      const urls = [
        window.location.href,
        `https://www.youtube.com/watch?v=${videoId}`,
        `https://m.youtube.com/watch?v=${videoId}`,
      ]

      for (const url of urls) {
        try {
          await this.randomDelay()

          const response = await fetch(url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Cache-Control': 'no-cache',
            },
          })

          if (!response.ok) continue

          const html = await response.text()
          const patterns = [
            /var ytInitialPlayerResponse = ({.+?});/s,
            /ytInitialPlayerResponse\s*=\s*({.+?});\s*(?:var|window|<\/script)/s,
            /"ytInitialPlayerResponse":({.+?}),"ytInitialData"/s,
          ]

          for (const pattern of patterns) {
            const match = html.match(pattern)
            if (match && match[1]) {
              try {
                const playerResponse = JSON.parse(match[1])
                console.log(
                  `✅ Method 2 successful: Found via fetch from ${url}`
                )
                return playerResponse
              } catch (e) {
                console.warn('⚠️ JSON parse error:', e.message)
              }
            }
          }
        } catch (fetchError) {
          console.warn(`⚠️ Fetch error for ${url}:`, fetchError.message)
        }
      }

      console.log('❌ Method 2 failed: No playerResponse found via fetch')
      return null
    } catch (error) {
      console.error('❌ Method 2 error:', error)
      return null
    }
  }

  // Method 3: Use YouTube internal API (undocumented)
  async getTranscriptViaInternalAPI() {
    console.log('🔍 Method 3: Using YouTube internal API...')

    try {
      const videoId = this.extractVideoId()
      if (!videoId) {
        console.log('❌ Method 3 failed: No video ID')
        return null
      }

      // Try different internal API endpoints
      const endpoints = [
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${this.defaultLang}&fmt=json3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${this.defaultLang}&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
      ]

      for (const endpoint of endpoints) {
        try {
          await this.randomDelay()

          const response = await fetch(endpoint, {
            headers: {
              Referer: 'https://www.youtube.com/',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          })

          if (response.ok) {
            const data = await response.json()
            if (data && data.events) {
              console.log(
                `✅ Method 3 successful: Found via internal API ${endpoint}`
              )
              return { directTranscript: data }
            }
          }
        } catch (apiError) {
          console.warn(`⚠️ API error for ${endpoint}:`, apiError.message)
        }
      }

      console.log('❌ Method 3 failed: No transcript via internal API')
      return null
    } catch (error) {
      console.error('❌ Method 3 error:', error)
      return null
    }
  }

  // Method 4: Parse from page mutations (when content loads dynamically)
  async waitForPlayerResponse() {
    console.log('🔍 Method 4: Waiting for dynamic content load...')

    return new Promise((resolve) => {
      let attempts = 0
      const maxAttempts = 20

      const checkForResponse = () => {
        attempts++

        if (window.ytInitialPlayerResponse) {
          console.log('✅ Method 4 successful: Found after waiting')
          resolve(window.ytInitialPlayerResponse)
          return
        }

        if (attempts >= maxAttempts) {
          console.log('❌ Method 4 failed: Timeout waiting for playerResponse')
          resolve(null)
          return
        }

        setTimeout(checkForResponse, 500)
      }

      checkForResponse()
    })
  }

  // Extract caption tracks from player response
  extractCaptionTracks(playerResponse) {
    try {
      const captions =
        playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks
      return captions || []
    } catch (error) {
      console.warn('⚠️ Error extracting caption tracks:', error)
      return []
    }
  }

  // Select best caption track
  selectBestCaptionTrack(tracks) {
    if (!tracks || tracks.length === 0) {
      console.log('❌ No caption tracks available')
      return { baseUrl: null, trackInfo: null }
    }

    console.log(`📝 Found ${tracks.length} caption tracks`)

    // Priority order for language selection
    const langPriority = [
      this.defaultLang,
      `a.${this.defaultLang}`,
      'en',
      'a.en',
      'a.',
      '.',
    ]

    for (const langCode of langPriority) {
      const track = tracks.find(
        (t) =>
          t.vssId?.startsWith(langCode) ||
          t.languageCode === langCode.replace('a.', '').replace('.', '')
      )

      if (track) {
        const trackInfo = {
          name: track.name?.simpleText || track.languageCode || 'Unknown',
          isAutoGenerated: track.kind === 'asr',
          languageCode: track.languageCode,
        }

        console.log(
          `✅ Selected track: ${trackInfo.name} (${trackInfo.languageCode})${
            trackInfo.isAutoGenerated ? ' (auto-generated)' : ''
          }`
        )
        return { baseUrl: track.baseUrl, trackInfo }
      }
    }

    // Fallback to first available track
    const firstTrack = tracks[0]
    const trackInfo = {
      name: firstTrack.name?.simpleText || firstTrack.languageCode || 'Unknown',
      isAutoGenerated: firstTrack.kind === 'asr',
      languageCode: firstTrack.languageCode,
    }

    console.log(
      `⚠️ Using fallback track: ${trackInfo.name} (${trackInfo.languageCode})`
    )
    return { baseUrl: firstTrack.baseUrl, trackInfo }
  }

  // Clean and format transcript text
  cleanTranscriptText(text) {
    return text
      .replace(/\n/g, ' ')
      .replace(/♪|["""''`]|\.{2,}|<[^>]*>|{[^}]*}|\[[^\]]*\]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Format milliseconds to timestamp
  formatTimestamp(ms) {
    const seconds = Math.floor(ms / 1000)
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    const formatNumber = (num) => String(num).padStart(2, '0')

    return hours > 0
      ? `${formatNumber(hours)}:${formatNumber(minutes)}:${formatNumber(secs)}`
      : `${formatNumber(minutes)}:${formatNumber(secs)}`
  }

  // Process transcript data
  processTranscriptData(data, withTimestamp = false) {
    if (!data || !data.events) {
      console.error('❌ Invalid transcript data format')
      return null
    }

    const validEvents = data.events.filter(
      (event) => event.segs && event.tStartMs !== undefined
    )

    if (validEvents.length === 0) {
      console.log('❌ No valid transcript events found')
      return null
    }

    if (withTimestamp) {
      const timestampedLines = validEvents
        .map((event) => {
          const timestamp = this.formatTimestamp(event.tStartMs)
          const text = this.cleanTranscriptText(
            event.segs.map((seg) => seg.utf8).join(' ')
          )
          return text.length > 0 ? `[${timestamp}] ${text}` : null
        })
        .filter((line) => line !== null)

      return timestampedLines.length > 0 ? timestampedLines.join('\n') : null
    } else {
      const fullText = validEvents
        .map((event) => event.segs.map((seg) => seg.utf8).join(' '))
        .join(' ')

      return this.cleanTranscriptText(fullText)
    }
  }

  // Main transcript extraction method with multiple fallbacks
  async getTranscript(lang = this.defaultLang, withTimestamp = false) {
    const cacheKey = `${this.extractVideoId()}_${lang}_${withTimestamp}`

    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log('📋 Returning cached transcript')
      return this.cache.get(cacheKey)
    }

    console.log(
      `🚀 Starting transcript extraction (lang: ${lang}, timestamp: ${withTimestamp})`
    )

    const methods = [
      () => this.getPlayerResponseFromDOM(),
      () => this.waitForPlayerResponse(),
      () => this.getPlayerResponseFromFetch(),
      () => this.getTranscriptViaInternalAPI(),
    ]

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`📡 Trying extraction method ${i + 1}/${methods.length}...`)

        const result = await methods[i]()
        if (!result) continue

        // Handle direct transcript result from internal API
        if (result.directTranscript) {
          const transcript = this.processTranscriptData(
            result.directTranscript,
            withTimestamp
          )
          if (transcript) {
            this.cache.set(cacheKey, transcript)
            console.log('✅ Transcript extraction successful!')
            return transcript
          }
          continue
        }

        // Handle player response result
        const tracks = this.extractCaptionTracks(result)
        const { baseUrl, trackInfo } = this.selectBestCaptionTrack(tracks)

        if (!baseUrl) {
          console.log(
            '⚠️ No suitable caption track found, trying next method...'
          )
          continue
        }

        // Fetch transcript data
        const transcriptUrl = baseUrl + '&fmt=json3'
        console.log(`📥 Fetching transcript from: ${transcriptUrl}`)

        await this.randomDelay()

        const response = await fetch(transcriptUrl, {
          headers: {
            Referer: 'https://www.youtube.com/',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })

        if (!response.ok) {
          console.warn(
            `⚠️ Transcript fetch failed with status: ${response.status}`
          )
          continue
        }

        const transcriptText = await response.text()
        let transcriptData = null
        try {
          transcriptData = JSON.parse(transcriptText)
        } catch (jsonError) {
          console.warn(
            `⚠️ Method ${i + 1} failed: JSON parse error - ${jsonError.message}`
          )
          console.warn('⚠️ Received text:', transcriptText) // Log nội dung thô
          continue // Bỏ qua phương thức này nếu parse lỗi
        }

        const transcript = this.processTranscriptData(
          transcriptData,
          withTimestamp
        )

        if (transcript) {
          this.cache.set(cacheKey, transcript)
          console.log('✅ Transcript extraction successful!')
          return transcript
        }
      } catch (error) {
        console.warn(`⚠️ Method ${i + 1} failed:`, error.message)
        continue
      }
    }

    console.error('❌ All transcript extraction methods failed')
    return null
  }

  // Public methods
  async getPlainTranscript(lang = this.defaultLang) {
    return this.getTranscript(lang, false)
  }

  async getTimestampedTranscript(lang = this.defaultLang) {
    return this.getTranscript(lang, true)
  }

  // Clear cache
  clearCache() {
    this.cache.clear()
    console.log('🗑️ Transcript cache cleared')
  }
}

// Initialize extractor
const transcriptExtractor = new YouTubeTranscriptExtractor('vi')

// Message listener for Chrome extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  ;(async () => {
    try {
      switch (request.action) {
        case 'fetchTranscript':
          console.log('📨 Received fetchTranscript request:', request)

          const lang = request.lang || transcriptExtractor.defaultLang
          const transcript = await transcriptExtractor.getPlainTranscript(lang)

          if (transcript) {
            console.log('✅ Transcript fetched successfully')
            sendResponse({ success: true, transcript })
          } else {
            console.log('❌ Failed to fetch transcript')
            sendResponse({ success: false, error: 'Failed to get transcript' })
          }
          break

        case 'fetchTranscriptWithTimestamp':
          console.log(
            '📨 Received fetchTranscriptWithTimestamp request:',
            request
          )

          const timestampLang = request.lang || transcriptExtractor.defaultLang
          const timestampedTranscript =
            await transcriptExtractor.getTimestampedTranscript(timestampLang)

          if (timestampedTranscript) {
            console.log('✅ Timestamped transcript fetched successfully')
            sendResponse({ success: true, transcript: timestampedTranscript })
          } else {
            console.log('❌ Failed to fetch timestamped transcript')
            sendResponse({
              success: false,
              error: 'Failed to get timestamped transcript',
            })
          }
          break

        case 'pingYouTubeScript':
          console.log('📨 Received ping request')
          sendResponse({ success: true, message: 'pong' })
          break

        case 'clearCache':
          transcriptExtractor.clearCache()
          sendResponse({ success: true, message: 'Cache cleared' })
          break

        default:
          console.log(`❓ Unknown action: ${request.action}`)
          sendResponse({
            success: false,
            error: `Unknown action: ${request.action}`,
          })
      }
    } catch (error) {
      console.error('❌ Error handling message:', error)
      sendResponse({ success: false, error: error.message })
    }
  })()

  return true // Keep message channel open for async response
})

console.log('🎬 YouTube Transcript Extractor ready!')
