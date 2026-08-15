const isDev = __DEV__;

export class Logger {
  static log(...args: unknown[]): void {
    if (!isDev) return;
    console.log(...args);
  }

  static error(...args: unknown[]): void {
    if (!isDev) return;
    console.error(...args);
  }

  static warn(...args: unknown[]): void {
    if (!isDev) return;
    console.warn(...args);
  }
}

export default Logger;
