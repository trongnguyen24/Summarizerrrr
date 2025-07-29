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
    title: 'helpSystem.apiKey.title',
    message: 'helpSystem.apiKey.message',
    actions: ['helpSystem.apiKey.actions.openSettings'],
  },
  [ErrorTypes.UNAUTHORIZED]: {
    title: 'helpSystem.unauthorized.title',
    message: 'helpSystem.unauthorized.message',
    actions: [
      'helpSystem.unauthorized.actions.openSettings',
      'helpSystem.unauthorized.actions.checkApiPermissions',
    ],
  },
  [ErrorTypes.QUOTA]: {
    title: 'helpSystem.quota.title',
    message: 'helpSystem.quota.message',
    actions: [
      'helpSystem.quota.actions.checkBilling',
      'helpSystem.quota.actions.switchProvider',
    ],
  },
  [ErrorTypes.NETWORK]: {
    title: 'helpSystem.network.title',
    message: 'helpSystem.network.message',
    actions: ['helpSystem.network.actions.retry'],
  },
  [ErrorTypes.SERVER]: {
    title: 'helpSystem.server.title',
    message: 'helpSystem.server.message',
    actions: [
      'helpSystem.server.actions.retry',
      'helpSystem.server.actions.switchProvider',
    ],
  },
  [ErrorTypes.CONTENT]: {
    title: 'helpSystem.content.title',
    message: 'helpSystem.content.message',
    actions: ['helpSystem.content.actions.refreshPage'],
  },
  [ErrorTypes.PERMISSION]: {
    title: 'helpSystem.permission.title',
    message: 'helpSystem.permission.message',
    actions: ['helpSystem.permission.actions.checkPermissions'],
  },
  [ErrorTypes.UNKNOWN]: {
    title: 'helpSystem.unknown.title',
    message: 'helpSystem.unknown.message',
    actions: [
      'helpSystem.unknown.actions.retry',
      'helpSystem.unknown.actions.reportIssue',
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
