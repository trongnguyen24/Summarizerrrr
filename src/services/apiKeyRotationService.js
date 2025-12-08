// @ts-nocheck
/**
 * API Key Rotation Service
 * Handles multiple API keys with automatic rotation on rate limit
 */

import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
import { showApiKeyRotationToast } from '@/lib/utils/toastUtils.js'

// Maximum number of API keys allowed
export const MAX_API_KEYS = 5

/**
 * Gets the currently active Gemini API key
 * Falls back to legacy single key for backward compatibility
 * @param {Object} settingsObj - Settings object
 * @returns {string} The active API key or empty string
 */
export function getCurrentGeminiApiKey(settingsObj) {
  const keys = settingsObj.geminiApiKeys || []
  const index = settingsObj.currentGeminiApiKeyIndex || 0

  // If we have keys in the array, use them
  if (keys.length > 0) {
    const validIndex = index < keys.length ? index : 0
    return keys[validIndex] || ''
  }

  // Fallback to legacy single key for backward compatibility
  return settingsObj.geminiApiKey || ''
}

/**
 * Rotates to the next available API key
 * @param {Object} settingsObj - Settings object
 * @returns {Promise<string|null>} The new API key if rotation succeeded, null if no more keys
 */
export async function rotateToNextApiKey(settingsObj) {
  const keys = settingsObj.geminiApiKeys || []

  // Can't rotate if we have 0 or 1 keys
  if (keys.length <= 1) {
    console.log('[apiKeyRotation] No more API keys to rotate to')
    return null
  }

  const currentIndex = settingsObj.currentGeminiApiKeyIndex || 0
  const nextIndex = (currentIndex + 1) % keys.length

  // Update the index in settings
  await updateSettings({ currentGeminiApiKeyIndex: nextIndex })

  const newKey = keys[nextIndex]
  console.log(
    `[apiKeyRotation] Rotated from key ${currentIndex + 1} to key ${nextIndex + 1} of ${keys.length}`
  )

  // Show toast notification
  showApiKeyRotationToast(nextIndex + 1, keys.length)

  return newKey
}

/**
 * Checks if an error is a rate limit error
 * @param {Error} error - The error to check
 * @returns {boolean} True if it's a rate limit error
 */
export function isRateLimitError(error) {
  if (!error) return false

  // Check HTTP status
  if (error.status === 429 || error.statusCode === 429) {
    return true
  }

  // Check error message
  const message = (error.message || '').toLowerCase()
  return (
    message.includes('rate') ||
    message.includes('quota') ||
    message.includes('limit exceeded') ||
    message.includes('too many requests') ||
    message.includes('resource exhausted')
  )
}

/**
 * Adds a new API key to the list
 * @param {string} newKey - The new API key to add
 * @returns {Promise<boolean>} True if added successfully
 */
export async function addGeminiApiKey(newKey) {
  if (!newKey || newKey.trim() === '') {
    return false
  }

  const keys = [...(settings.geminiApiKeys || [])]

  // Check max limit
  if (keys.length >= MAX_API_KEYS) {
    console.log(`[apiKeyRotation] Cannot add more than ${MAX_API_KEYS} API keys`)
    return false
  }

  // Check duplicate
  const trimmedKey = newKey.trim()
  if (keys.includes(trimmedKey)) {
    console.log('[apiKeyRotation] API key already exists')
    return false
  }

  keys.push(trimmedKey)

  // Also update legacy key to the first one for backward compatibility
  await updateSettings({
    geminiApiKeys: keys,
    geminiApiKey: keys[0],
  })

  console.log(`[apiKeyRotation] Added API key, total: ${keys.length}`)
  return true
}

/**
 * Removes an API key from the list
 * @param {number} index - Index of the key to remove
 * @returns {Promise<boolean>} True if removed successfully
 */
export async function removeGeminiApiKey(index) {
  const keys = [...(settings.geminiApiKeys || [])]

  if (index < 0 || index >= keys.length) {
    return false
  }

  // Can't remove if it's the only key
  if (keys.length <= 1) {
    console.log('[apiKeyRotation] Cannot remove the last API key')
    return false
  }

  keys.splice(index, 1)

  // Adjust current index if needed
  let newIndex = settings.currentGeminiApiKeyIndex || 0
  if (newIndex >= keys.length) {
    newIndex = keys.length - 1
  }
  if (newIndex > index) {
    newIndex = newIndex - 1
  }

  // Also update legacy key for backward compatibility
  await updateSettings({
    geminiApiKeys: keys,
    currentGeminiApiKeyIndex: newIndex,
    geminiApiKey: keys[0] || '',
  })

  console.log(`[apiKeyRotation] Removed API key at index ${index}, total: ${keys.length}`)
  return true
}

/**
 * Sets a specific key as the active key
 * @param {number} index - Index of the key to set as active
 * @returns {Promise<boolean>} True if set successfully
 */
export async function setActiveGeminiApiKey(index) {
  const keys = settings.geminiApiKeys || []

  if (index < 0 || index >= keys.length) {
    return false
  }

  await updateSettings({ currentGeminiApiKeyIndex: index })

  console.log(`[apiKeyRotation] Set active API key to index ${index}`)
  return true
}
