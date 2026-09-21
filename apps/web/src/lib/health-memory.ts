import { totalmem } from 'node:os';

const MB = 1024 * 1024;

export interface MemoryCheck {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  heapUsedMB: number;
  heapTotalMB: number;
  usagePercent: number;
  rssUsedMB: number;
  memoryLimitMB: number;
  limitSource: 'function' | 'system';
}

export function checkMemory(): MemoryCheck {
  const memory = process.memoryUsage();
  const configuredBytes = Number(process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE?.trim()) * MB;
  const hasFunctionLimit = Number.isFinite(configuredBytes) && configuredBytes > 0;
  const limitBytes = hasFunctionLimit ? configuredBytes : totalmem();
  const limitSource = hasFunctionLimit ? 'function' : 'system';
  const percent = (memory.rss / limitBytes) * 100;
  const usagePercent = Math.round(percent);
  const rssUsedMB = Math.round(memory.rss / MB);
  const heapUsedMB = Math.round(memory.heapUsed / MB);
  const heapTotalMB = Math.round(memory.heapTotal / MB);
  const memoryLimitMB = Math.round(limitBytes / MB);
  const denominator = hasFunctionLimit ? 'function limit' : 'system memory';

  return {
    // Classify before display rounding so 69.9% passes and 90.1% fails.
    status: percent > 90 ? 'fail' : percent >= 70 ? 'warn' : 'pass',
    message: `RSS ${rssUsedMB}MB / ${memoryLimitMB}MB ${denominator} (${usagePercent}%); heap ${heapUsedMB}MB / ${heapTotalMB}MB`,
    heapUsedMB,
    heapTotalMB,
    usagePercent,
    rssUsedMB,
    memoryLimitMB,
    limitSource,
  };
}
