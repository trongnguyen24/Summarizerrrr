// @ts-nocheck
/**
 * Content Type Detector Utility
 * Detects the type of content based on URL patterns
 * Used for auto-tagging history items
 */

// Content type patterns
const CONTENT_PATTERNS = {
  youtube: /youtube\.com\/watch/i,
  course: /udemy\.com\/course\/.*\/learn\/|coursera\.org\/learn\//i,
}

/**
 * Detect content type from URL
 * @param {string} url - The URL to analyze
 * @returns {'youtube' | 'course' | 'website'} The detected content type
 */
export function detectContentType(url) {
  if (!url || typeof url !== 'string') {
    return 'website'
  }

  // Check YouTube pattern
  if (CONTENT_PATTERNS.youtube.test(url)) {
    return 'youtube'
  }

  // Check Course pattern
  if (CONTENT_PATTERNS.course.test(url)) {
    return 'course'
  }

  // Default to website
  return 'website'
}

/**
 * Get all available content types
 * @returns {Array<{type: string, label: string, icon: string}>} Array of content type info
 */
export function getAvailableContentTypes() {
  return [
    {
      type: 'youtube',
      label: 'YouTube',
      icon: 'mdi:youtube',
    },
    {
      type: 'website',
      label: 'Website',
      icon: 'mdi:web',
    },
    {
      type: 'course',
      label: 'Course',
      icon: 'mdi:school',
    },
  ]
}

/**
 * Check if a URL matches a specific content type
 * @param {string} url - The URL to check
 * @param {string} contentType - The content type to check against
 * @returns {boolean} True if the URL matches the content type
 */
export function isContentType(url, contentType) {
  return detectContentType(url) === contentType
}

/**
 * Get content type display info
 * @param {string} contentType - The content type
 * @returns {Object|null} Content type info or null if not found
 */
export function getContentTypeInfo(contentType) {
  const types = getAvailableContentTypes()
  return types.find((type) => type.type === contentType) || null
}
