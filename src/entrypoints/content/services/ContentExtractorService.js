// @ts-nocheck
import { MessageBasedTranscriptExtractor } from '../extractors/MessageBasedTranscriptExtractor.js'
import { CourseraContentExtractor } from '../extractors/CourseraContentExtractor.js'
import { UdemyContentExtractor } from '../extractors/UdemyContentExtractor.js'

/**
 * Service tổng hợp các content extractor
 */
export class ContentExtractorService {
  constructor(language = 'en') {
    this.language = language
    this.minContentLength = 50
  }

  /**
   * Xác định loại content từ URL
   * @returns {'youtube' | 'course' | 'general'}
   */
  getContentTypeFromURL() {
    const url = window.location.href
    const YOUTUBE_MATCH_PATTERN = /youtube\.com\/watch/i
    const UDEMY_MATCH_PATTERN = /udemy\.com\/course\/.*\/learn\//i
    const COURSERA_MATCH_PATTERN =
      /(coursera\.org\/learn\/.*\/lecture\/|coursera\.org\/learn\/.*\/supplement\/)/i

    if (YOUTUBE_MATCH_PATTERN.test(url)) {
      return 'youtube'
    } else if (
      UDEMY_MATCH_PATTERN.test(url) ||
      COURSERA_MATCH_PATTERN.test(url)
    ) {
      return 'course'
    } else {
      return 'general'
    }
  }

  /**
   * Extract content từ YouTube
   * @returns {Promise<string>}
   */
  async extractYouTubeContent() {
    try {
      console.log('[ContentExtractorService] Extracting YouTube transcript...')
      const transcriptExtractor = new MessageBasedTranscriptExtractor(
        this.language.slice(0, 2)
      )

      // Prioritize timestamped transcript as it provides better context for AI
      // and aligns with user expectations for features like "seek to"
      const transcript = await transcriptExtractor.getTimestampedTranscript()

      if (transcript && transcript.trim().length >= this.minContentLength) {
        console.log(
          '[ContentExtractorService] YouTube timestamped transcript extracted successfully'
        )
        return transcript.trim()
      }

      // Fallback to plain transcript if timestamped is not available
      console.log(
        '[ContentExtractorService] Timestamped transcript failed, trying plain transcript...'
      )
      const plainTranscript = await transcriptExtractor.getPlainTranscript()

      if (
        plainTranscript &&
        plainTranscript.trim().length >= this.minContentLength
      ) {
        console.log(
          '[ContentExtractorService] YouTube plain transcript extracted successfully'
        )
        return plainTranscript.trim()
      }

      throw new Error('YouTube transcript not available or too short')
    } catch (error) {
      console.log('[ContentExtractorService] YouTube extraction failed:', error)
      throw error
    }
  }

  /**
   * Extract content từ course sites (Coursera, Udemy)
   * @returns {Promise<string>}
   */
  async extractCourseContent() {
    try {
      console.log('[ContentExtractorService] Extracting course content...')

      const url = window.location.href
      const isUdemy = /udemy\.com/i.test(url)
      const isCoursera = /coursera\.org/i.test(url)

      let extractor
      let courseContent

      if (isUdemy) {
        console.log(
          '[ContentExtractorService] Detected Udemy platform, using UdemyContentExtractor'
        )
        extractor = new UdemyContentExtractor(this.language.slice(0, 2))
        courseContent = await extractor.getPlainTranscript()
      } else if (isCoursera) {
        console.log(
          '[ContentExtractorService] Detected Coursera platform, using CourseraContentExtractor'
        )
        extractor = new CourseraContentExtractor(this.language.slice(0, 2))
        courseContent = await extractor.getPlainContent()
      } else {
        // Fallback to Coursera extractor for unknown course platforms
        console.log(
          '[ContentExtractorService] Unknown course platform, falling back to CourseraContentExtractor'
        )
        extractor = new CourseraContentExtractor(this.language.slice(0, 2))
        courseContent = await extractor.getPlainContent()
      }

      if (
        courseContent &&
        courseContent.trim().length >= this.minContentLength
      ) {
        console.log(
          '[ContentExtractorService] Course content extracted successfully'
        )
        return courseContent.trim()
      }
      throw new Error('Course content not available or too short')
    } catch (error) {
      console.log('[ContentExtractorService] Course extraction failed:', error)
      throw error
    }
  }

  /**
   * Extract generic content từ DOM
   * @returns {Promise<string>}
   */
  async extractGenericContent() {
    // Thử innerText trước
    let content = document.body?.innerText?.trim()
    if (content && content.length >= this.minContentLength) {
      return content
    }

    // Fallback textContent
    console.log(
      '[ContentExtractorService] innerText không đủ, thử textContent...'
    )
    content = document.body?.textContent?.trim()
    if (content && content.length >= this.minContentLength) {
      return content
    }

    throw new Error(
      'Could not extract sufficient text content from the webpage.'
    )
  }

  /**
   * Extract content dựa trên content type
   * @returns {Promise<{content: string, contentType: string}>}
   */
  async extractPageContent() {
    const contentType = this.getContentTypeFromURL()

    try {
      let content

      if (contentType === 'youtube') {
        try {
          content = await this.extractYouTubeContent()
        } catch (error) {
          console.log(
            '[ContentExtractorService] YouTube extraction failed, fallback to generic'
          )
          content = await this.extractGenericContent()
        }
      } else if (contentType === 'course') {
        try {
          content = await this.extractCourseContent()
        } catch (error) {
          console.log(
            '[ContentExtractorService] Course extraction failed, fallback to generic'
          )
          content = await this.extractGenericContent()
        }
      } else {
        content = await this.extractGenericContent()
      }

      return {
        content,
        contentType,
      }
    } catch (error) {
      console.error(
        '[ContentExtractorService] All extraction methods failed:',
        error
      )
      throw new Error('Could not extract content from the webpage.')
    }
  }

  /**
   * Extract timestamped transcript cho YouTube chapters
   * @returns {Promise<string>}
   */
  async extractTimestampedTranscript() {
    try {
      const transcriptExtractor = new MessageBasedTranscriptExtractor(
        this.language.slice(0, 2)
      )
      return await transcriptExtractor.getTimestampedTranscript()
    } catch (error) {
      console.error(
        '[ContentExtractorService] Timestamped transcript extraction failed:',
        error
      )
      throw error
    }
  }
}
