// @ts-nocheck
/**
 * Generates a random secret key for encryption
 * @returns {string} A random 256-bit key as hex string
 */
export function generateSecretKey() {
  const array = new Uint8Array(32) // 256 bits = 32 bytes
  crypto.getRandomValues(array)
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Encrypts a text string using AES encryption
 * @param {string} text - The plain text to encrypt
 * @param {string} secretKey - The secret key for encryption
 * @returns {Promise<string>} The encrypted text as base64 string
 */
export async function encrypt(text, secretKey) {
  if (!text || typeof text !== 'string') {
    return text // Return unchanged if not a valid string
  }

  if (!secretKey || typeof secretKey !== 'string') {
    throw new Error('Secret key is required for encryption')
  }

  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(text)

    // Convert hex secretKey to Uint8Array bytes (256 bits = 32 bytes)
    const keyBytes = new Uint8Array(32)
    for (let i = 0; i < secretKey.length; i += 2) {
      keyBytes[i / 2] = parseInt(secretKey.substr(i, 2), 16)
    }

    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-CBC' },
      false,
      ['encrypt']
    )

    const iv = crypto.getRandomValues(new Uint8Array(16)) // Random IV
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      key,
      data
    )

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encryptedBuffer), iv.length)

    // Convert to base64
    const binaryString = String.fromCharCode(...combined)
    const encrypted = btoa(binaryString)
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
 * @returns {Promise<string>} The decrypted plain text
 */
export async function decrypt(encryptedText, secretKey) {
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
    const binaryString = atob(actualEncryptedText)
    const combined = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i)
    }

    // Extract IV (first 16 bytes) and ciphertext
    const iv = combined.slice(0, 16)
    const ciphertext = combined.slice(16)

    // Convert hex secretKey to Uint8Array bytes (256 bits = 32 bytes)
    const keyBytes = new Uint8Array(32)
    for (let i = 0; i < secretKey.length; i += 2) {
      keyBytes[i / 2] = parseInt(secretKey.substr(i, 2), 16)
    }

    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-CBC' },
      false,
      ['decrypt']
    )

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      key,
      ciphertext
    )

    const decoder = new TextDecoder()
    const plainText = decoder.decode(decryptedBuffer)

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
