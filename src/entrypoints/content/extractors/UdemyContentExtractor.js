// @ts-nocheck
export class UdemyContentExtractor {
  constructor(defaultLang = 'en') {
    this.defaultLang = defaultLang
  }

  /**
   * Chờ một phần tử DOM xuất hiện.
   * @param {string} selector - Bộ chọn CSS của phần tử.
   * @param {number} timeout - Thời gian chờ tối đa bằng milliseconds.
   * @returns {Promise<Element|null>} - Phần tử hoặc null nếu hết thời gian chờ.
   */
  async waitForElement(selector, timeout = 15000, interval = 500) {
    const startTime = Date.now()
    return new Promise((resolve) => {
      const check = () => {
        const element = document.querySelector(selector)
        if (element) {
          resolve(element)
        } else if (Date.now() - startTime > timeout) {
          resolve(null)
        } else {
          setTimeout(check, interval)
        }
      }
      check()
    })
  }

  async getTranscriptFromDOM() {
    try {
      // Chờ nút 'Transcript' xuất hiện và nhấp vào nó nếu panel chưa mở
      const transcriptButton = await this.waitForElement(
        'button[data-purpose="transcript-toggle"]'
      )
      if (!transcriptButton) {
        console.error(
          '[UdemyContentExtractor] Transcript button not found after waiting.'
        )
        return null
      }

      const isExpanded =
        transcriptButton.getAttribute('aria-expanded') === 'true'
      if (!isExpanded) {
        transcriptButton.click()
        console.log(
          '[UdemyContentExtractor] Clicked transcript button to expand panel.'
        )
        // Thêm một độ trễ nhỏ sau khi nhấp để panel có thời gian mở
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // Chờ vùng chứa bản ghi xuất hiện
      const transcriptContainer = await this.waitForElement(
        'div[data-purpose="transcript-panel"]'
      )
      if (!transcriptContainer) {
        console.error(
          '[UdemyContentExtractor] Transcript panel container not found after waiting.'
        )
        return null
      }

      // Phân tích tất cả các đoạn văn bản từ vùng chứa bản ghi
      const transcriptText = Array.from(
        transcriptContainer.querySelectorAll(
          '.transcript--cue-container--Vuwj6'
        )
      )
        .map((element) => element.textContent?.trim())
        .filter(Boolean) // Lọc bỏ các giá trị null/undefined
        .join('\n') // Nối các đoạn bằng một dòng mới

      if (!transcriptText) {
        console.warn(
          '[UdemyContentExtractor] No transcript text found in the panel.'
        )
        return null
      }

      return transcriptText
    } catch (error) {
      console.error(
        '[UdemyContentExtractor] An error occurred while interacting with DOM to get Udemy transcript:',
        error
      )
      return null
    }
  }

  cleanTranscriptText(text) {
    return text
      .replace(/\n/g, ' ')
      .replace(/♪|'|"|\.\{2,\}|\<[\s\S]*?\>|\{[\s\S]*?\}|\[[\s\S]*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  async getPlainTranscript(preferredLang = this.defaultLang) {
    console.log(
      `[UdemyContentExtractor] Attempting to get plain transcript for language: ${preferredLang} from Udemy DOM.`
    )
    try {
      const rawTranscript = await this.getTranscriptFromDOM()
      if (rawTranscript) {
        const cleanedTranscript = this.cleanTranscriptText(rawTranscript)
        console.log(
          '[UdemyContentExtractor] Udemy transcript extracted and processed successfully from DOM.'
        )
        return cleanedTranscript
      } else {
        console.error(
          '[UdemyContentExtractor] Failed to get Udemy transcript from DOM interaction.'
        )
        return null
      }
    } catch (error) {
      console.error(
        `[UdemyContentExtractor] An unexpected error occurred in getPlainTranscript for Udemy:`,
        error
      )
      return null
    }
  }
}
