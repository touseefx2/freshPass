const isDev = __DEV__ || process.env.NODE_ENV === "development";

const formatMessage = (message: string, ...args: any[]): [string, ...any[]] => {
  return [message, ...args];
};

export class Logger {
  static log(message: string, ...args: any[]): void {
    if (!isDev) return;
    const formatted = formatMessage(message, ...args);
    console.log(...formatted);
  }

  static error(message: string, ...args: any[]): void {
    if (!isDev) return;
    const formatted = formatMessage(message, ...args);
    console.error(...formatted);
  }

  static warn(message: string, ...args: any[]): void {
    if (!isDev) return;
    const formatted = formatMessage(message, ...args);
    console.warn(...formatted);
  }
}

export default Logger;
