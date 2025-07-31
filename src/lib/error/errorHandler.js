// @ts-nocheck
import { ErrorSeverity, ErrorTypes } from './errorTypes.js'
import { get } from 'svelte/store'
import { t as i18n } from 'svelte-i18n'
import { ErrorLogger } from './errorLogger.js'

/**
 * A centralized error handler for the application.
 * Svelte 5 Note: While we aim for Svelte 5 patterns, `svelte-i18n` currently
 * still relies on the store contract, so using `get()` is the correct way
 * to access translations outside of a component context.
 */
export class ErrorHandler {
  /**
   * Handles an error by classifying it, generating a user message,
   * and determining recovery options.
   *
   * @param {Error | any} error The error object.
   * @param {object} [context={}] Additional context about the error.
   * @returns {{type: string, severity: string, message: string, canRetry: boolean, context: object}} A structured error object.
   */
  static handle(error, context = {}) {
    const errorInfo = this._classifyError(error)
    const userMessage = this._generateUserMessage(errorInfo, error)
    const shouldRetry = this._shouldRetry(errorInfo)

    const structuredError = {
      ...errorInfo,
      message: userMessage,
      canRetry: shouldRetry,
      context,
    }

    // Log the error
    ErrorLogger.log(structuredError, error)

    return structuredError
  }

  /**
   * Classifies an error based on its properties.
   * @private
   * @param {Error | any} error The error object.
   * @returns {{type: string, severity: string}} The error type and severity.
   */
  static _classifyError(error) {
    // Check for status code in fetch responses
    if (error && typeof error.status === 'number') {
      switch (error.status) {
        case 401:
          return { type: ErrorTypes.UNAUTHORIZED, severity: ErrorSeverity.HIGH }
        case 429:
          return { type: ErrorTypes.QUOTA, severity: ErrorSeverity.HIGH }
        case 500:
        case 502:
        case 503:
        case 504:
          return { type: ErrorTypes.SERVER, severity: ErrorSeverity.HIGH }
      }
    }

    const errorMessage = error?.message?.toLowerCase() || ''
    if (errorMessage.includes('api key')) {
      return { type: ErrorTypes.API_KEY, severity: ErrorSeverity.HIGH }
    }
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('failed to fetch')
    ) {
      return { type: ErrorTypes.NETWORK, severity: ErrorSeverity.MEDIUM }
    }
    if (errorMessage.includes('timeout')) {
      return { type: ErrorTypes.TIMEOUT, severity: ErrorSeverity.MEDIUM }
    }
    if (errorMessage.includes('permission')) {
      return { type: ErrorTypes.PERMISSION, severity: ErrorSeverity.LOW }
    }
    if (errorMessage.includes('stream')) {
      return { type: ErrorTypes.STREAMING, severity: ErrorSeverity.MEDIUM }
    }

    return { type: ErrorTypes.UNKNOWN, severity: ErrorSeverity.MEDIUM }
  }

  /**
   * Generates a user-friendly error message.
   * @private
   * @param {{type: string}} errorInfo The classified error info.
   * @param {Error | any} error The original error object.
   * @returns {string} A localized user-friendly message.
   */
  static _generateUserMessage(errorInfo, error) {
    const t = get(i18n)
    const key = `errors.${errorInfo.type}`
    // Provide a more descriptive fallback
    const fallbackMessage =
      error?.message || `An ${errorInfo.type} error occurred.`

    // The svelte-i18n `t` function handles fallbacks if the key doesn't exist.
    // We can provide a default value just in case.
    return t(key, { default: fallbackMessage })
  }

  /**
   * Determines if the operation that caused the error should be retried.
   * @private
   * @param {{type: string}} errorInfo The classified error info.
   * @returns {boolean} True if the operation can be retried.
   */
  static _shouldRetry(errorInfo) {
    const retryableErrors = [
      ErrorTypes.NETWORK,
      ErrorTypes.SERVER,
      ErrorTypes.TIMEOUT,
      ErrorTypes.QUOTA,
    ]
    return retryableErrors.includes(errorInfo.type)
  }
}
