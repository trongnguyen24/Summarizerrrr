// @ts-nocheck
/**
 * Class quản lý việc trích xuất và xử lý YouTube transcript
 */
class YouTubeTranscriptExtractor {
  /**
   * Khởi tạo extractor với ngôn ngữ mặc định
   * @param {string} defaultLang - Mã ngôn ngữ mặc định (ví dụ: 'vi', 'en')
   */
  constructor(defaultLang = 'en') {
    this.defaultLang = defaultLang
  }

  /**
   * Lấy và phân tích ytInitialPlayerResponse từ trang YouTube
   * @returns {Promise<Object|null>} - Object chứa dữ liệu player hoặc null nếu có lỗi
   */
  async getPlayerResponse() {
    try {
      // Cách 1: Lấy từ trang HTML trực tiếp (nhanh hơn)
      console.log('Attempting Method 1: Fetching page HTML...')
      const responseText = await fetch(window.location.href).then((res) =>
        res.text()
      )
      // Điều chỉnh regex một chút để bắt được nhiều trường hợp kết thúc hơn, tương tự regex ở phương pháp 2
      const playerResponseMatch = responseText.match(
        /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+(?:meta|head|opf)|<\/script|\n|$)/s
      ) // Thêm cờ 's' cho '.' khớp newline

      if (playerResponseMatch && playerResponseMatch[1]) {
        console.log(
          'Method 1 successful: Found ytInitialPlayerResponse by fetching page HTML.'
        )
        return JSON.parse(playerResponseMatch[1])
      }

      console.log('Method 1 failed. Trying Method 2 (script tags)...')

      // Cách 2: Tìm trong script tags (backup) - Logic giữ nguyên từ đoạn code đầu tiên
      const scripts = document.querySelectorAll('script')
      const playerResponseScript = Array.from(scripts).find((script) =>
        script.textContent.includes('var ytInitialPlayerResponse = {')
      )

      if (playerResponseScript) {
        const scriptContent = playerResponseScript.textContent
        const jsonStart = scriptContent.indexOf('ytInitialPlayerResponse = {')
        const objectStart = scriptContent.indexOf('{', jsonStart)

        let objectEnd = scriptContent.indexOf(';</script>', objectStart)
        if (objectEnd === -1) {
          const scriptEnd = scriptContent.indexOf('</script>', objectStart)
          objectEnd = scriptContent.lastIndexOf(
            ';',
            scriptEnd !== -1 ? scriptEnd : undefined
          )
        }
        // Cách xử lý objectEnd này hơi phức tạp và có thể không chính xác hoàn toàn,
        // giữ nguyên như code gốc để tích hợp logic mới
        if (objectEnd === -1) {
          objectEnd = scriptContent.lastIndexOf(
            '}',
            scriptContent.indexOf('</script>', objectStart)
          )
          if (objectEnd !== -1) objectEnd += 1
        }

        if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
          const jsonString = scriptContent.substring(objectStart, objectEnd)
          console.log(
            'Method 2 successful: Found ytInitialPlayerResponse in script tag.'
          )
          return JSON.parse(jsonString)
        } else {
          console.warn(
            'Method 2 failed: Could not accurately determine JSON boundaries from script tag.'
          )
          // Continue to next method
        }
      } else {
        console.log(
          'Method 2 failed: No script tag containing ytInitialPlayerResponse found.'
        )
        // Continue to next method
      }

      console.log('Method 2 failed. Trying Method 3 (window object)...')

      // Cách 3: Kiểm tra window object (fallback cuối cùng trước khi thêm cách mới)
      if (window.ytInitialPlayerResponse) {
        console.log(
          'Method 3 successful: Found ytInitialPlayerResponse in window object.'
        )
        return window.ytInitialPlayerResponse
      }

      console.log('Method 3 failed. Trying Method 4 (fallback fetch URL)...')

      // --- Bắt đầu Cách 4: Lấy dữ liệu từ googleusercontent.com (từ đoạn mã thứ hai) ---
      const videoId = new URLSearchParams(window.location.search).get('v')
      // Sử dụng regex từ đoạn mã thứ hai, thêm cờ 's'
      const YT_INITIAL_PLAYER_RESPONSE_RE_METHOD4 =
        /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+(?:meta|head)|<\/script|\n|$)/s // Thêm cờ 's' cho '.' khớp newline

      if (!videoId) {
        console.warn('Method 4 failed: No video ID found in URL.')
        // Chuyển sang bước thất bại cuối cùng
      } else {
        try {
          const fallbackUrl = 'https://www.youtube.com/watch?v=' + videoId
          console.log(`Attempting Method 4: Fetching from ${fallbackUrl}`)

          const response = await fetch(fallbackUrl)
          if (!response.ok) {
            console.warn(
              `Method 4 failed: Fetch returned status ${response.status}`
            )
            // Chuyển sang bước thất bại cuối cùng
          } else {
            const body = await response.text()
            const playerResponseMatchMethod4 = body.match(
              YT_INITIAL_PLAYER_RESPONSE_RE_METHOD4
            )

            if (playerResponseMatchMethod4 && playerResponseMatchMethod4[1]) {
              console.log(
                'Method 4 successful: Found ytInitialPlayerResponse using fallback URL.'
              )
              return JSON.parse(playerResponseMatchMethod4[1])
            } else {
              console.warn(
                'Method 4 failed: Could not find playerResponse regex match in fallback data.'
              )
              // Chuyển sang bước thất bại cuối cùng
            }
          }
        } catch (fetchError) {
          console.error(
            'Method 4 failed: Error during fetch from fallback URL:',
            fetchError
          )
          // Chuyển sang bước thất bại cuối cùng
        }
      }
      // --- Kết thúc Cách 4 ---

      console.error(
        'Failed to obtain playerResponse object after trying all methods.'
      )
      return null
    } catch (error) {
      console.error('An unexpected error occurred in getPlayerResponse:', error)
      return null
    }
  }

  // Giữ nguyên các phương thức còn lại (selectBestCaptionTrack, cleanTranscriptText,
  // formatMilliseconds, processTranscriptData, getTranscript, getPlainTranscript,
  // getTimestampedTranscript)
  /**
   * Tìm và chọn caption track tốt nhất dựa trên ngôn ngữ ưa thích
   * @param {Array} captionTracks - Danh sách các caption tracks có sẵn
   * @param {string} preferredLang - Mã ngôn ngữ ưa thích
   * @returns {Object} - Thông tin về track được chọn và URL của nó
   */
  selectBestCaptionTrack(captionTracks, preferredLang) {
    // ... (logic giữ nguyên)
    if (!captionTracks || captionTracks.length === 0) {
      console.log('No caption tracks found.')
      return { baseUrl: null, needsTlang: false, trackInfo: null }
    }

    console.log(`Found ${captionTracks.length} caption tracks.`)

    const findCaptionUrl = (vssIdPrefix) =>
      captionTracks.find((track) => track.vssId?.startsWith(vssIdPrefix))
        ?.baseUrl

    // Thử tìm theo thứ tự ưu tiên: tiếng Anh thủ công, tiếng Anh tự động tạo, bất kỳ thủ công nào, bất kỳ tự động tạo nào, cuối cùng là track đầu tiên
    let baseUrl =
      findCaptionUrl('.en') || // English manual
      findCaptionUrl('a.en') || // English auto-generated
      findCaptionUrl('.') || // any manual
      findCaptionUrl('a.') || // any auto-generated
      captionTracks[0]?.baseUrl // first track
    let needsTlang = false

    const selectedTrack = baseUrl
      ? captionTracks.find((track) => track.baseUrl === baseUrl)
      : null

    if (!selectedTrack) {
      console.log('No track selected.')
    } else {
      console.log(
        `Selected track: ${
          selectedTrack.name?.simpleText ||
          selectedTrack.languageCode ||
          'Unknown'
        } (Code: ${selectedTrack.languageCode})${
          selectedTrack.kind === 'asr' ? ' (auto-generated)' : ''
        }`
      )
      // Logic needsTlang: cần tlang chỉ nếu track KHÔNG phải là auto-generated VÀ ngôn ngữ không khớp với ngôn ngữ ưu tiên
      if (selectedTrack.kind === 'asr') {
        needsTlang = false
        console.log(
          'Selected track is auto-generated. Setting needsTlang = false.'
        )
      } else if (selectedTrack.languageCode !== preferredLang) {
        needsTlang = true
        console.log(
          `Selected track is not auto-generated and language (${selectedTrack.languageCode}) does not match preferred language (${preferredLang}). Setting needsTlang = true.`
        )
      } else {
        needsTlang = false
        console.log(
          `Selected track is not auto-generated and language (${selectedTrack.languageCode}) matches preferred language (${preferredLang}). Setting needsTlang = false.`
        )
      }
    }

    // Tìm thông tin về track được chọn để log
    const selectedTrackInfo = baseUrl
      ? captionTracks.find((track) => track.baseUrl === baseUrl)
      : null

    const trackInfo = selectedTrackInfo
      ? {
          name:
            selectedTrackInfo.name?.simpleText ||
            selectedTrackInfo.languageCode ||
            'Unknown',
          isAutoGenerated: selectedTrackInfo.kind === 'asr',
          languageCode: selectedTrackInfo.languageCode, // Thêm languageCode để kiểm tra needsTlang chính xác hơn
        }
      : null

    return { baseUrl, needsTlang, trackInfo }
  }

  /**
   * Làm sạch text từ transcript
   * @param {string} text - Text cần làm sạch
   * @returns {string} - Text đã làm sạch
   */
  cleanTranscriptText(text) {
    // ... (logic giữ nguyên)
    return text
      .replace(/\n/g, ' ')
      .replace(/♪|'|"|\.{2,}|\<[\s\S]*?\>|\{[\s\S]*?\}|\[[\s\S]*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Định dạng milliseconds thành chuỗi thời gian MM:SS hoặc HH:MM:SS.
   * @param {number} ms - Thời gian tính bằng milliseconds.
   * @returns {string} - Chuỗi thời gian đã định dạng.
   */
  formatMilliseconds(ms) {
    // ... (logic giữ nguyên)
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

  /**
   * Trích xuất transcript từ dữ liệu JSON
   * @param {Object} transcriptData - Dữ liệu transcript dạng JSON
   * @param {boolean} includeTimestamps - Có bao gồm timestamp không
   * @returns {string|null} - Transcript đã xử lý hoặc null nếu không thành công
   */
  processTranscriptData(transcriptData, includeTimestamps) {
    // ... (logic giữ nguyên)
    if (!transcriptData || !transcriptData.events) {
      console.error('Invalid json3 format received or no events found.')
      return null
    }

    if (includeTimestamps) {
      // Xử lý transcript có timestamp
      const transcriptLines = transcriptData.events
        .filter((event) => event.segs && event.tStartMs !== undefined) // Chỉ lấy event có text và thời gian
        .map((event) => {
          const startTime = this.formatMilliseconds(event.tStartMs)
          const text = this.cleanTranscriptText(
            event.segs.map((seg) => seg.utf8).join(' ')
          )

          return text.length > 0 ? `[${startTime}] ${text}` : null
        })
        .filter((line) => line !== null) // Loại bỏ các dòng rỗng

      if (transcriptLines.length === 0) {
        console.log(
          'Transcript events found, but no valid text content could be extracted.'
        )
        return null
      }

      return transcriptLines.join('\n')
    } else {
      // Xử lý transcript không có timestamp
      const fullTranscript = transcriptData.events
        .map((event) => event.segs?.map((seg) => seg.utf8)?.join(' ') || '')
        .join(' ')

      return this.cleanTranscriptText(fullTranscript)
    }
  }

  /**
   * Hàm chính để lấy transcript từ YouTube
   * @param {string} preferredLang - Mã ngôn ngữ ưa thích
   * @param {boolean} includeTimestamps - Có bao gồm timestamp không
   * @returns {Promise<string|null>} - Transcript hoặc null nếu không thành công
   */
  async getTranscript(
    preferredLang = this.defaultLang,
    includeTimestamps = false
  ) {
    // ... (logic giữ nguyên)
    const logType = includeTimestamps ? 'timestamped transcript' : 'transcript'
    console.log(`Attempting to get ${logType} for language: ${preferredLang}`)

    try {
      // Bước 1: Lấy playerResponse
      const playerResponse = await this.getPlayerResponse()
      if (!playerResponse) {
        console.error('Failed to get playerResponse after all attempts.')
        return null
      }

      // Bước 2: Lấy captionTracks
      const captionTracks =
        playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks

      // Bước 3: Chọn caption track tốt nhất
      const { baseUrl, needsTlang, trackInfo } = this.selectBestCaptionTrack(
        captionTracks,
        preferredLang
      )

      if (!baseUrl) {
        console.error('Could not find any suitable caption track baseUrl.')
        return null
      }

      // Log thông tin về track được chọn
      console.log(
        `Selected track: ${trackInfo.name} (Code: ${trackInfo.languageCode})${
          trackInfo.isAutoGenerated ? ' (auto-generated)' : ''
        }`
      )
      if (needsTlang) {
        console.log(`Will add &tlang=${preferredLang} to fetch URL.`)
      }

      // Bước 4: Tạo URL và fetch transcript
      const transcriptUrl =
        baseUrl + '&fmt=json3' + (needsTlang ? `&tlang=${preferredLang}` : '')
      console.log(`Workspaceing ${logType} from: ${transcriptUrl}`)

      const response = await fetch(transcriptUrl)
      if (!response.ok) {
        console.error(
          `Failed to fetch transcript json3. Status: ${response.status}`
        )
        return null
      }

      const transcriptData = await response.json()

      // Bước 5: Xử lý và trả về transcript
      const result = this.processTranscriptData(
        transcriptData,
        includeTimestamps
      )

      if (result) {
        console.log(`${logType} extracted and processed successfully.`)
        return result
      }

      console.error(
        'Processing transcript data returned null (possibly no valid text).'
      )
      return null
    } catch (error) {
      console.error(
        `An unexpected error occurred in getTranscript(withTimestamp=${includeTimestamps}):`,
        error
      )
      return null
    }
  }

  /**
   * Wrapper để lấy transcript không có timestamp
   * @param {string} preferredLang - Mã ngôn ngữ ưa thích
   * @returns {Promise<string|null>} - Transcript hoặc null nếu không thành công
   */
  async getPlainTranscript(preferredLang = this.defaultLang) {
    return this.getTranscript(preferredLang, false)
  }

  /**
   * Wrapper để lấy transcript có timestamp
   * @param {string} preferredLang - Mã ngôn ngữ ưa thích
   * @returns {Promise<string|null>} - Transcript có timestamp hoặc null nếu không thành công
   */
  async getTimestampedTranscript(preferredLang = this.defaultLang) {
    return this.getTranscript(preferredLang, true)
  }
}

// Khởi tạo extractor
const transcriptExtractor = new YouTubeTranscriptExtractor('vi')

// Lắng nghe yêu cầu từ Popup (App.svelte)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Xử lý các yêu cầu từ extension
  const handleRequest = async () => {
    switch (request.action) {
      case 'fetchTranscript':
        console.log('Content script received fetchTranscript request', request) // Log request
        try {
          // Sử dụng request.lang nếu có, ngược lại dùng defaultLang của instance ('vi')
          const lang = request.lang || transcriptExtractor.defaultLang
          const transcript = await transcriptExtractor.getPlainTranscript(lang)
          if (transcript) {
            console.log('Transcript fetched successfully')
            sendResponse({ success: true, transcript })
          } else {
            console.log('Failed to get transcript, sending error response')
            sendResponse({ success: false, error: 'Failed to get transcript.' })
          }
        } catch (error) {
          console.error('Error handling fetchTranscript message:', error)
          sendResponse({ success: false, error: error.message })
        }
        break

      case 'fetchTranscriptWithTimestamp':
        console.log(
          'Content script received fetchTranscriptWithTimestamp request',
          request
        ) // Log request
        try {
          // Sử dụng request.lang nếu có, ngược lại dùng defaultLang của instance ('vi')
          const lang = request.lang || transcriptExtractor.defaultLang
          const transcript = await transcriptExtractor.getTimestampedTranscript(
            lang
          )
          if (transcript) {
            console.log('Timestamped transcript fetched successfully')
            sendResponse({ success: true, transcript })
          } else {
            console.log(
              'Failed to get timestamped transcript, sending error response'
            )
            sendResponse({
              success: false,
              error: 'Failed to get timestamped transcript.',
            })
          }
        } catch (error) {
          console.error(
            'Error handling fetchTranscriptWithTimestamp message:',
            error
          )
          sendResponse({ success: false, error: error.message })
        }
        break

      case 'pingYouTubeScript':
        console.log('Content script received ping request, responding.')
        sendResponse({ success: true, message: 'pong' })
        break

      default:
        console.log(`Unknown action: ${request.action}`)
        sendResponse({
          success: false,
          error: `Unknown action: ${request.action}`,
        })
    }
  }

  handleRequest()
  return true // Indicate that sendResponse will be called asynchronously
})

console.log('YouTube Transcript Content Script ready for use.')
