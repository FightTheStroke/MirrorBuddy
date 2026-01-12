/**
 * Structured Logger for MirrorBuddy
 *
 * Production-ready logging with:
 * - JSON structured output for log aggregation
 * - Log levels with environment-based filtering
 * - Context enrichment (request ID, user ID, etc.)
 * - Safe serialization (no PII in production)
 *
 * ISE Engineering Fundamentals: Observability
 * https://microsoft.github.io/code-with-engineering-playbook/observability/
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogContext {
  requestId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  component?: string | null;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function getMinLevel(): number {
  const env = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (env && env in LOG_LEVELS) return LOG_LEVELS[env];
  return process.env.NODE_ENV === 'production' ? LOG_LEVELS.info : LOG_LEVELS.debug;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= getMinLevel();
}

function sanitizeContext(ctx?: LogContext): LogContext | undefined {
  if (!ctx) return undefined;
  const sanitized = { ...ctx };
  // Remove potential PII in production
  if (process.env.NODE_ENV === 'production') {
    delete sanitized.email;
    delete sanitized.ip;
  }
  return sanitized;
}

function formatError(err: unknown): LogEntry['error'] | undefined {
  if (!err) return undefined;
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    };
  }
  return { name: 'Unknown', message: String(err) };
}

function createEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: sanitizeContext(context),
    error: formatError(error),
  };
}

function output(entry: LogEntry): void {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // JSON for log aggregation (Azure Monitor, etc.)
    console[entry.level === 'debug' ? 'log' : entry.level](JSON.stringify(entry));
  } else {
    // Human-readable for development
    const prefix = `[${entry.level.toUpperCase()}]`;
    const time = entry.timestamp.split('T')[1]?.split('.')[0] || '';
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    console[entry.level === 'debug' ? 'log' : entry.level](
      `${prefix} ${time} ${entry.message}${ctx}`
    );
    if (entry.error?.stack) console.error(entry.error.stack);
  }
}

function log(level: LogLevel, message: string, context?: LogContext, error?: unknown): void {
  if (!shouldLog(level)) return;
  output(createEntry(level, message, context, error));
}

export const logger = {
  error: (msg: string, ctx?: LogContext, err?: unknown) => log('error', msg, ctx, err),
  warn: (msg: string, ctx?: LogContext) => log('warn', msg, ctx),
  info: (msg: string, ctx?: LogContext) => log('info', msg, ctx),
  debug: (msg: string, ctx?: LogContext) => log('debug', msg, ctx),

  /** Create a child logger with preset context */
  child: (baseContext: LogContext) => ({
    error: (msg: string, ctx?: LogContext, err?: unknown) =>
      log('error', msg, { ...baseContext, ...ctx }, err),
    warn: (msg: string, ctx?: LogContext) => log('warn', msg, { ...baseContext, ...ctx }),
    info: (msg: string, ctx?: LogContext) => log('info', msg, { ...baseContext, ...ctx }),
    debug: (msg: string, ctx?: LogContext) => log('debug', msg, { ...baseContext, ...ctx }),
  }),
};

export default logger;
