/**
 * Structured logger for Convergio Web
 * - Production: silent (no console output)
 * - Development: logs to console
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.error('Something failed', { context: data });
 *   logger.warn('Deprecation notice');
 *   logger.info('User action completed');
 *   logger.debug('Verbose debugging info');
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const isDev = process.env.NODE_ENV === 'development';

function formatLog(entry: LogEntry): string {
  const prefix = `[${entry.level.toUpperCase()}]`;
  const time = entry.timestamp.split('T')[1]?.split('.')[0] || '';
  return `${prefix} ${time} ${entry.message}`;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  // Silent in production
  if (!isDev) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };

  const formatted = formatLog(entry);

  // Use explicit %s format to prevent format string interpretation of user messages
  // This fixes CodeQL's "use of externally-controlled format string" warning
  switch (level) {
    case 'error':
      if (context) {
        console.error('%s %o', formatted, context);
      } else {
        console.error('%s', formatted);
      }
      break;
    case 'warn':
      if (context) {
        console.warn('%s %o', formatted, context);
      } else {
        console.warn('%s', formatted);
      }
      break;
    case 'info':
      if (context) {
        console.info('%s %o', formatted, context);
      } else {
        console.info('%s', formatted);
      }
      break;
    case 'debug':
      if (context) {
        console.debug('%s %o', formatted, context);
      } else {
        console.debug('%s', formatted);
      }
      break;
  }
}

export const logger = {
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
};
