// @ts-nocheck
import { YouTubeTranscriptExtractor } from '../extractors/YouTubeTranscriptExtractor.js'
import { CourseraContentExtractor } from '../extractors/CourseraContentExtractor.js'

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
      const transcriptExtractor = new YouTubeTranscriptExtractor(
        this.language.slice(0, 2)
      )
      const transcript = await transcriptExtractor.getPlainTranscript()

      if (transcript && transcript.trim().length >= this.minContentLength) {
        console.log(
          '[ContentExtractorService] YouTube transcript extracted successfully'
        )
        return transcript.trim()
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
      const courseraExtractor = new CourseraContentExtractor(
        this.language.slice(0, 2)
      )
      const courseContent = await courseraExtractor.getPlainContent()

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
      const transcriptExtractor = new YouTubeTranscriptExtractor(
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
