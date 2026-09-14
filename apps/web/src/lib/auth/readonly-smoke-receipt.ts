import 'server-only';
import { z } from 'zod';
import { signCookieValue, verifyCookieValue } from './cookie-signing';

export const READONLY_SMOKE_SECONDS = 3600;
const prefix = 'rs1:';
const receiptSchema = z
  .object({
    handleHash: z.string().regex(/^[a-f0-9]{64}$/),
    userId: z.string().min(1).max(128),
    emailHash: z.string().regex(/^[a-f0-9]{64}$/),
    authVersion: z.number().int().min(0).max(2_147_483_647),
    issuedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  })
  .strict()
  .refine(
    (value) =>
      new Date(value.expiresAt).getTime() - new Date(value.issuedAt).getTime() ===
      READONLY_SMOKE_SECONDS * 1000,
  );

export type ReadonlySmokeReceipt = z.infer<typeof receiptSchema>;

export function signReadonlySmokeReceipt(value: ReadonlySmokeReceipt): string {
  const parsed = receiptSchema.safeParse(value);
  if (!parsed.success) throw new Error('Invalid readonly smoke receipt metadata');
  return signCookieValue(prefix + Buffer.from(JSON.stringify(parsed.data)).toString('base64url'))
    .signed;
}

export function readReadonlySmokeReceipt(receipt: unknown): ReadonlySmokeReceipt {
  if (typeof receipt !== 'string' || receipt.length > 2048)
    throw new Error('Invalid readonly smoke receipt');
  const parts = receipt.split('.');
  if (
    parts.length !== 2 ||
    !parts[0].startsWith(prefix) ||
    !/^[A-Za-z0-9_-]+$/.test(parts[0].slice(prefix.length)) ||
    !/^[a-f0-9]{64}$/.test(parts[1])
  )
    throw new Error('Invalid readonly smoke receipt');
  const verified = verifyCookieValue(receipt);
  if (!verified.valid || verified.value !== parts[0])
    throw new Error('Invalid readonly smoke receipt signature');
  const encoded = parts[0].slice(prefix.length);
  const buffer = Buffer.from(encoded, 'base64url');
  if (buffer.toString('base64url') !== encoded) throw new Error('Invalid readonly smoke receipt');
  let decoded: unknown;
  try {
    decoded = JSON.parse(buffer.toString('utf8'));
  } catch {
    throw new Error('Invalid readonly smoke receipt JSON');
  }
  const parsed = receiptSchema.safeParse(decoded);
  if (!parsed.success) throw new Error('Invalid readonly smoke receipt metadata');
  return parsed.data;
}
