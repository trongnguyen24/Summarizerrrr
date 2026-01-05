/**
 * RTL (Right-to-Left) Language Utilities
 * Provides helper functions to detect and handle RTL languages like Arabic and Hebrew.
 */

// List of RTL languages supported by the extension
const RTL_LANGUAGES = ['Arabic', 'Hebrew']

/**
 * Checks if a given language code/name is a right-to-left language.
 * @param {string} language - The language name (e.g., 'Arabic', 'Hebrew', 'English')
 * @returns {boolean} True if the language is RTL, false otherwise
 */
export function isRTLLanguage(language) {
  if (!language) return false
  return RTL_LANGUAGES.includes(language)
}

/**
 * Returns the appropriate text direction for a given language.
 * @param {string} language - The language name
 * @returns {'rtl' | 'ltr'} The text direction
 */
export function getTextDirection(language) {
  return isRTLLanguage(language) ? 'rtl' : 'ltr'
}
