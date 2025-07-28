// @ts-nocheck
import { ErrorTypes } from './errorTypes.js'

/**
 * @typedef {object} HelpInfo
 * @property {string} title - The title of the help message.
 * @property {string} message - The detailed help message.
 * @property {string[]} [actions] - Suggested user actions (e.g., button labels).
 */

/**
 * A map of error types to their corresponding help information.
 * @type {Object<string, HelpInfo>}
 */
export const HelpMessages = {
  [ErrorTypes.API_KEY]: {
    title: 'Invalid API Key',
    message:
      'The API key you provided is invalid or has been disabled. Please check the key in the settings and try again.',
    actions: ['Open Settings'],
  },
  [ErrorTypes.UNAUTHORIZED]: {
    title: 'Unauthorized Access',
    message:
      'Your API key does not have the required permissions for this operation. This can happen with tuned models or specific API restrictions.',
    actions: ['Open Settings', 'Check API Permissions'],
  },
  [ErrorTypes.QUOTA]: {
    title: 'API Quota Exceeded',
    message:
      'You have exceeded your usage limit for the selected API. Please check your account billing or try again later.',
    actions: ['Check Billing', 'Switch Provider'],
  },
  [ErrorTypes.NETWORK]: {
    title: 'Network Connection Error',
    message:
      'Could not connect to the server. Please check your internet connection and any firewall or proxy settings.',
    actions: ['Retry'],
  },
  [ErrorTypes.SERVER]: {
    title: 'API Server Error',
    message:
      "The AI provider's server encountered an internal error (5xx). This is usually a temporary issue. Please wait a moment and try again.",
    actions: ['Retry', 'Switch Provider'],
  },
  [ErrorTypes.CONTENT]: {
    title: 'Content Error',
    message:
      'The extension could not retrieve the necessary content from this page (e.g., transcript not found, page text too short).',
    actions: ['Refresh Page'],
  },
  [ErrorTypes.PERMISSION]: {
    title: 'Permission Denied',
    message:
      'The extension lacks the necessary browser permissions to perform this action. Please check the extension settings.',
    actions: ['Check Permissions'],
  },
  [ErrorTypes.UNKNOWN]: {
    title: 'Unknown Error',
    message:
      'An unexpected error occurred. If this problem persists, please consider reporting it.',
    actions: ['Retry', 'Report Issue'],
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
