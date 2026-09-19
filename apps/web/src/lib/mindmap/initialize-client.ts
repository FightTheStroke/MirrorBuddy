'use client';
import { z } from 'zod';
import { csrfFetch } from '@/lib/auth';
import { snapshotSchema } from './protocol';

export async function initializeClientMap(
  toolId: string,
  source: string | null,
  content: unknown,
  signal: AbortSignal,
  expectedPrincipal?: string,
) {
  const authResponse = await fetch('/api/auth/me', { signal, cache: 'no-store' });
  let sessionId = source;
  let owner: string;
  if (authResponse.ok) {
    const auth = z.object({ user: z.object({ id: z.string() }) }).parse(await authResponse.json());
    owner = auth.user.id;
    if (expectedPrincipal && expectedPrincipal !== owner) throw new Error('Mindmap owner changed');
    const stored = await fetch(`/api/materials/${encodeURIComponent(toolId)}`, {
      signal,
      cache: 'no-store',
    });
    if (stored.ok) {
      const material = z
        .object({
          material: z.object({
            mindmapSourceSession: z.string().nullable().optional(),
          }),
        })
        .parse(await stored.json());
      sessionId = material.material.mindmapSourceSession || source;
    } else if (stored.status !== 404) throw new Error(`Mindmap lookup HTTP ${stored.status}`);
    sessionId ||= `map-${toolId}`;
  } else {
    const failure = z.object({ code: z.string().optional() }).parse(await authResponse.json());
    if (authResponse.status !== 401 || failure.code !== 'AUTH_ABSENT')
      throw new Error(`Mindmap authentication HTTP ${authResponse.status}`);
    if (expectedPrincipal && expectedPrincipal !== 'trial')
      throw new Error('Mindmap owner changed');
    const trialResponse = await fetch('/api/trial/session', { signal, cache: 'no-store' });
    if (!trialResponse.ok) throw new Error(`Mindmap trial HTTP ${trialResponse.status}`);
    const trial = z.object({ sessionId: z.string().min(1) }).parse(await trialResponse.json());
    sessionId = trial.sessionId;
    owner = `trial:${sessionId}`;
  }
  const response = await csrfFetch('/api/tools/mindmap', {
    method: 'POST',
    signal,
    body: JSON.stringify({ toolId, sessionId, content }),
  });
  if (!response.ok) throw new Error(`Mindmap initialization HTTP ${response.status}`);
  const snapshot = snapshotSchema.parse(await response.json());
  if (snapshot.toolId !== toolId || snapshot.sessionId !== sessionId)
    throw new Error('Mindmap initialization identity mismatch');
  return { owner, snapshot };
}
