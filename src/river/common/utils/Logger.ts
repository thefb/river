import pino, { Logger as PinoLogger, LoggerOptions as PinoLoggerOptions } from 'pino';

// Create a logger instance
export const logger: PinoLogger = pino();

// Export a logger factory function
export function createLogger(options?: PinoLoggerOptions): PinoLogger {
  return pino(options);
}

export { PinoLogger, PinoLoggerOptions };
