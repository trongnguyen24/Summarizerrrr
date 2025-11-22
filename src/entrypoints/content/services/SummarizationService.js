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
    // FORCE BLOCKING MODE cho tất cả content scripts
    // Content scripts có security restrictions làm streaming bị lỗi "Permission denied to access property flush"
    return false

    // Logic cũ đã được disable:
    // const selectedProvider = settings.selectedProvider || 'gemini'
    // const browserCompatibility = getBrowserCompatibility()
    // if (!browserCompatibility.supportsAdvancedStreaming) {
    //   return false
    // }
    // return (
    //   settings.enableStreaming && providerSupportsStreaming(selectedProvider)
    // )
  }

  /**
   * Summarize với streaming
   * @param {string} content
   * @param {string} contentType
   * @param {AbortSignal} [abortSignal]
   * @returns {Promise<{summary: string, chapterSummary?: string}>}
   */
  async summarizeWithStreaming(content, contentType, abortSignal) {
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
          const stream = summarizeContentStream(content, 'youtube', abortSignal)
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
            summary = await summarizeContent(content, 'youtube', abortSignal)
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
            const chapterStream = summarizeChaptersStream(timestampedTranscript, abortSignal)
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
                chapterSummary = await summarizeChapters(timestampedTranscript, abortSignal)
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
          throw error
        }
      })()
      promises.push(chapterSummaryPromise)

      await Promise.all(promises)
    } else if (contentType === 'course') {
      // Course: tạo cả courseSummary và courseConcepts parallel
      const promises = []

      const courseSummaryPromise = (async () => {
        try {
          const stream = summarizeContentStream(content, 'courseSummary', abortSignal)
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
            summary = await summarizeContent(content, 'courseSummary', abortSignal)
            return
          }

          throw error
        }
      })()
      promises.push(courseSummaryPromise)

      let courseConcepts = ''
      const courseConceptsPromise = (async () => {
        try {
          const stream = summarizeContentStream(content, 'courseConcepts', abortSignal)
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
            courseConcepts = await summarizeContent(content, 'courseConcepts', abortSignal)
            return
          }

          courseConcepts = '<p><i>Could not generate course concepts.</i></p>'
          throw error
        }
      })()
      promises.push(courseConceptsPromise)

      await Promise.all(promises)

      return { summary, chapterSummary, courseConcepts }
    } else {
      // Non-YouTube, Non-Course: regular streaming
      try {
        const stream = summarizeContentStream(content, contentType, abortSignal)
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
          summary = await summarizeContent(content, contentType, abortSignal)
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
   * @param {AbortSignal} [abortSignal]
   * @returns {Promise<{summary: string, chapterSummary?: string}>}
   */
  async summarizeWithoutStreaming(content, contentType, abortSignal) {
    let summary = ''
    let chapterSummary = ''

    if (contentType === 'youtube') {
      // YouTube: tạo cả video summary và chapter summary parallel
      const videoSummaryPromise = (async () => {
        try {
          summary = await summarizeContent(content, 'youtube', abortSignal)
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
            const result = await summarizeChapters(timestampedTranscript, abortSignal)
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
          throw error
        }
      })()

      await Promise.all([videoSummaryPromise, chapterSummaryPromise])
    } else if (contentType === 'course') {
      // Course: tạo cả courseSummary và courseConcepts parallel
      let courseConcepts = ''

      const courseSummaryPromise = (async () => {
        try {
          summary = await summarizeContent(content, 'courseSummary', abortSignal)
        } catch (error) {
          console.error('[SummarizationService] Course summary error:', error)
          throw error
        }
      })()

      const courseConceptsPromise = (async () => {
        try {
          courseConcepts = await summarizeContent(content, 'courseConcepts', abortSignal)
        } catch (error) {
          console.error('[SummarizationService] Course concepts error:', error)
          courseConcepts = '<p><i>Could not generate course concepts.</i></p>'
          throw error
        }
      })()

      await Promise.all([courseSummaryPromise, courseConceptsPromise])

      return { summary, chapterSummary, courseConcepts }
    } else {
      // Non-YouTube, Non-Course: regular summarization
      try {
        summary = await summarizeContent(content, contentType, abortSignal)
      } catch (error) {
        throw error
      }
    }

    return { summary, chapterSummary }
  }

  /**
   * Thực hiện summarization với content đã có
   * @param {string} content - Nội dung đã trích xuất
   * @param {string} contentType - Loại nội dung
   * @param {Object} settings
   * @param {AbortSignal} [abortSignal]
   * @returns {Promise<{summary: string, chapterSummary?: string, contentType: string}>}
   */
  async summarizeWithContent(content, contentType, settings, abortSignal) {
    // Xác định phương thức summarization
    const useStreaming = this.shouldUseStreaming(settings)
    const selectedProvider = settings.selectedProvider || 'gemini'

    let result
    if (useStreaming) {
      result = await this.summarizeWithStreaming(content, contentType, abortSignal)
    } else {
      result = await this.summarizeWithoutStreaming(content, contentType, abortSignal)
    }

    return {
      ...result,
      contentType,
    }
  }

  /**
   * Thực hiện summarization
   * @param {Object} settings
   * @param {AbortSignal} [abortSignal]
   * @returns {Promise<{summary: string, chapterSummary?: string, contentType: string}>}
   */
  async summarize(settings, abortSignal) {
    // Extract content
    const { content, contentType } =
      await this.contentExtractorService.extractPageContent()

    // Xác định phương thức summarization
    const useStreaming = this.shouldUseStreaming(settings)
    const selectedProvider = settings.selectedProvider || 'gemini'

    let result
    if (useStreaming) {
      result = await this.summarizeWithStreaming(content, contentType, abortSignal)
    } else {
      result = await this.summarizeWithoutStreaming(content, contentType, abortSignal)
    }

    return {
      ...result,
      contentType,
    }
  }

  /**
   * Summarize course content only (independent call)
   * @param {Object} settings
   * @param {AbortSignal} [abortSignal]
   * @returns {Promise<{summary: string, contentType: string}>}
   */
  async summarizeCourseSummary(settings, abortSignal) {
    // Extract content
    const { content, contentType } =
      await this.contentExtractorService.extractPageContent()

    // Xác định phương thức summarization
    const useStreaming = this.shouldUseStreaming(settings)
    const selectedProvider = settings.selectedProvider || 'gemini'

    let summary = ''
    const browserCompatibility = getBrowserCompatibility()

    try {
      if (useStreaming) {
        // Streaming mode
        const stream = summarizeContentStream(content, 'courseSummary', abortSignal)
        for await (const chunk of stream) {
          summary += chunk
        }
      } else {
        // Non-streaming mode
        summary = await summarizeContent(content, 'courseSummary', abortSignal)
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
        summary = await summarizeContent(content, 'courseSummary', abortSignal)
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
   * Summarize course content only với content đã có (independent call)
   * @param {string} content - Nội dung đã trích xuất
   * @param {Object} settings
   * @param {AbortSignal} [abortSignal]
   * @returns {Promise<{summary: string, contentType: string}>}
   */
  async summarizeCourseSummaryWithContent(content, settings, abortSignal) {
    // Xác định phương thức summarization
    const useStreaming = this.shouldUseStreaming(settings)
    const selectedProvider = settings.selectedProvider || 'gemini'

    let summary = ''
    const browserCompatibility = getBrowserCompatibility()

    try {
      if (useStreaming) {
        // Streaming mode
        const stream = summarizeContentStream(content, 'courseSummary', abortSignal)
        for await (const chunk of stream) {
          summary += chunk
        }
      } else {
        // Non-streaming mode
        summary = await summarizeContent(content, 'courseSummary', abortSignal)
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
        summary = await summarizeContent(content, 'courseSummary', abortSignal)
      } else {
        throw error
      }
    }

    return {
      summary,
      contentType: 'course',
    }
  }

  /**
   * Extract course concepts only với content đã có (independent call)
   * @param {string} content - Nội dung đã trích xuất
   * @param {Object} settings
   * @param {AbortSignal} [abortSignal]
   * @returns {Promise<{courseConcepts: string, contentType: string}>}
   */
  async extractCourseConceptsWithContent(content, settings, abortSignal) {
    // Xác định phương thức summarization
    const useStreaming = this.shouldUseStreaming(settings)
    const selectedProvider = settings.selectedProvider || 'gemini'

    let courseConcepts = ''
    const browserCompatibility = getBrowserCompatibility()

    try {
      if (useStreaming) {
        // Streaming mode
        const stream = summarizeContentStream(content, 'courseConcepts', abortSignal)
        for await (const chunk of stream) {
          courseConcepts += chunk
        }
      } else {
        // Non-streaming mode
        courseConcepts = await summarizeContent(content, 'courseConcepts', abortSignal)
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
        courseConcepts = await summarizeContent(content, 'courseConcepts', abortSignal)
      } else {
        console.error('[SummarizationService] Course concepts error:', error)
        courseConcepts = '<p><i>Could not generate course concepts.</i></p>'
        throw error
      }
    }

    return {
      courseConcepts,
      contentType: 'course',
    }
  }

  /**
   * Extract course concepts only (independent call)
   * @param {Object} settings
   * @param {AbortSignal} [abortSignal]
   * @returns {Promise<{courseConcepts: string, contentType: string}>}
   */
  async extractCourseConcepts(settings, abortSignal) {
    // Extract content
    const { content, contentType } =
      await this.contentExtractorService.extractPageContent()

    // Xác định phương thức summarization
    const useStreaming = this.shouldUseStreaming(settings)
    const selectedProvider = settings.selectedProvider || 'gemini'

    let courseConcepts = ''
    const browserCompatibility = getBrowserCompatibility()

    try {
      if (useStreaming) {
        // Streaming mode
        const stream = summarizeContentStream(content, 'courseConcepts', abortSignal)
        for await (const chunk of stream) {
          courseConcepts += chunk
        }
      } else {
        // Non-streaming mode
        courseConcepts = await summarizeContent(content, 'courseConcepts', abortSignal)
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
        courseConcepts = await summarizeContent(content, 'courseConcepts', abortSignal)
      } else {
        console.error('[SummarizationService] Course concepts error:', error)
        courseConcepts = '<p><i>Could not generate course concepts.</i></p>'
        throw error
      }
    }

    return {
      courseConcepts,
      contentType,
    }
  }
}
