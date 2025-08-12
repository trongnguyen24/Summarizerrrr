// @ts-nocheck
export class YouTubeTranscriptExtractor {
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
      // Đóng biểu ngữ cookie
      document.querySelector('button[aria-label*=cookies]')?.click()

      // Chờ nút 'Show transcript' xuất hiện và nhấp vào nó
      await new Promise((resolve) => {
        const checkButton = () => {
          const button = document.querySelector(
            'ytd-video-description-transcript-section-renderer button'
          )
          if (button) {
            button.click()
            resolve()
          } else {
            setTimeout(checkButton, 500)
          }
        }
        checkButton()
      })

      // Chờ vùng chứa bản ghi xuất hiện
      await new Promise((resolve) => {
        const checkContainer = () => {
          const container = document.querySelector('#segments-container')
          if (container) {
            resolve()
          } else {
            setTimeout(checkContainer, 500)
          }
        }
        checkContainer()
      })

      // Phân tích tất cả các nút văn bản từ vùng chứa bản ghi và nối chúng bằng một dòng trống
      const transcriptText = Array.from(
        document.querySelectorAll('#segments-container')
      )
        .map((element) => element.textContent?.trim())
        .join('\n')

      return { transcript: transcriptText }
    } catch (error) {
      console.error(
        '[YouTubeTranscriptExtractor] Error while interacting with DOM to get transcript:',
        error
      )
      return null
    }
  }

  /**
   * Làm sạch text từ transcript
   * @param {string} text - Text cần làm sạch
   * @returns {string} - Text đã làm sạch
   */
  cleanTranscriptText(text) {
    return text
      .replace(/\n/g, ' ')
      .replace(/♪|'|"|\.\{2,\}|\<[\s\S]*?\>|\{[\s\S]*?\}|\[[\s\S]*?\]/g, '')
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
   * Hàm chính để lấy transcript từ YouTube
   * @param {string} preferredLang - Mã ngôn ngữ ưa thích
   * @param {boolean} includeTimestamps - Có bao gồm timestamp không
   * @returns {Promise<string|null>} - Transcript hoặc null nếu không thành công
   */
  async getTranscript(
    preferredLang = this.defaultLang,
    includeTimestamps = false
  ) {
    const logType = includeTimestamps ? 'timestamped transcript' : 'transcript'
    console.log(
      `[YouTubeTranscriptExtractor] Attempting to get ${logType} for language: ${preferredLang} using DOM interaction.`
    )

    try {
      const domResult = await this.getPlayerResponse()

      if (domResult && domResult.transcript) {
        console.log(
          `[YouTubeTranscriptExtractor] ${logType} extracted and processed successfully from DOM.`
        )
        if (includeTimestamps) {
          console.log(
            '[YouTubeTranscriptExtractor] Timestamped transcript requested, but DOM interaction currently only provides plain text. Returning plain text.'
          )
        }
        return domResult.transcript
      } else {
        console.error(
          '[YouTubeTranscriptExtractor] Failed to get transcript from DOM interaction.'
        )
        return null
      }
    } catch (error) {
      console.error(
        `[YouTubeTranscriptExtractor] An unexpected error occurred in getTranscript(withTimestamp=${includeTimestamps}):`,
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
