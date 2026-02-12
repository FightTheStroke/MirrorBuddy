'use client';

/**
 * Client-side Logger for MirrorBuddy
 *
 * Unified logging API that mirrors the server logger.
 * All errors and warnings are sent to Sentry in production.
 *
 * Usage:
 *   import { clientLogger } from "@/lib/logger/client";
 *   clientLogger.error("Failed to load", { component: "MyComponent" }, error);
 *   clientLogger.warn("Deprecated feature used", { feature: "oldApi" });
 */

import * as Sentry from '@sentry/nextjs';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface ClientLogContext {
  component?: string;
  userId?: string;
  [key: string]: unknown;
}

const isProduction = process.env.NODE_ENV === 'production';
const PII_FIELDS = [
  'email',
  'ip',
  'name',
  'firstName',
  'lastName',
  'phone',
  'address',
  'password',
  'token',
  'apiKey',
  'secret',
];

function sanitizeContext(context?: ClientLogContext): ClientLogContext | undefined {
  if (!context) return undefined;

  const sanitized = { ...context };

  if (isProduction) {
    for (const field of PII_FIELDS) {
      delete sanitized[field];
    }

    if (typeof sanitized.userId === 'string') {
      sanitized.userId = `${sanitized.userId.substring(0, 8)}...`;
    }
  }

  return sanitized;
}

/**
 * Send error to Sentry
 */
function captureError(message: string, context?: ClientLogContext, error?: unknown): void {
  const errorToCapture = error instanceof Error ? error : new Error(message);
  const sanitizedContext = sanitizeContext(context);

  if (isProduction) {
    Sentry.captureException(errorToCapture, {
      tags: {
        component: sanitizedContext?.component || 'client',
        source: 'client-logger',
      },
      extra: {
        message,
        ...sanitizedContext,
        originalError: error ? String(error) : undefined,
      },
    });
  }

  if (!isProduction) {
    console.error(`[ERROR] ${message}`, context, error);
  }
}

/**
 * Send warning to Sentry
 */
function captureWarning(message: string, context?: ClientLogContext): void {
  const sanitizedContext = sanitizeContext(context);

  if (isProduction) {
    Sentry.captureMessage(message, {
      level: 'warning',
      tags: {
        component: sanitizedContext?.component || 'client',
        source: 'client-logger',
      },
      extra: {
        ...sanitizedContext,
      },
    });
  }

  if (!isProduction) {
    console.warn(`[WARN] ${message}`, context);
  }
}

/**
 * Log info (console only, not sent to Sentry)
 */
function logInfo(message: string, context?: ClientLogContext): void {
  if (!isProduction) {
    console.info(`[INFO] ${message}`, context);
  }
}

/**
 * Log debug (console only in development)
 */
function logDebug(message: string, context?: ClientLogContext): void {
  if (!isProduction) {
    console.debug(`[DEBUG] ${message}`, context);
  }
}

/**
 * Client-side logger with Sentry integration
 */
export const clientLogger = {
  /**
   * Log error - sent to Sentry in production
   */
  error: (msg: string, ctx?: ClientLogContext, err?: unknown) => captureError(msg, ctx, err),

  /**
   * Log warning - sent to Sentry in production
   */
  warn: (msg: string, ctx?: ClientLogContext) => captureWarning(msg, ctx),

  /**
   * Log info - console only
   */
  info: (msg: string, ctx?: ClientLogContext) => logInfo(msg, ctx),

  /**
   * Log debug - console only in development
   */
  debug: (msg: string, ctx?: ClientLogContext) => logDebug(msg, ctx),

  /**
   * Create a child logger with preset context
   */
  child: (baseContext: ClientLogContext) => ({
    error: (msg: string, ctx?: ClientLogContext, err?: unknown) =>
      captureError(msg, { ...baseContext, ...ctx }, err),
    warn: (msg: string, ctx?: ClientLogContext) => captureWarning(msg, { ...baseContext, ...ctx }),
    info: (msg: string, ctx?: ClientLogContext) => logInfo(msg, { ...baseContext, ...ctx }),
    debug: (msg: string, ctx?: ClientLogContext) => logDebug(msg, { ...baseContext, ...ctx }),
  }),
};

export default clientLogger;
