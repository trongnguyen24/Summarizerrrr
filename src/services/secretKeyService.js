// @ts-nocheck
import { secretKeyStorage } from './wxtStorageService.js'
import { generateSecretKey } from '../lib/utils/crypto.js'

/**
 * Service to manage the secret key used for API key encryption
 */
class SecretKeyService {
  constructor() {
    this._secretKey = null
    this._isInitialized = false
  }

  /**
   * Initialize the secret key service
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._isInitialized) {
      return
    }

    try {
      // Try to load existing secret key from storage
      let storedKey = await secretKeyStorage.getValue()

      if (!storedKey) {
        // Generate a new secret key if none exists
        storedKey = generateSecretKey()
        await secretKeyStorage.setValue(storedKey)
      }

      this._secretKey = storedKey
      this._isInitialized = true
    } catch (error) {
      console.error(
        '[SecretKeyService] Failed to initialize secret key:',
        error
      )
      throw new Error('Failed to initialize encryption service')
    }
  }

  /**
   * Get the current secret key
   * @returns {Promise<string>} The secret key
   */
  async getSecretKey() {
    if (!this._isInitialized) {
      await this.initialize()
    }

    if (!this._secretKey) {
      throw new Error('Secret key not available')
    }

    return this._secretKey
  }

  /**
   * Check if the service is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._isInitialized
  }

  /**
   * Regenerate the secret key (for key rotation)
   * WARNING: This will make all existing encrypted data unreadable!
   * @returns {Promise<string>} The new secret key
   */
  async regenerateSecretKey() {
    try {
      console.warn(
        '[SecretKeyService] Regenerating secret key - existing encrypted data will be lost!'
      )

      const newKey = generateSecretKey()
      await secretKeyStorage.setValue(newKey)
      this._secretKey = newKey

      return newKey
    } catch (error) {
      console.error(
        '[SecretKeyService] Failed to regenerate secret key:',
        error
      )
      throw new Error('Failed to regenerate secret key')
    }
  }

  /**
   * Clear the secret key from memory (for security)
   */
  clearFromMemory() {
    this._secretKey = null
    this._isInitialized = false
  }
}

// Export a singleton instance
export const secretKeyService = new SecretKeyService()
