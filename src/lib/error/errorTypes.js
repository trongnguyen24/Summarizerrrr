// @ts-nocheck
/**
 * @file Defines standardized error types and severities for the application.
 */

/**
 * Enum for different types of errors that can occur.
 * @enum {string}
 */
export const ErrorTypes = {
  NETWORK: 'network', // For general network errors like connectivity issues.
  API_KEY: 'api_key', // For invalid or missing API key errors.
  QUOTA: 'quota', // For errors related to API usage limits.
  CONTENT: 'content', // For errors when fetching or processing web content.
  PERMISSION: 'permission', // For errors related to browser permissions (e.g., clipboard).
  UNAUTHORIZED: 'unauthorized', // For 401 Unauthorized errors from APIs.
  SERVER: 'server', // For 5xx server-side errors from APIs.
  TIMEOUT: 'timeout', // For request timeout errors.
  STREAMING: 'streaming', // For errors during data streaming.
  UNKNOWN: 'unknown', // For any other unclassified errors.
}

/**
 * Enum for the severity level of an error.
 * @enum {string}
 */
export const ErrorSeverity = {
  LOW: 'low', // Minor issue, doesn't affect core functionality much.
  MEDIUM: 'medium', // Affects a specific feature but the app is still usable.
  HIGH: 'high', // Major feature is not working.
  CRITICAL: 'critical', // Core functionality is broken, app is unusable.
}
