import { LogLevel, LogMessage } from "./types";

export type LogHook = (message: LogMessage) => void;

class ScanLogger {
  public hooks: LogHook[] = [];

  log(...args: unknown[]): void {
    console.log(...args);
    this.callHooks("log", args);
  }

  info(...args: unknown[]): void {
    console.info(...args);
    this.callHooks("info", args);
  }

  warn(...args: unknown[]): void {
    console.warn(...args);
    this.callHooks("warn", args);
  }

  error(...args: unknown[]): void {
    console.error(...args);
    this.callHooks("error", args);
  }

  debug(...args: unknown[]): void {
    console.debug(...args);
    this.callHooks("debug", args);
  }

  trace(...args: unknown[]): void {
    console.trace(...args);
    this.callHooks("trace", args);
  }

  private callHooks(level: LogLevel, data: unknown[]): void {
    for (const hook of this.hooks) {
      try {
        hook({ level, data, date: Date.now() });
      } catch (error) {
        console.error("Error in log hook:", error);
      }
    }
  }
}

export const scanLogger = new ScanLogger();
