// @ts-nocheck
import {
  summarizeContent,
  summarizeContentStream,
  summarizeChapters,
  summarizeChaptersStream,
  providerSupportsStreaming,
} from '@/lib/api/api.js'

/**
 * Service xử lý summarization logic
 */
export class SummarizationService {
  constructor(contentExtractorService) {
    this.contentExtractorService = contentExtractorService
  }

  /**
   * Kiểm tra xem có nên sử dụng streaming không
   * @param {Object} settings
   * @returns {boolean}
   */
  shouldUseStreaming(settings) {
    const selectedProvider = settings.selectedProvider || 'gemini'
    return (
      settings.enableStreaming && providerSupportsStreaming(selectedProvider)
    )
  }

  /**
   * Summarize với streaming
   * @param {string} content
   * @param {string} contentType
   * @returns {Promise<{summary: string, chapterSummary?: string}>}
   */
  async summarizeWithStreaming(content, contentType) {
    let summary = ''
    let chapterSummary = ''

    if (contentType === 'youtube') {
      // YouTube: tạo cả video summary và chapter summary parallel
      const promises = []

      // Video summary stream
      const videoSummaryPromise = (async () => {
        try {
          const stream = summarizeContentStream(content, 'youtube')
          for await (const chunk of stream) {
            summary += chunk
          }
        } catch (error) {
          console.error(
            '[SummarizationService] Video summary streaming error:',
            error
          )
          throw error
        }
      })()
      promises.push(videoSummaryPromise)

      // Chapter summary stream (parallel)
      const chapterSummaryPromise = (async () => {
        try {
          console.log(
            '[SummarizationService] Extracting timestamped transcript for chapters...'
          )
          const timestampedTranscript =
            await this.contentExtractorService.extractTimestampedTranscript()

          if (
            timestampedTranscript &&
            timestampedTranscript.trim().length > 50
          ) {
            const chapterStream = summarizeChaptersStream(timestampedTranscript)
            for await (const chunk of chapterStream) {
              chapterSummary += chunk
            }
          } else {
            console.warn(
              '[SummarizationService] No timestamped transcript available for chapters'
            )
            chapterSummary =
              '<p><i>Timestamped transcript not available for chapter summary.</i></p>'
          }
        } catch (error) {
          console.error(
            '[SummarizationService] Chapter summary streaming error:',
            error
          )
          chapterSummary = '<p><i>Could not generate chapter summary.</i></p>'
        }
      })()
      promises.push(chapterSummaryPromise)

      await Promise.all(promises)
    } else {
      // Non-YouTube: regular streaming
      try {
        const stream = summarizeContentStream(content, contentType)
        for await (const chunk of stream) {
          summary += chunk
        }
      } catch (error) {
        throw error
      }
    }

    return { summary, chapterSummary }
  }

  /**
   * Summarize không streaming
   * @param {string} content
   * @param {string} contentType
   * @returns {Promise<{summary: string, chapterSummary?: string}>}
   */
  async summarizeWithoutStreaming(content, contentType) {
    let summary = ''
    let chapterSummary = ''

    if (contentType === 'youtube') {
      // YouTube: tạo cả video summary và chapter summary parallel
      const videoSummaryPromise = (async () => {
        try {
          summary = await summarizeContent(content, 'youtube')
        } catch (error) {
          console.error('[SummarizationService] Video summary error:', error)
          throw error
        }
      })()

      const chapterSummaryPromise = (async () => {
        try {
          console.log(
            '[SummarizationService] Extracting timestamped transcript for chapters...'
          )
          const timestampedTranscript =
            await this.contentExtractorService.extractTimestampedTranscript()

          if (
            timestampedTranscript &&
            timestampedTranscript.trim().length > 50
          ) {
            const result = await summarizeChapters(timestampedTranscript)
            chapterSummary =
              result || '<p><i>Could not generate chapter summary.</i></p>'
          } else {
            console.warn(
              '[SummarizationService] No timestamped transcript available for chapters'
            )
            chapterSummary =
              '<p><i>Timestamped transcript not available for chapter summary.</i></p>'
          }
        } catch (error) {
          console.error('[SummarizationService] Chapter summary error:', error)
          chapterSummary = '<p><i>Could not generate chapter summary.</i></p>'
        }
      })()

      await Promise.all([videoSummaryPromise, chapterSummaryPromise])
    } else {
      // Non-YouTube: regular summarization
      try {
        summary = await summarizeContent(content, contentType)
      } catch (error) {
        throw error
      }
    }

    return { summary, chapterSummary }
  }

  /**
   * Thực hiện summarization
   * @param {Object} settings
   * @returns {Promise<{summary: string, chapterSummary?: string, contentType: string}>}
   */
  async summarize(settings) {
    // Extract content
    const { content, contentType } =
      await this.contentExtractorService.extractPageContent()

    console.log(
      `[SummarizationService] Extracted ${contentType} content:`,
      content.substring(0, 100) + '...'
    )

    // Xác định phương thức summarization
    const useStreaming = this.shouldUseStreaming(settings)
    const selectedProvider = settings.selectedProvider || 'gemini'

    console.log(
      `[SummarizationService] Using ${selectedProvider} with streaming: ${useStreaming}`
    )

    let result
    if (useStreaming) {
      result = await this.summarizeWithStreaming(content, contentType)
    } else {
      result = await this.summarizeWithoutStreaming(content, contentType)
    }

    return {
      ...result,
      contentType,
    }
  }
}
