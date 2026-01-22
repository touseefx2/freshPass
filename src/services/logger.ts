/**
 * Centralized Logger Utility
 * Provides logging functions with unique IDs in development mode
 */

// Check if we're in development mode
const isDev = __DEV__ || process.env.NODE_ENV === "development";

/**
 * Format log message  in dev mode
 */
const formatMessage = (message: string, ...args: any[]): [string, ...any[]] => {
  if (isDev) {
    return [`${message}`, ...args];
  }
  return [message, ...args];
};

/**
 * Logger class with all console methods
 */
export class Logger {
  /**
   * Log general information
   */
  static log(message: string, ...args: any[]): void {
    const formatted = formatMessage(message, ...args);
    console.log(...formatted);
  }

  /**
   * Log errors
   */
  static error(message: string, ...args: any[]): void {
    const formatted = formatMessage(message, ...args);
    console.error(...formatted);
  }

  /**
   * Log warnings
   */
  static warn(message: string, ...args: any[]): void {
    const formatted = formatMessage(message, ...args);
    console.warn(...formatted);
  }
}

// Export default logger instance for convenience
export default Logger;
