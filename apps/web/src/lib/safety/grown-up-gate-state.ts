/**
 * Child-resistant "grown-up gate" state (COMP-01 / #431, #432).
 *
 * A speed-bump age screen — NOT verifiable parental consent — placed before
 * surfaces that collect a minor's data (`/invite/request`) or expose adult/
 * account areas ("Per i grandi"). It reduces the chance a child self-submits
 * PII or wanders into account settings, and signals screening intent. The
 * legal sufficiency of this gate (vs. real verifiable parental consent) is a
 * decision for legal review — see docs/compliance/trial-minors-guardrails.md.
 *
 * "Verified" is per browser session (sessionStorage): a grown-up who passes
 * once is not re-challenged for the rest of the session, but the barrier
 * returns next session. (ADR 0015 sessionStorage derogation — ephemeral,
 * per-session UI state, no PII.)
 */

const VERIFIED_KEY = 'mirrorbuddy-grownup-verified';

export function isGrownUpVerified(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(VERIFIED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setGrownUpVerified(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(VERIFIED_KEY, '1');
  } catch {
    // sessionStorage unavailable (private mode / SSR) — fail closed: the gate
    // simply re-prompts, which is the safe direction for a minor-facing screen.
  }
}

export interface GrownUpChallenge {
  a: number;
  b: number;
  answer: number;
}

/**
 * Two 2-digit addends: trivial for an adult / older teen, a real hurdle for a
 * 6-9-year-old. Randomized so it can't be muscle-memorized.
 */
export function makeGrownUpChallenge(): GrownUpChallenge {
  const a = 11 + Math.floor(Math.random() * 39); // 11..49
  const b = 11 + Math.floor(Math.random() * 39); // 11..49
  return { a, b, answer: a + b };
}
