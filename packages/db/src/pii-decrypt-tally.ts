/**
 * Per-query tally of PII decryptions, flushed as one audit batch.
 *
 * Reading N users used to write N audit rows (plus one bulk row per field),
 * an N+1 insert pattern on every list query (#1160). The audit keeps the same
 * information — which model and field, how many records — in one statement.
 *
 * @module db/pii-decrypt-tally
 */

import { logDecryptAccessBatch } from '@/lib/security';

export type DecryptTally = Map<string, { model: string; field: string; count: number }>;

export function createDecryptTally(): DecryptTally {
  return new Map();
}

export function countDecrypt(tally: DecryptTally, model: string, field: string): void {
  const key = `${model}.${field}`;
  const entry = tally.get(key);
  if (entry) entry.count += 1;
  else tally.set(key, { model, field, count: 1 });
}

export function flushDecryptTally(tally: DecryptTally): void {
  if (tally.size === 0) return;
  logDecryptAccessBatch(
    Array.from(tally.values(), ({ model, field, count }) => ({
      model,
      field,
      context: { operation: 'decrypt', recordCount: count, bulkOperation: count > 1 },
    })),
  );
}
