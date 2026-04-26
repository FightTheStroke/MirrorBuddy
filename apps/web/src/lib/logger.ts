/**
 * Logger Re-export
 *
 * Backward compatibility - re-exports from new structured logger module.
 * Import from '@/lib/logger' or '@/lib/logger/index' - both work.
 */

export { logger, type LogLevel, type LogContext } from './logger/index';
export { logger as default } from './logger/index';
