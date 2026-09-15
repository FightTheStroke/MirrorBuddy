import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import {
  AUTH_COOKIE_NAME,
  CSRF_TOKEN_COOKIE,
  CSRF_TOKEN_HEADER,
} from '../../apps/web/src/lib/auth/cookie-constants';

export const STUDENT_SMOKE_ORIGIN = 'https://mirrorbuddy.vercel.app';
export const nativeSmokeToken = z.string().regex(/^s2:[A-Za-z0-9_-]{43}\.[a-f0-9]{64}$/);
const identitySchema = z.object({
  id: z.string().min(1),
  email: z.string().trim().toLowerCase().email(),
  // A username login avoids the email-login historical backfill entirely.
  username: z.string().regex(/^[^\s@]+$/),
  password: z.string().min(1),
});
export type StudentIdentity = z.infer<typeof identitySchema>;
export interface StudentReceipt {
  starting(): Promise<void>;
  token(value: string): Promise<void>;
  revoked(): Promise<void>;
}

export function studentIdentity(env: NodeJS.ProcessEnv | undefined): StudentIdentity {
  const parsed = identitySchema.safeParse({
    id: env?.PROD_TEST_USER_ID,
    email: env?.PROD_TEST_USER_EMAIL,
    username: env?.PROD_TEST_USER_USERNAME,
    password: env?.PROD_TEST_USER_PASSWORD,
  });
  if (!parsed.success) throw new Error('STUDENT_CONFIGURATION_REJECTED');
  return parsed.data;
}

export async function preflightStudent(
  user: { findMany(args: Prisma.UserFindManyArgs): Promise<unknown> },
  identity: StudentIdentity,
): Promise<void> {
  try {
    const expected = identitySchema.parse(identity);
    const emailHash = createHash('sha256').update(expected.email).digest('hex');
    const rows = await user.findMany({
      where: { OR: [{ id: expected.id }, { emailHash }, { username: expected.username }] },
      select: {
        id: true,
        username: true,
        emailHash: true,
        role: true,
        disabled: true,
        isTestData: true,
        mustChangePassword: true,
      },
    });
    z.array(
      z.object({
        id: z.literal(expected.id),
        username: z.literal(expected.username),
        emailHash: z.literal(emailHash),
        role: z.literal('USER'),
        disabled: z.literal(false),
        isTestData: z.literal(true),
        mustChangePassword: z.literal(false),
      }),
    )
      .length(1)
      .parse(rows);
  } catch {
    throw new Error('STUDENT_PREFLIGHT_REJECTED');
  }
}

function cookie(response: Response, name: string): string {
  const values = response.headers.getSetCookie().filter((value) => value.startsWith(`${name}=`));
  if (values.length !== 1) throw new Error('STUDENT_COOKIE_REJECTED');
  return decodeURIComponent(values[0].split(';')[0].slice(name.length + 1));
}

async function request(fetcher: typeof fetch, path: string, options: RequestInit = {}) {
  return fetcher(`${STUDENT_SMOKE_ORIGIN}${path}`, {
    ...options,
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
  });
}

function requireSuccess(response: Response) {
  if (response.status !== 200 || response.redirected) throw new Error('STUDENT_RESPONSE_REJECTED');
}

export async function loginStudent(
  identity: StudentIdentity,
  receipt: StudentReceipt,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  let token: string | undefined;
  try {
    const expected = identitySchema.parse(identity);
    await receipt.starting();
    const response = await request(fetcher, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: STUDENT_SMOKE_ORIGIN },
      body: JSON.stringify({ username: expected.username, password: expected.password }),
    });
    // Persist ownership before parsing the body or trusting status/identity.
    // A lost response stays unresolved, never a successful cleanup receipt.
    if (response.headers.getSetCookie().some((value) => value.startsWith(`${AUTH_COOKIE_NAME}=`))) {
      token = nativeSmokeToken.parse(cookie(response, AUTH_COOKIE_NAME));
      await receipt.token(token);
    }
    requireSuccess(response);
    if (!token) throw new Error('STUDENT_COOKIE_REJECTED');
    z.object({
      user: z.object({
        id: z.literal(expected.id),
        username: z.literal(expected.username),
        role: z.literal('USER'),
        mustChangePassword: z.literal(false),
      }),
    }).parse(await response.json());
    const verified = await request(fetcher, '/api/user', {
      headers: { Cookie: `${AUTH_COOKIE_NAME}=${token}` },
    });
    requireSuccess(verified);
    z.object({
      id: z.literal(expected.id),
      username: z.literal(expected.username),
      role: z.literal('USER'),
      isTestData: z.literal(true),
      disabled: z.literal(false),
    }).parse(await verified.json());
    return token;
  } catch {
    if (token) {
      await logoutStudent(token, fetcher);
      await receipt.revoked();
    }
    throw new Error('STUDENT_LOGIN_FAILED');
  }
}

export async function logoutStudent(token: string, fetcher: typeof fetch = fetch): Promise<void> {
  try {
    nativeSmokeToken.parse(token);
    const auth = `${AUTH_COOKIE_NAME}=${token}`;
    const csrfResponse = await request(fetcher, '/api/session', { headers: { Cookie: auth } });
    requireSuccess(csrfResponse);
    const { csrfToken } = z
      .object({
        csrfToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
      })
      .parse(await csrfResponse.json());
    if (cookie(csrfResponse, CSRF_TOKEN_COOKIE) !== csrfToken)
      throw new Error('STUDENT_CSRF_REJECTED');
    const result = await request(fetcher, '/api/auth/logout', {
      method: 'POST',
      headers: {
        Cookie: `${auth}; ${CSRF_TOKEN_COOKIE}=${csrfToken}`,
        [CSRF_TOKEN_HEADER]: csrfToken,
        'Content-Type': 'application/json',
        Origin: STUDENT_SMOKE_ORIGIN,
      },
      body: JSON.stringify({ scope: 'current' }),
    });
    requireSuccess(result);
    z.object({ success: z.literal(true) }).parse(await result.json());
    const rejected = await request(fetcher, '/api/user', { headers: { Cookie: auth } });
    if (rejected.status !== 401 || rejected.redirected)
      throw new Error('STUDENT_REVOCATION_UNPROVEN');
    z.object({ code: z.literal('SESSION_REJECTED') }).parse(await rejected.json());
  } catch {
    throw new Error('STUDENT_CLEANUP_FAILED');
  }
}
