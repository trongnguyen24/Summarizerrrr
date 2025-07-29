// @ts-nocheck

/**
 * A simple error logger for the application.
 * Currently logs to the console, but can be extended to log to a remote service.
 */
export class ErrorLogger {
  /**
   * Logs a structured error object.
   * @param {object} structuredError The error object from ErrorHandler.
   * @param {Error} originalError The original error instance.
   */
  static log(structuredError, originalError) {
    console.error('[ErrorLogger] A handled error occurred:', {
      Timestamp: new Date().toISOString(),
      Type: structuredError.type,
      Severity: structuredError.severity,
      Message: structuredError.message,
      CanRetry: structuredError.canRetry,
      Context: structuredError.context,
      OriginalStack: originalError?.stack,
    })

    // TODO: Extend this to save logs to localStorage or send to a remote logging service.
  }
}
