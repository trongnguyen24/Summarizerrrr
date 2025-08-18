// @ts-nocheck
import {
  summarizeContent,
  summarizeContentStream,
  summarizeChapters,
  summarizeChaptersStream,
  providerSupportsStreaming,
} from '@/lib/api/api.js'
import { getBrowserCompatibility } from '@/lib/utils/browserDetection.js'

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

    // Get browser compatibility info
    const browserCompatibility = getBrowserCompatibility()

    // Don't use streaming on Firefox mobile or if browser doesn't support it
    if (!browserCompatibility.supportsAdvancedStreaming) {
      return false
    }

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

    // Get browser compatibility info
    const browserCompatibility = getBrowserCompatibility()

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

          // Check if this is a Firefox mobile streaming error that requires fallback
          if (
            browserCompatibility.isFirefoxMobile &&
            error.isFirefoxMobileStreamingError
          ) {
            console.log(
              '[SummarizationService] Falling back to non-streaming for Firefox mobile'
            )
            // Fallback to non-streaming
            summary = await summarizeContent(content, 'youtube')
            return
          }

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
            console.log(
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

          // Check if this is a Firefox mobile streaming error that requires fallback
          if (
            browserCompatibility.isFirefoxMobile &&
            error.isFirefoxMobileStreamingError
          ) {
            console.log(
              '[SummarizationService] Falling back to non-streaming chapters for Firefox mobile'
            )
            // Try non-streaming fallback for chapters
            try {
              const timestampedTranscript =
                await this.contentExtractorService.extractTimestampedTranscript()
              if (
                timestampedTranscript &&
                timestampedTranscript.trim().length > 50
              ) {
                chapterSummary = await summarizeChapters(timestampedTranscript)
              } else {
                chapterSummary =
                  '<p><i>Timestamped transcript not available for chapter summary.</i></p>'
              }
              return
            } catch (fallbackError) {
              console.error(
                '[SummarizationService] Chapter summary fallback failed:',
                fallbackError
              )
            }
          }

          chapterSummary = '<p><i>Could not generate chapter summary.</i></p>'
        }
      })()
      promises.push(chapterSummaryPromise)

      await Promise.all(promises)
    } else if (contentType === 'course') {
      // Course: tạo cả courseSummary và courseConcepts parallel
      const promises = []

      const courseSummaryPromise = (async () => {
        try {
          const stream = summarizeContentStream(content, 'courseSummary')
          for await (const chunk of stream) {
            summary += chunk
          }
        } catch (error) {
          console.error(
            '[SummarizationService] Course summary streaming error:',
            error
          )

          // Check if this is a Firefox mobile streaming error that requires fallback
          if (
            browserCompatibility.isFirefoxMobile &&
            error.isFirefoxMobileStreamingError
          ) {
            console.log(
              '[SummarizationService] Falling back to non-streaming course summary for Firefox mobile'
            )
            // Fallback to non-streaming
            summary = await summarizeContent(content, 'courseSummary')
            return
          }

          throw error
        }
      })()
      promises.push(courseSummaryPromise)

      let courseConcepts = ''
      const courseConceptsPromise = (async () => {
        try {
          const stream = summarizeContentStream(content, 'courseConcepts')
          for await (const chunk of stream) {
            courseConcepts += chunk
          }
        } catch (error) {
          console.error(
            '[SummarizationService] Course concepts streaming error:',
            error
          )

          // Check if this is a Firefox mobile streaming error that requires fallback
          if (
            browserCompatibility.isFirefoxMobile &&
            error.isFirefoxMobileStreamingError
          ) {
            console.log(
              '[SummarizationService] Falling back to non-streaming course concepts for Firefox mobile'
            )
            // Fallback to non-streaming
            courseConcepts = await summarizeContent(content, 'courseConcepts')
            return
          }

          courseConcepts = '<p><i>Could not generate course concepts.</i></p>'
        }
      })()
      promises.push(courseConceptsPromise)

      await Promise.all(promises)

      return { summary, chapterSummary, courseConcepts }
    } else {
      // Non-YouTube, Non-Course: regular streaming
      try {
        const stream = summarizeContentStream(content, contentType)
        for await (const chunk of stream) {
          summary += chunk
        }
      } catch (error) {
        // Check if this is a Firefox mobile streaming error that requires fallback
        if (
          browserCompatibility.isFirefoxMobile &&
          error.isFirefoxMobileStreamingError
        ) {
          console.log(
            '[SummarizationService] Falling back to non-streaming for Firefox mobile'
          )
          // Fallback to non-streaming
          summary = await summarizeContent(content, contentType)
          console.log(
            '[SummarizationService] Fallback summary result:',
            summary ? 'has content' : 'empty'
          )
          return { summary, chapterSummary }
        }

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
            console.log(
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
    } else if (contentType === 'course') {
      // Course: tạo cả courseSummary và courseConcepts parallel
      let courseConcepts = ''

      const courseSummaryPromise = (async () => {
        try {
          summary = await summarizeContent(content, 'courseSummary')
        } catch (error) {
          console.error('[SummarizationService] Course summary error:', error)
          throw error
        }
      })()

      const courseConceptsPromise = (async () => {
        try {
          courseConcepts = await summarizeContent(content, 'courseConcepts')
        } catch (error) {
          console.error('[SummarizationService] Course concepts error:', error)
          courseConcepts = '<p><i>Could not generate course concepts.</i></p>'
        }
      })()

      await Promise.all([courseSummaryPromise, courseConceptsPromise])

      return { summary, chapterSummary, courseConcepts }
    } else {
      // Non-YouTube, Non-Course: regular summarization
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

  /**
   * Summarize course content only (independent call)
   * @param {Object} settings
   * @returns {Promise<{summary: string, contentType: string}>}
   */
  async summarizeCourseSummary(settings) {
    // Extract content
    const { content, contentType } =
      await this.contentExtractorService.extractPageContent()

    console.log(
      `[SummarizationService] Extracting course summary from ${contentType} content`
    )

    // Xác định phương thức summarization
    const useStreaming = this.shouldUseStreaming(settings)
    const selectedProvider = settings.selectedProvider || 'gemini'

    console.log(
      `[SummarizationService] Using ${selectedProvider} with streaming: ${useStreaming} for course summary`
    )

    let summary = ''
    const browserCompatibility = getBrowserCompatibility()

    try {
      if (useStreaming) {
        // Streaming mode
        const stream = summarizeContentStream(content, 'courseSummary')
        for await (const chunk of stream) {
          summary += chunk
        }
      } else {
        // Non-streaming mode
        summary = await summarizeContent(content, 'courseSummary')
      }
    } catch (error) {
      // Firefox mobile fallback
      if (
        browserCompatibility.isFirefoxMobile &&
        error.isFirefoxMobileStreamingError &&
        useStreaming
      ) {
        console.log(
          '[SummarizationService] Falling back to non-streaming for course summary'
        )
        summary = await summarizeContent(content, 'courseSummary')
      } else {
        throw error
      }
    }

    return {
      summary,
      contentType,
    }
  }

  /**
   * Extract course concepts only (independent call)
   * @param {Object} settings
   * @returns {Promise<{courseConcepts: string, contentType: string}>}
   */
  async extractCourseConcepts(settings) {
    // Extract content
    const { content, contentType } =
      await this.contentExtractorService.extractPageContent()

    console.log(
      `[SummarizationService] Extracting course concepts from ${contentType} content`
    )

    // Xác định phương thức summarization
    const useStreaming = this.shouldUseStreaming(settings)
    const selectedProvider = settings.selectedProvider || 'gemini'

    console.log(
      `[SummarizationService] Using ${selectedProvider} with streaming: ${useStreaming} for course concepts`
    )

    let courseConcepts = ''
    const browserCompatibility = getBrowserCompatibility()

    try {
      if (useStreaming) {
        // Streaming mode
        const stream = summarizeContentStream(content, 'courseConcepts')
        for await (const chunk of stream) {
          courseConcepts += chunk
        }
      } else {
        // Non-streaming mode
        courseConcepts = await summarizeContent(content, 'courseConcepts')
      }
    } catch (error) {
      // Firefox mobile fallback
      if (
        browserCompatibility.isFirefoxMobile &&
        error.isFirefoxMobileStreamingError &&
        useStreaming
      ) {
        console.log(
          '[SummarizationService] Falling back to non-streaming for course concepts'
        )
        courseConcepts = await summarizeContent(content, 'courseConcepts')
      } else {
        console.error('[SummarizationService] Course concepts error:', error)
        courseConcepts = '<p><i>Could not generate course concepts.</i></p>'
      }
    }

    return {
      courseConcepts,
      contentType,
    }
  }
}
