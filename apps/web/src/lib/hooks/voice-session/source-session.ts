'use client';

import { z } from 'zod';

/** Resolve trial identity before map creation; rejected credentials never select trial. */
export async function resolveVoiceSourceSession(authenticatedSource: string): Promise<string> {
  const auth = await fetch('/api/auth/me', { cache: 'no-store' });
  if (auth.ok) return authenticatedSource;
  const failure = z.object({ code: z.string().optional() }).parse(await auth.json());
  if (auth.status !== 401 || failure.code !== 'AUTH_ABSENT')
    throw new Error('Voice session authentication rejected');
  const response = await fetch('/api/trial/session', { cache: 'no-store' });
  if (!response.ok) throw new Error('Trial voice session unavailable');
  const trial = z.object({ sessionId: z.string().min(1) }).safeParse(await response.json());
  if (!trial.success) throw new Error('An owned trial session is required before voice');
  return trial.data.sessionId;
}
