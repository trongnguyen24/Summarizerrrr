/**
 * Lấy transcript (phụ đề) từ trang xem video YouTube hiện tại bằng cách
 * phân tích dữ liệu nhúng trong trang (ytInitialPlayerResponse) và sử dụng API json3.
 *
 * @param {string} [preferredLang='vi'] - Mã ngôn ngữ ưu tiên (ví dụ: 'vi', 'en').
 * @returns {Promise<string|null>} - Một Promise giải quyết với chuỗi transcript hoàn chỉnh
 *                                   hoặc null nếu không tìm thấy hoặc có lỗi.
 */
console.log('Content script youtubetranscript.js đã được tiêm vào tab.') // Xác nhận inject

async function getYouTubeTranscript(preferredLang = 'vi') {
  console.log(
    'Attempting to get transcript using json3 for language:',
    preferredLang
  )

  try {
    // --- Bước 1: Tìm và Parse ytInitialPlayerResponse ---
    let playerResponse
    try {
      // Cách lấy ytInitialPlayerResponse ngắn gọn hơn, nhưng có thể kém ổn định
      const responseText = await fetch(window.location.href).then((res) =>
        res.text()
      )
      const playerResponseText = responseText
        .split('ytInitialPlayerResponse = ')[1]
        ?.split(';var')[0]
      if (!playerResponseText) {
        console.error(
          'Could not extract ytInitialPlayerResponse string using split method.'
        )
        // Fallback về phương pháp tìm script tag (an toàn hơn)
        const scripts = document.querySelectorAll('script')
        const playerResponseScript = Array.from(scripts).find((script) =>
          script.textContent.includes('var ytInitialPlayerResponse = {')
        )
        if (!playerResponseScript) {
          console.error('Could not find ytInitialPlayerResponse script tag.')
          if (window.ytInitialPlayerResponse) {
            console.log('Found ytInitialPlayerResponse in window object.')
            playerResponse = window.ytInitialPlayerResponse
          } else {
            console.error('ytInitialPlayerResponse not found in window either.')
            return null
          }
        } else {
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
          if (objectEnd === -1) {
            objectEnd = scriptContent.lastIndexOf(
              '}',
              scriptContent.indexOf('</script>', objectStart)
            )
            if (objectEnd !== -1) objectEnd += 1
          }

          if (
            objectStart === -1 ||
            objectEnd === -1 ||
            objectEnd <= objectStart
          ) {
            console.error(
              'Could not accurately determine JSON boundaries from script tag.'
            )
            return null
          }
          const jsonString = scriptContent.substring(objectStart, objectEnd)
          playerResponse = JSON.parse(jsonString)
        }
      } else {
        playerResponse = JSON.parse(playerResponseText)
      }
    } catch (e) {
      console.error('Error finding or parsing ytInitialPlayerResponse:', e)
      return null
    }

    if (!playerResponse) {
      console.error('Failed to obtain playerResponse object.')
      return null
    }

    // --- Bước 2: Tìm captionTracks ---
    const captionTracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks

    if (!captionTracks || captionTracks.length === 0) {
      console.log('No caption tracks found in playerResponse.')
      return null // Không có phụ đề nào
    }
    console.log(`Found ${captionTracks.length} caption tracks.`)

    // --- Bước 3: Chọn Track URL theo logic mới ---
    const findCaptionUrl = (vssIdPrefix) =>
      captionTracks.find((track) => track.vssId?.startsWith(vssIdPrefix))
        ?.baseUrl

    const langVssId = '.' + preferredLang // e.g., ".en", ".vi"
    const autoVssId = 'a.' + preferredLang // e.g., "a.en", "a.vi"

    let baseUrl = findCaptionUrl(langVssId) // Ưu tiên ngôn ngữ chỉ định (vd: .en)
    let needsTlang = false

    if (!baseUrl) {
      console.log(
        `No exact match for ${preferredLang} (${langVssId}). Trying fallbacks.`
      )
      baseUrl =
        findCaptionUrl('.') || // Thử bất kỳ ngôn ngữ nào không phải auto-gen (vd: .)
        findCaptionUrl(autoVssId) || // Thử auto-gen của ngôn ngữ chỉ định (vd: a.en)
        captionTracks[0]?.baseUrl // Lấy track đầu tiên nếu không có gì khác
      // Nếu dùng fallback mà không phải là auto-gen của ngôn ngữ mong muốn, cần thêm tlang
      if (baseUrl && !findCaptionUrl(autoVssId)) {
        needsTlang = true
      }
    }

    if (!baseUrl) {
      console.error('Could not find any suitable caption track baseUrl.')
      return null
    }

    const transcriptUrl =
      baseUrl + '&fmt=json3' + (needsTlang ? `&tlang=${preferredLang}` : '')

    // Ghi log track được chọn
    const selectedTrack = captionTracks.find(
      (track) => track.baseUrl === baseUrl.split('&fmt=json3')[0]
    ) // Tìm lại track từ baseUrl gốc
    console.log(
      `Selected track: ${
        selectedTrack?.name?.simpleText ||
        selectedTrack?.languageCode ||
        'Unknown'
      }${
        selectedTrack?.kind === 'asr' ? ' (auto-generated)' : ''
      }, URL: ${transcriptUrl}`
    )

    // --- Bước 4: Fetch và Parse JSON3 ---
    console.log('Fetching transcript from:', transcriptUrl)
    const response = await fetch(transcriptUrl)
    if (!response.ok) {
      console.error(
        `Failed to fetch transcript json3. Status: ${response.status}`
      )
      // Có thể thử fallback về XML ở đây nếu muốn, nhưng logic mới chỉ dùng json3
      return null
    }

    const transcriptData = await response.json()

    // --- Bước 5: Trích xuất và làm sạch Text ---
    if (!transcriptData || !transcriptData.events) {
      console.error('Invalid json3 format received or no events found.')
      return null
    }

    const fullTranscript = transcriptData.events
      .map((event) => {
        // event.segs là một mảng các đoạn text trong một khoảng thời gian
        // Nối các đoạn text lại (nếu có)
        return event.segs?.map((seg) => seg.utf8)?.join(' ') || ''
      })
      .join(' ') // Nối các dòng sự kiện lại với nhau bằng khoảng trắng
      // Làm sạch: loại bỏ newline, ký hiệu nhạc, dấu nháy, dấu chấm lặp lại, thẻ html/xml, nội dung trong {} hoặc []
      .replace(/\n/g, ' ') // Thay thế newline bằng khoảng trắng
      .replace(/♪|'|"|\.{2,}|\<[\s\S]*?\>|\{[\s\S]*?\}|\[[\s\S]*?\]/g, '') // Loại bỏ các ký tự/mẫu không mong muốn
      .replace(/\s+/g, ' ') // Chuẩn hóa khoảng trắng
      .trim() // Cắt khoảng trắng thừa ở đầu/cuối

    console.log('Transcript extracted and cleaned successfully via json3.')
    return fullTranscript // Đã trim và chuẩn hóa khoảng trắng
  } catch (error) {
    console.error(
      'An unexpected error occurred in getYouTubeTranscript:',
      error
    )
    return null // Trả về null nếu có lỗi không mong muốn
  }
}

/**
 * Định dạng milliseconds thành chuỗi thời gian MM:SS hoặc HH:MM:SS.
 * @param {number} ms - Thời gian tính bằng milliseconds.
 * @returns {string} - Chuỗi thời gian đã định dạng.
 */
function formatMilliseconds(ms) {
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
 * Lấy transcript KÈM THỜI GIAN từ trang xem video YouTube hiện tại
 * bằng cách sử dụng API nội bộ (không tương tác DOM).
 *
 * @param {string} [preferredLang='vi'] - Mã ngôn ngữ ưu tiên (ví dụ: 'vi', 'en').
 * @returns {Promise<string|null>} - Một Promise giải quyết với chuỗi transcript
 *                                   có thời gian hoặc null nếu có lỗi.
 */
async function getYouTubeTranscriptWithTimestampFromAPI(preferredLang = 'vi') {
  console.log(
    'Attempting to get timestamped transcript using API for language:',
    preferredLang
  )

  try {
    // --- Bước 1: Tìm và Parse ytInitialPlayerResponse (giống getYouTubeTranscript) ---
    let playerResponse
    try {
      const responseText = await fetch(window.location.href).then((res) =>
        res.text()
      )
      const playerResponseText = responseText
        .split('ytInitialPlayerResponse = ')[1]
        ?.split(';var')[0]
      if (!playerResponseText) {
        console.error(
          'Could not extract ytInitialPlayerResponse string using split method.'
        )
        const scripts = document.querySelectorAll('script')
        const playerResponseScript = Array.from(scripts).find((script) =>
          script.textContent.includes('var ytInitialPlayerResponse = {')
        )
        if (!playerResponseScript) {
          console.error('Could not find ytInitialPlayerResponse script tag.')
          if (window.ytInitialPlayerResponse) {
            console.log('Found ytInitialPlayerResponse in window object.')
            playerResponse = window.ytInitialPlayerResponse
          } else {
            console.error('ytInitialPlayerResponse not found in window either.')
            return null
          }
        } else {
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
          if (objectEnd === -1) {
            objectEnd = scriptContent.lastIndexOf(
              '}',
              scriptContent.indexOf('</script>', objectStart)
            )
            if (objectEnd !== -1) objectEnd += 1
          }
          if (
            objectStart === -1 ||
            objectEnd === -1 ||
            objectEnd <= objectStart
          ) {
            console.error(
              'Could not accurately determine JSON boundaries from script tag.'
            )
            return null
          }
          const jsonString = scriptContent.substring(objectStart, objectEnd)
          playerResponse = JSON.parse(jsonString)
        }
      } else {
        playerResponse = JSON.parse(playerResponseText)
      }
    } catch (e) {
      console.error('Error finding or parsing ytInitialPlayerResponse:', e)
      return null
    }

    if (!playerResponse) {
      console.error('Failed to obtain playerResponse object.')
      return null
    }

    // --- Bước 2: Tìm captionTracks (giống getYouTubeTranscript) ---
    const captionTracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks

    if (!captionTracks || captionTracks.length === 0) {
      console.log('No caption tracks found in playerResponse.')
      return null
    }
    console.log(`Found ${captionTracks.length} caption tracks.`)

    // --- Bước 3: Chọn Track URL (giống getYouTubeTranscript) ---
    const findCaptionUrl = (vssIdPrefix) =>
      captionTracks.find((track) => track.vssId?.startsWith(vssIdPrefix))
        ?.baseUrl

    const langVssId = '.' + preferredLang
    const autoVssId = 'a.' + preferredLang

    let baseUrl = findCaptionUrl(langVssId)
    let needsTlang = false

    if (!baseUrl) {
      console.log(
        `No exact match for ${preferredLang} (${langVssId}). Trying fallbacks.`
      )
      baseUrl =
        findCaptionUrl('.') ||
        findCaptionUrl(autoVssId) ||
        captionTracks[0]?.baseUrl
      if (baseUrl && !findCaptionUrl(autoVssId)) {
        needsTlang = true
      }
    }

    if (!baseUrl) {
      console.error('Could not find any suitable caption track baseUrl.')
      return null
    }

    const transcriptUrl =
      baseUrl + '&fmt=json3' + (needsTlang ? `&tlang=${preferredLang}` : '')

    const selectedTrack = captionTracks.find(
      (track) => track.baseUrl === baseUrl.split('&fmt=json3')[0]
    )
    console.log(
      `Selected track: ${
        selectedTrack?.name?.simpleText ||
        selectedTrack?.languageCode ||
        'Unknown'
      }${
        selectedTrack?.kind === 'asr' ? ' (auto-generated)' : ''
      }, URL: ${transcriptUrl}`
    )

    // --- Bước 4: Fetch và Parse JSON3 (giống getYouTubeTranscript) ---
    console.log('Fetching timestamped transcript from:', transcriptUrl)
    const response = await fetch(transcriptUrl)
    if (!response.ok) {
      console.error(
        `Failed to fetch transcript json3. Status: ${response.status}`
      )
      return null
    }
    const transcriptData = await response.json()

    // --- Bước 5: Trích xuất THỜI GIAN và Text --- *KHÁC BIỆT Ở ĐÂY*
    if (!transcriptData || !transcriptData.events) {
      console.error('Invalid json3 format received or no events found.')
      return null
    }

    const transcriptLines = transcriptData.events
      .filter((event) => event.segs && event.tStartMs !== undefined) // Chỉ lấy event có text và thời gian bắt đầu
      .map((event) => {
        const startTime = formatMilliseconds(event.tStartMs) // Định dạng thời gian
        const text = event.segs
          .map((seg) => seg.utf8)
          .join(' ')
          .replace(/\n/g, ' ') // Thay thế newline bằng khoảng trắng trong một dòng
          .replace(/♪|'|"|\.{2,}|\<[\s\S]*?\>|\{[\s\S]*?\}|\[[\s\S]*?\]/g, '') // Loại bỏ ký tự không mong muốn
          .replace(/\s+/g, ' ') // Chuẩn hóa khoảng trắng
          .trim() // Cắt khoảng trắng thừa

        return text.length > 0 ? `[${startTime}] ${text}` : null // Chỉ trả về dòng nếu có text
      })
      .filter((line) => line !== null) // Loại bỏ các dòng null (không có text sau khi làm sạch)

    if (transcriptLines.length === 0) {
      console.log(
        'Transcript events found, but no valid text content could be extracted.'
      )
      return null // Không có nội dung hợp lệ
    }

    const fullTranscriptWithTime = transcriptLines.join('\n') // Nối các dòng bằng ký tự xuống dòng

    console.log(
      'Timestamped transcript extracted and formatted successfully via API.'
    )
    return fullTranscriptWithTime
  } catch (error) {
    console.error(
      'An unexpected error occurred in getYouTubeTranscriptWithTimestampFromAPI:',
      error
    )
    return null
  }
}

// Lắng nghe yêu cầu từ Popup (App.svelte)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Hàm sendResponse cần được gọi bất đồng bộ nếu xử lý bất đồng bộ
  const handleResponse = async () => {
    if (request.action === 'fetchTranscript') {
      console.log('Content script received fetchTranscript request')
      try {
        const transcript = await getYouTubeTranscript(request.lang || 'en')
        if (transcript) {
          console.log(
            'Transcript fetched, sending response (first 100 chars):',
            transcript.substring(0, 100) + '...'
          )
          sendResponse({ success: true, transcript: transcript })
        } else {
          console.log('Failed to get transcript, sending error response')
          sendResponse({ success: false, error: 'Failed to get transcript.' })
        }
      } catch (error) {
        console.error('Error handling fetchTranscript message:', error)
        sendResponse({ success: false, error: error.message })
      }
    } else if (request.action === 'fetchTranscriptWithTimestamp') {
      console.log(
        'Content script received fetchTranscriptWithTimestamp request'
      )
      try {
        const transcript = await getYouTubeTranscriptWithTimestampFromAPI(
          request.lang || 'en'
        )
        if (transcript) {
          console.log(
            'Timestamped transcript fetched (API), sending response (first 100 chars):',
            transcript.substring(0, 100) + '...'
          )
          sendResponse({ success: true, transcript: transcript })
        } else {
          console.log(
            'Failed to get timestamped transcript (API), sending error response'
          )
          sendResponse({
            success: false,
            error: 'Failed to get timestamped transcript using API.',
          })
        }
      } catch (error) {
        console.error(
          'Error handling fetchTranscriptWithTimestamp message (API):',
          error
        )
        sendResponse({ success: false, error: error.message })
      }
    } else if (request.action === 'pingYouTubeScript') {
      // Handle ping request - just respond to indicate script is alive
      console.log('Content script received ping request, responding.')
      sendResponse({ success: true, message: 'pong' })
    }
  }

  handleResponse() // Call the async handler
  return true // Indicate that sendResponse will be called asynchronously
})

console.log('YouTube Transcript Content Script Loaded.') // Để xác nhận script đã load

// Removed old DOM-based function getTranscriptWithTimestamp
