'use client';

/**
 * Client-side error logger - Captures all browser errors and sends to server
 *
 * Captures:
 * - Unhandled errors (window.onerror)
 * - Unhandled promise rejections
 * - React error boundaries
 * - Console.error calls
 * - Network fetch errors
 *
 * Usage: Import once in layout.tsx or _app.tsx
 *   import '@/lib/client-error-logger';
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface ClientLogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  stack?: string;
  url?: string;
}

const LOG_ENDPOINT = '/api/debug/log';

// Debounce to avoid flooding
const sentErrors = new Set<string>();
const MAX_ERRORS_PER_SESSION = 500;
let errorCount = 0;

/**
 * Send log to server
 */
async function sendLog(entry: ClientLogEntry): Promise<void> {
  if (typeof window === 'undefined') return;
  if (errorCount >= MAX_ERRORS_PER_SESSION) return;

  // Dedupe by message
  const key = `${entry.level}:${entry.message}`;
  if (sentErrors.has(key)) return;
  sentErrors.add(key);
  errorCount++;

  try {
    await fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...entry,
        url: window.location.href,
      }),
    });
  } catch {
    // Can't log the logger failing
  }
}

/**
 * Initialize error capturing
 */
function initClientErrorLogger(): void {
  if (typeof window === 'undefined') return;

  // Skip in production
  if (process.env.NODE_ENV !== 'development') return;

  // Skip in test/E2E environment (navigator.webdriver is set by Playwright, Selenium, etc.)
  if (typeof navigator !== 'undefined' && navigator.webdriver) return;

  // Global error handler
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    sendLog({
      level: 'error',
      message: String(message),
      stack: error?.stack,
      context: {
        source,
        line: lineno,
        column: colno,
      },
    });

    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }
    return false;
  };

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    sendLog({
      level: 'error',
      message: `Unhandled Promise Rejection: ${reason?.message || String(reason)}`,
      stack: reason?.stack,
      context: {
        type: 'unhandledrejection',
      },
    });
  });

  // Intercept console.error - intentionally accessing console for interception
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalConsoleError = (console as any).error.bind(console);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (console as any).error = (...args: unknown[]) => {
    const message = args.map(arg => {
      if (arg instanceof Error) return arg.message;
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    // Filter out known non-critical errors
    if (message.includes('clipboard') && message.includes('model does not support image input')) {
      return; // Silently ignore Azure Realtime SDK clipboard warnings
    }

    const errorArg = args.find(arg => arg instanceof Error);

    sendLog({
      level: 'error',
      message: `[console.error] ${message}`,
      stack: errorArg?.stack,
    });

    originalConsoleError.apply(console, args);
  };

  // Intercept console.warn - intentionally accessing console for interception
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalConsoleWarn = (console as any).warn.bind(console);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (console as any).warn = (...args: unknown[]) => {
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    sendLog({
      level: 'warn',
      message: `[console.warn] ${message}`,
    });

    originalConsoleWarn.apply(console, args);
  };

  // Intercept fetch errors
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);

      // Log failed HTTP responses (4xx, 5xx)
      if (!response.ok && !String(args[0]).includes('/api/debug/log')) {
        sendLog({
          level: 'warn',
          message: `Fetch failed: ${response.status} ${response.statusText}`,
          context: {
            url: String(args[0]),
            status: response.status,
          },
        });
      }

      return response;
    } catch (error) {
      // Network errors
      if (!String(args[0]).includes('/api/debug/log')) {
        sendLog({
          level: 'error',
          message: `Fetch error: ${error instanceof Error ? error.message : String(error)}`,
          context: {
            url: String(args[0]),
          },
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
      throw error;
    }
  };

  // Log initialization
  sendLog({
    level: 'info',
    message: '--- Client error logger initialized ---',
    context: {
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    },
  });
}

// Auto-initialize
initClientErrorLogger();

/**
 * Manual logging API for components
 */
export const clientLog = {
  error: (message: string, context?: Record<string, unknown>) => {
    sendLog({ level: 'error', message, context });
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    sendLog({ level: 'warn', message, context });
  },
  info: (message: string, context?: Record<string, unknown>) => {
    sendLog({ level: 'info', message, context });
  },
  debug: (message: string, context?: Record<string, unknown>) => {
    sendLog({ level: 'debug', message, context });
  },
};

export default clientLog;
