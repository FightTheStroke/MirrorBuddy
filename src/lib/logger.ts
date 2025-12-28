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

  switch (level) {
    case 'error':
      console.error(formatted, context || '');
      break;
    case 'warn':
      console.warn(formatted, context || '');
      break;
    case 'info':
      console.info(formatted, context || '');
      break;
    case 'debug':
      console.debug(formatted, context || '');
      break;
  }
}

export const logger = {
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
};
