export default defineContentScript({
  matches: ['*://*.youtube.com/watch*'],
  main() {
    console.log('YouTube Transcript Content Script ready for use.')
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

          // Cách 2: Tìm trong script tags (backup) - Logic giữ nguyên từ đoạn code đầu tiên
          const scripts = document.querySelectorAll('script')
          const playerResponseScript = Array.from(scripts).find((script) =>
            script.textContent.includes('var ytInitialPlayerResponse = {')
          )

          if (playerResponseScript) {
            const scriptContent = playerResponseScript.textContent
            const jsonStart = scriptContent.indexOf(
              'ytInitialPlayerResponse = {'
            )
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

            if (
              objectStart !== -1 &&
              objectEnd !== -1 &&
              objectEnd > objectStart
            ) {
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
            // Continue to next method
          }

          // Cách 3: Kiểm tra window object (fallback cuối cùng trước khi thêm cách mới)
          if (window.ytInitialPlayerResponse) {
            console.log(
              'Method 3 successful: Found ytInitialPlayerResponse in window object.'
            )
            return window.ytInitialPlayerResponse
          }

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

                if (
                  playerResponseMatchMethod4 &&
                  playerResponseMatchMethod4[1]
                ) {
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
          console.error(
            'An unexpected error occurred in getPlayerResponse:',
            error
          )
          return null
        }
      }

      /**
       * Tìm và chọn caption track tốt nhất dựa trên ngôn ngữ ưa thích
       * @param {Array} captionTracks - Danh sách các caption tracks có sẵn
       * @returns {Object} - Thông tin về track được chọn và URL của nó
       */
      selectBestCaptionTrack(captionTracks) {
        if (!captionTracks || captionTracks.length === 0) {
          console.log('No caption tracks found.')
          return { baseUrl: null, trackInfo: null }
        }

        console.log(`Found ${captionTracks.length} caption tracks.`)

        const findCaptionUrl = (vssIdPrefix) =>
          captionTracks.find((track) => track.vssId?.startsWith(vssIdPrefix))
            ?.baseUrl

        let baseUrl =
          findCaptionUrl('.en') ||
          findCaptionUrl('a.en') ||
          findCaptionUrl('a.') ||
          findCaptionUrl('.') ||
          captionTracks[0]?.baseUrl

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
        }

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
              languageCode: selectedTrackInfo.languageCode,
            }
          : null

        return { baseUrl, trackInfo }
      }

      /**
       * Làm sạch text từ transcript
       * @param {string} text - Text cần làm sạch
       * @returns {string} - Text đã làm sạch
       */
      cleanTranscriptText(text) {
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
        if (!transcriptData || !transcriptData.events) {
          console.error('Invalid json3 format received or no events found.')
          return null
        }

        if (includeTimestamps) {
          const transcriptLines = transcriptData.events
            .filter((event) => event.segs && event.tStartMs !== undefined)
            .map((event) => {
              const startTime = this.formatMilliseconds(event.tStartMs)
              const text = this.cleanTranscriptText(
                event.segs.map((seg) => seg.utf8).join(' ')
              )

              return text.length > 0 ? `[${startTime}] ${text}` : null
            })
            .filter((line) => line !== null)

          if (transcriptLines.length === 0) {
            console.log(
              'Transcript events found, but no valid text content could be extracted.'
            )
            return null
          }

          return transcriptLines.join('\n')
        } else {
          const fullTranscript = transcriptData.events
            .map((event) => event.segs?.map((seg) => seg.utf8)?.join(' ') || '')
            .join(' ')

          return this.cleanTranscriptText(fullTranscript)
        }
      }

      /**
       * Lấy bản ghi từ DOM như một cách dự phòng.
       * @returns {Promise<string|null>} - Bản ghi đã xử lý hoặc null nếu không thành công.
       */
      async getTranscriptFromDOM() {
        console.log('Chuyển sang Cách 2: Lấy bản ghi từ DOM.')

        // Hàm Sa() - Kiểm tra và mở phần bản ghi
        async function checkAndShowTranscriptDOM() {
          if (
            document.getElementsByTagName('ytd-transcript-segment-renderer')
              .length > 1
          ) {
            console.log('Bản ghi đã hiển thị (DOM).')
            return 'ok'
          }
          const transcriptSectionRenderers = document.getElementsByTagName(
            'ytd-video-description-transcript-section-renderer'
          )
          if (transcriptSectionRenderers.length === 0) {
            // Thử tìm nút "..." menu rồi click "Show transcript"
            const menuRenderer = document.querySelector(
              'ytd-menu-renderer.ytd-watch-metadata > div > button#button.ytd-menu-renderer, ytd-menu-renderer.ytd-watch-metadata > yt-button-shape > button#button'
            ) // Cập nhật selector
            if (menuRenderer) {
              console.log('Tìm thấy nút menu, đang nhấp...')
              menuRenderer.click()
              await new Promise((resolve) => setTimeout(resolve, 500)) // Chờ menu mở

              const showTranscriptButton = Array.from(
                document.querySelectorAll(
                  'tp-yt-paper-item.ytd-menu-service-item-renderer, ytd-menu-service-item-renderer'
                )
              ) // Cập nhật selector
                .find((el) => {
                  const textContent = el.textContent?.trim().toLowerCase()
                  return (
                    textContent?.includes('show transcript') ||
                    textContent?.includes('hiện bản chép lời')
                  )
                })
              if (showTranscriptButton) {
                console.log(
                  "Tìm thấy nút 'Show transcript' trong menu, đang nhấp..."
                )
                showTranscriptButton.click()
                return 'waiting_after_menu_click'
              }
              console.log("Không tìm thấy nút 'Show transcript' trong menu.")
              return 'error_no_transcript_button_in_menu'
            }
            console.log(
              'Không tìm thấy khu vực bản ghi (ytd-video-description-transcript-section-renderer) hoặc nút menu.'
            )
            return 'error_no_transcript_section_or_menu'
          }
          let transcriptOpened = false
          for (const section of Array.from(transcriptSectionRenderers)) {
            const button = section.querySelector('button')
            if (button && button.click) {
              console.log('Tìm thấy nút hiển thị bản ghi, đang nhấp...')
              button.click()
              transcriptOpened = true
              break
            }
          }
          return transcriptOpened
            ? 'waiting_after_button_click'
            : 'error_no_button_to_open_transcript'
        }

        // Hàm Ea() - Trích xuất bản ghi từ các đoạn
        async function extractTranscriptSegmentsDOM() {
          const segments = document.getElementsByTagName(
            'ytd-transcript-segment-renderer'
          )
          if (segments.length > 0) {
            // Chỉ cần >0 vì có thể chỉ có 1 segment nếu video rất ngắn
            console.log(
              'Đang trích xuất từ ' + segments.length + ' đoạn bản ghi.'
            )
            const transcriptContainer = segments[0].closest(
              'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]'
            ) // Selector chính xác hơn
            if (transcriptContainer) {
              const toggleButton = transcriptContainer.querySelector(
                '#primary-button button[aria-pressed="true"], yt-button-shape[aria-pressed="true"] button'
              ) // Cập nhật selector
              if (toggleButton) {
                const buttonText =
                  toggleButton.textContent?.trim().toLowerCase() ||
                  toggleButton.getAttribute('aria-label')?.trim().toLowerCase()
                if (
                  buttonText &&
                  (buttonText.includes('timestamps') ||
                    buttonText.includes('dấu thời gian'))
                ) {
                  console.log('Đang tắt Dấu thời gian...')
                  toggleButton.click()
                  await new Promise((resolve) => setTimeout(resolve, 500)) // Chờ DOM cập nhật
                }
              }
            }
            // Lấy lại các segment sau khi có thể đã tắt dấu thời gian
            const updatedSegments = document.getElementsByTagName(
              'ytd-transcript-segment-renderer'
            )
            return Array.from(updatedSegments)
              .map((segment) => {
                const textElement = segment.querySelector(
                  '.segment-text, .ytd-transcript-segment-renderer'
                ) // Cập nhật selector, lấy textContent của chính segment nếu .segment-text không có
                return textElement ? textElement.textContent.trim() : ''
              })
              .filter((text) => text.length > 0)
              .join('\n')
          }
          console.log(
            'Không tìm thấy (hoặc không đủ) ytd-transcript-segment-renderer.'
          )
          return null
        }

        let status = await checkAndShowTranscriptDOM()
        console.log('Trạng thái mở bản ghi (DOM):', status)

        if (status.startsWith('error')) {
          console.error('Cách 2 thất bại (Không thể mở bản ghi DOM):', status)
          return null
        }

        if (status.startsWith('waiting')) {
          console.log('Đang chờ bản ghi tải (DOM)...')
          await new Promise((resolve) => setTimeout(resolve, 3000)) // Tăng thời gian chờ
        }

        // Thử lại kiểm tra sau khi chờ
        if (
          document.getElementsByTagName('ytd-transcript-segment-renderer')
            .length <= 1 &&
          (status.startsWith('waiting_after_button_click') ||
            status.startsWith('waiting_after_menu_click'))
        ) {
          console.log('Bản ghi vẫn chưa tải đủ, chờ thêm...')
          await new Promise((resolve) => setTimeout(resolve, 3000)) // Chờ thêm
        }

        const transcriptText = await extractTranscriptSegmentsDOM()

        if (transcriptText && transcriptText.trim().length > 0) {
          console.log('--- BẢN GHI (Từ DOM) ---')
          console.log(transcriptText)
          return transcriptText
        } else {
          console.error(
            'Cách 2 thất bại (Không thể trích xuất bản ghi từ DOM).'
          )
          return null
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
        const logType = includeTimestamps
          ? 'timestamped transcript'
          : 'transcript'
        console.log(
          `Attempting to get ${logType} for language: ${preferredLang}`
        )

        try {
          const playerResponse = await this.getPlayerResponse()
          if (!playerResponse) {
            console.error('Failed to get playerResponse after all attempts.')
            return null
          }

          const captionTracks =
            playerResponse?.captions?.playerCaptionsTracklistRenderer
              ?.captionTracks

          const { baseUrl, trackInfo } =
            this.selectBestCaptionTrack(captionTracks)

          if (!baseUrl) {
            console.error(
              'Could not find any suitable caption track baseUrl. Attempting to get transcript from DOM as fallback.'
            )
            const domTranscript = await this.getTranscriptFromDOM()
            if (domTranscript) {
              return domTranscript
            }
            return null
          }

          console.log(
            `Selected track: ${trackInfo.name} (Code: ${
              trackInfo.languageCode
            })${trackInfo.isAutoGenerated ? ' (auto-generated)' : ''}`
          )

          const transcriptUrl = baseUrl + '&fmt=json3'
          console.log(`Fetching ${logType} from: ${transcriptUrl}`)

          const response = await fetch(transcriptUrl)
          if (!response.ok) {
            console.error(
              `Failed to fetch transcript json3. Status: ${response.status}`
            )
            return null
          }

          const transcriptData = await response.json()

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

    const transcriptExtractor = new YouTubeTranscriptExtractor('vi')

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const handleRequest = async () => {
        switch (request.action) {
          case 'fetchTranscript':
            console.log(
              'Content script received fetchTranscript request',
              request
            )
            try {
              const lang = request.lang || transcriptExtractor.defaultLang
              const transcript = await transcriptExtractor.getPlainTranscript(
                lang
              )
              if (transcript) {
                console.log('Transcript fetched successfully')
                sendResponse({ success: true, transcript })
              } else {
                console.log('Failed to get transcript, sending error response')
                sendResponse({
                  success: false,
                  error: 'Failed to get transcript.',
                })
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
            )
            try {
              const lang = request.lang || transcriptExtractor.defaultLang
              const transcript =
                await transcriptExtractor.getTimestampedTranscript(lang)
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
      return true
    })
  },
})
