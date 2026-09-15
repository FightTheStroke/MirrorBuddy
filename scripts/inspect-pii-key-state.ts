/**
 * Reports whether the configured PII key is usable and whether any stored
 * email still depends on it. Prints counts and a key length only — never a
 * key, never an email.
 *
 * Run: npm run script -- scripts/inspect-pii-key-state.ts
 */

import { prisma } from '../apps/web/src/lib/db';
import { classifyPiiKeyState, PII_PREFIX } from './lib/pii-key-state';

async function main(): Promise<void> {
  // Raw SQL bypasses the field encryption layer, which would otherwise try to
  // decrypt with the very key under investigation.
  const rows = await prisma.$queryRaw<Array<{ total: bigint; encrypted: bigint }>>`
    SELECT count(*) AS total,
           count(*) FILTER (WHERE email LIKE ${`${PII_PREFIX}%`}) AS encrypted
    FROM "User"
  `;
  const row = rows[0] ?? { total: 0n, encrypted: 0n };
  const state = classifyPiiKeyState({
    key: process.env.PII_ENCRYPTION_KEY,
    totalEmails: Number(row.total),
    encryptedEmails: Number(row.encrypted),
  });
  console.log(JSON.stringify(state));
}

main()
  .catch((error: unknown) => {
    console.error(`PII key state inspection failed: ${(error as Error)?.message ?? 'unknown'}`);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
