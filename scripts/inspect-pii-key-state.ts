/**
 * Reports whether the configured PII key is usable and whether any stored
 * email still depends on it. Prints counts and a key length only — never a
 * key, never an email.
 *
 * Run: npm run script -- scripts/inspect-pii-key-state.ts
 */

import { appendFileSync } from 'node:fs';
import { prisma } from '../apps/web/src/lib/db';
import {
  decryptPII,
  DECRYPTION_FAILED_PLACEHOLDER,
} from '../apps/web/src/lib/security/pii-encryption';
import { classifyPiiKeyState, PII_PREFIX } from './lib/pii-key-state';

const SAMPLE_SIZE = 3;

/**
 * Counts how many sampled ciphertexts the configured key can read back.
 * Only the count leaves this function: no email, no key.
 */
async function countDecryptable(ciphertexts: string[]): Promise<number> {
  let decrypted = 0;
  for (const ciphertext of ciphertexts) {
    try {
      const value = await decryptPII(ciphertext, { throwOnError: false });
      if (value && value !== DECRYPTION_FAILED_PLACEHOLDER && !value.startsWith(PII_PREFIX)) {
        decrypted += 1;
      }
    } catch {
      // A failure is the signal we are measuring, not an error to surface.
    }
  }
  return decrypted;
}

async function main(): Promise<void> {
  // Raw SQL bypasses the field encryption layer, which would otherwise try to
  // decrypt with the very key under investigation.
  const rows = await prisma.$queryRaw<Array<{ total: bigint; encrypted: bigint }>>`
    SELECT count(*) AS total,
           count(*) FILTER (WHERE email LIKE ${`${PII_PREFIX}%`}) AS encrypted
    FROM "User"
  `;
  const row = rows[0] ?? { total: 0n, encrypted: 0n };
  const samples = await prisma.$queryRaw<Array<{ email: string }>>`
    SELECT email FROM "User" WHERE email LIKE ${`${PII_PREFIX}%`} LIMIT ${SAMPLE_SIZE}
  `;
  const ciphertexts = samples.map((sample) => sample.email);
  const state = classifyPiiKeyState({
    key: process.env.PII_ENCRYPTION_KEY,
    totalEmails: Number(row.total),
    encryptedEmails: Number(row.encrypted),
    sampled: ciphertexts.length,
    decrypted: await countDecryptable(ciphertexts),
  });
  console.log(JSON.stringify(state));
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `key_matches_data=${state.keyMatchesData}\n`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(`PII key state inspection failed: ${(error as Error)?.message ?? 'unknown'}`);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
