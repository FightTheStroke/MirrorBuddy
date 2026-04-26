/**
 * Debug Logger - Logs to file for Claude Code to read
 *
 * SERVER SIDE: Writes to logs/debug-session.log (overwritten each session)
 * CLIENT SIDE: Sends errors to /api/debug/log endpoint
 *
 * Usage:
 *   import { debugLog } from '@/lib/debug-logger';
 *   debugLog.error('Component crashed', { stack: error.stack });
 */

import { writeFileSync, mkdirSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface DebugLogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  source: 'client' | 'server';
  context?: Record<string, unknown>;
  stack?: string;
  url?: string;
  userAgent?: string;
}

const LOG_DIR = join(process.cwd(), 'logs');
const LOG_FILE = join(LOG_DIR, 'debug-session.log');

let sessionStarted = false;

/**
 * Initialize log file (clear previous session)
 */
function initLogFile(): void {
  if (sessionStarted) return;

  try {
    if (!existsSync(LOG_DIR)) {
      mkdirSync(LOG_DIR, { recursive: true });
    }

    const header = `
================================================================================
DEBUG SESSION - ${new Date().toISOString()}
================================================================================
MirrorBuddy Debug Log
File: ${LOG_FILE}
Node: ${process.version}
Platform: ${process.platform}
================================================================================

`;
    writeFileSync(LOG_FILE, header);
    sessionStarted = true;
  } catch {
    // Silently fail if we can't write (e.g., in browser)
  }
}

/**
 * Format log entry for file
 */
function formatEntry(entry: DebugLogEntry): string {
  const levelPad = entry.level.toUpperCase().padEnd(5);
  const sourcePad = `[${entry.source.toUpperCase()}]`.padEnd(8);
  const time = entry.timestamp.split('T')[1]?.replace('Z', '') || entry.timestamp;

  let line = `${time} ${levelPad} ${sourcePad} ${entry.message}`;

  if (entry.url) {
    line += `\n         URL: ${entry.url}`;
  }

  if (entry.context && Object.keys(entry.context).length > 0) {
    line += `\n         Context: ${JSON.stringify(entry.context, null, 2).replace(/\n/g, '\n         ')}`;
  }

  if (entry.stack) {
    line += `\n         Stack:\n         ${entry.stack.replace(/\n/g, '\n         ')}`;
  }

  return line + '\n';
}

/**
 * Write to log file (server-side only)
 */
export function writeToLogFile(entry: DebugLogEntry): void {
  if (typeof window !== 'undefined') return; // Client-side, skip

  initLogFile();

  try {
    const formatted = formatEntry(entry);
    appendFileSync(LOG_FILE, formatted);
  } catch {
    // Silently fail
  }
}

/**
 * Server-side debug logger
 */
export const debugLog = {
  error: (message: string, context?: Record<string, unknown>) => {
    writeToLogFile({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      source: 'server',
      context,
      stack: new Error().stack?.split('\n').slice(2).join('\n'),
    });
  },

  warn: (message: string, context?: Record<string, unknown>) => {
    writeToLogFile({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      source: 'server',
      context,
    });
  },

  info: (message: string, context?: Record<string, unknown>) => {
    writeToLogFile({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      source: 'server',
      context,
    });
  },

  debug: (message: string, context?: Record<string, unknown>) => {
    writeToLogFile({
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      source: 'server',
      context,
    });
  },

  /**
   * Log client error received via API
   */
  clientError: (entry: Omit<DebugLogEntry, 'source'>) => {
    writeToLogFile({ ...entry, source: 'client' });
  },
};

/**
 * Get log file path for reading
 */
export function getLogFilePath(): string {
  return LOG_FILE;
}
