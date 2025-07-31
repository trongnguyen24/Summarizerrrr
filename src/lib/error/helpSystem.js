// @ts-nocheck
import { ErrorTypes } from './errorTypes.js'

/**
 * @typedef {object} HelpInfo
 * @property {string} title - The title of the help message.
 * @property {string} message - The detailed help message.
 * @property {string[]} [suggestions] - Suggested user actions or troubleshooting steps.
 */

/**
 * A map of error types to their corresponding help information.
 * @type {Object<string, HelpInfo>}
 */
export const HelpMessages = {
  [ErrorTypes.API_KEY]: {
    title: 'helpSystem.apiKey.title',
    message: 'helpSystem.apiKey.message',
    suggestions: ['helpSystem.apiKey.suggestions.0'],
  },
  [ErrorTypes.UNAUTHORIZED]: {
    title: 'helpSystem.unauthorized.title',
    message: 'helpSystem.unauthorized.message',
    suggestions: [
      'helpSystem.unauthorized.suggestions.0',
      'helpSystem.unauthorized.suggestions.1',
    ],
  },
  [ErrorTypes.QUOTA]: {
    title: 'helpSystem.quota.title',
    message: 'helpSystem.quota.message',
    suggestions: [
      'helpSystem.quota.suggestions.0',
      'helpSystem.quota.suggestions.1',
    ],
  },
  [ErrorTypes.NETWORK]: {
    title: 'helpSystem.network.title',
    message: 'helpSystem.network.message',
    suggestions: ['helpSystem.network.suggestions.0'],
  },
  [ErrorTypes.SERVER]: {
    title: 'helpSystem.server.title',
    message: 'helpSystem.server.message',
    suggestions: [
      'helpSystem.server.suggestions.0',
      'helpSystem.server.suggestions.1',
    ],
  },
  [ErrorTypes.CONTENT]: {
    title: 'helpSystem.content.title',
    message: 'helpSystem.content.message',
    suggestions: [
      'helpSystem.content.suggestions.0',
      'helpSystem.content.suggestions.1',
    ],
  },
  [ErrorTypes.PERMISSION]: {
    title: 'helpSystem.permission.title',
    message: 'helpSystem.permission.message',
    suggestions: ['helpSystem.permission.suggestions.0'],
  },
  [ErrorTypes.UNKNOWN]: {
    title: 'helpSystem.unknown.title',
    message: 'helpSystem.unknown.message',
    suggestions: [
      'helpSystem.unknown.suggestions.0',
      'helpSystem.unknown.suggestions.1',
      'helpSystem.unknown.suggestions.2',
      'helpSystem.unknown.suggestions.3',
    ],
  },
  // Add other error types as needed
}

/**
 * Retrieves the help information for a given error type.
 * @param {string} errorType - The type of the error from ErrorTypes.
 * @returns {HelpInfo} The help information object.
 */
export function getHelpInfo(errorType) {
  return HelpMessages[errorType] || HelpMessages[ErrorTypes.UNKNOWN]
}
