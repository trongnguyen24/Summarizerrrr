// @ts-nocheck

/**
 * Detects if the current browser is Firefox (desktop or mobile)
 * @returns {boolean} True if Firefox, false otherwise
 */
export function isFirefox() {
  try {
    const userAgent = navigator.userAgent
    const isFirefox = /Firefox/.test(userAgent)
    return isFirefox
  } catch (error) {
    console.log('Error detecting browser:', error)
    return false
  }
}

/**
 * Detects if the current browser is Firefox Mobile
 * @returns {boolean} True if Firefox Mobile, false otherwise
 */
export function isFirefoxMobile() {
  try {
    const userAgent = navigator.userAgent
    const isFirefox = /Firefox/.test(userAgent)
    const isMobile = /Mobile/.test(userAgent)
    const result = isFirefox && isMobile

    return result
  } catch (error) {
    // Use console.log instead of console.warn on Firefox Mobile due to read-only restrictions
    return false
  }
}

/**
 * Checks if the browser supports advanced streaming features
 * @returns {boolean} True if advanced streaming is supported, false otherwise
 */
export function supportsAdvancedStreaming() {
  try {
    // Firefox mobile has issues with streaming APIs
    if (isFirefoxMobile()) {
      return false
    }

    // Check for basic streaming API availability
    const hasReadableStream = typeof ReadableStream !== 'undefined'
    const hasWritableStream = typeof WritableStream !== 'undefined'

    if (!hasReadableStream || !hasWritableStream) {
      return false
    }

    return true
  } catch (error) {
    // Use console.log instead of console.warn on Firefox Mobile due to read-only restrictions
    return false
  }
}

/**
 * Gets browser-specific streaming options
 * @returns {object} Streaming options based on browser capabilities
 */
export function getStreamingOptions() {
  if (isFirefoxMobile()) {
    return {
      useSmoothing: false, // Disable smooth streaming on Firefox mobile
      fallbackToNonStreaming: true,
    }
  }

  return {
    useSmoothing: true,
    fallbackToNonStreaming: false,
  }
}

/**
 * Checks if the current environment is a WebExtension context
 * @returns {boolean} True if in WebExtension context, false otherwise
 */
export function isInWebExtensionContext() {
  // Check for WebExtension APIs
  return typeof browser !== 'undefined' || typeof chrome !== 'undefined'
}

/**
 * Comprehensive browser compatibility check
 * @returns {object} Browser compatibility information
 */
export function getBrowserCompatibility() {
  const compatibility = {
    isFirefoxMobile: isFirefoxMobile(),
    supportsAdvancedStreaming: supportsAdvancedStreaming(),
    isInWebExtensionContext: isInWebExtensionContext(),
    streamingOptions: getStreamingOptions(),
  }

  return compatibility
}
