/**
 * T1.10 (D-10): age-based prompt adaptation.
 *
 * `getAgeGatePrompt`/`filterForAge` in `@/lib/safety` were fully implemented
 * and unit-tested but had zero call-sites — every student got the exact same
 * instructions regardless of age. This appends the age-appropriate language/
 * topic guidance to the system prompt whenever a real profile age is on
 * record, shared by chat (non-streaming + streaming) and voice.
 *
 * Missing/invalid age (anonymous Trial users, profile not yet completed) is
 * the common case and must never throw — the base prompt is used unchanged.
 */

import { prisma } from '@/lib/db';
import { getAgeGatePrompt } from '@/lib/safety';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'age-gate-injector' });

/**
 * Fetch the user's on-file age (if any) and append age-adapted instructions
 * to the system prompt. Returns the prompt unchanged when there is no
 * userId, no profile, or no age recorded.
 */
export async function applyAgeGatePrompt(
  systemPrompt: string,
  userId: string | undefined,
): Promise<string> {
  if (!userId) return systemPrompt;

  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { age: true },
    });
    if (!profile?.age) return systemPrompt;

    return `${systemPrompt}\n${getAgeGatePrompt(profile.age)}`;
  } catch (error) {
    // Age adaptation is a quality enhancement, not a safety gate on its own
    // (content filtering/crisis detection run independently) — never let a
    // DB hiccup here block the chat/voice response.
    log.warn('Failed to load profile age for age-gate prompt', { error: String(error) });
    return systemPrompt;
  }
}
