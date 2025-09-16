// @ts-nocheck
import CryptoJS from 'crypto-js'

/**
 * Generates a random secret key for encryption
 * @returns {string} A random 256-bit key as hex string
 */
export function generateSecretKey() {
  return CryptoJS.lib.WordArray.random(256 / 8).toString(CryptoJS.enc.Hex)
}

/**
 * Encrypts a text string using AES encryption
 * @param {string} text - The plain text to encrypt
 * @param {string} secretKey - The secret key for encryption
 * @returns {string} The encrypted text as base64 string
 */
export function encrypt(text, secretKey) {
  if (!text || typeof text !== 'string') {
    return text // Return unchanged if not a valid string
  }

  if (!secretKey || typeof secretKey !== 'string') {
    throw new Error('Secret key is required for encryption')
  }

  try {
    const encrypted = CryptoJS.AES.encrypt(text, secretKey).toString()
    const prefixed = `encv1:${encrypted}`
    return prefixed
  } catch (error) {
    console.error('Encryption failed:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypts an encrypted string using AES decryption
 * @param {string} encryptedText - The encrypted text to decrypt
 * @param {string} secretKey - The secret key for decryption
 * @returns {string} The decrypted plain text
 */
export function decrypt(encryptedText, secretKey) {
  if (
    !encryptedText ||
    typeof encryptedText !== 'string' ||
    !encryptedText.startsWith('encv1:')
  ) {
    return encryptedText // Return unchanged if not a valid string or doesn't have prefix
  }

  if (!secretKey || typeof secretKey !== 'string') {
    throw new Error('Secret key is required for decryption')
  }

  try {
    const actualEncryptedText = encryptedText.substring(6) // Remove 'encv1:' prefix
    const decrypted = CryptoJS.AES.decrypt(actualEncryptedText, secretKey)
    const plainText = decrypted.toString(CryptoJS.enc.Utf8)

    if (!plainText) {
      throw new Error('Failed to decrypt - invalid key or corrupted data')
    }

    return plainText
  } catch (error) {
    console.error('Decryption failed:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Validates if a string is likely an encrypted text
 * @param {string} text - The text to check
 * @returns {boolean} True if the text looks like encrypted data
 */
export function isEncrypted(text) {
  if (!text || typeof text !== 'string') {
    return false
  }

  return text.startsWith('encv1:')
}

/**
 * Sanitizes and validates an API key before encryption
 * @param {string} apiKey - The API key to validate
 * @returns {string} The sanitized API key
 * @throws {Error} If the API key is invalid
 */
export function validateAndSanitizeApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return apiKey // Allow empty keys
  }

  // Remove leading/trailing whitespace
  const sanitized = apiKey.trim()

  // Basic validation: check for potentially malicious patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:\s*text\/html/i,
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      throw new Error('API key contains potentially malicious content')
    }
  }

  // Check for reasonable length (most API keys are between 10-200 characters)
  if (sanitized.length > 500) {
    throw new Error('API key is too long')
  }

  return sanitized
}
