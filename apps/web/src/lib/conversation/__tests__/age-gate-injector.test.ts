/**
 * T1.10 (D-10): age-based prompt adaptation was fully implemented in
 * @/lib/safety but had zero call-sites. These tests cover the shared
 * chat/voice injector: same base prompt, different profile ages must
 * produce different (age-adapted) instructions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

import { applyAgeGatePrompt } from '../age-gate-injector';
import { prisma } from '@/lib/db';

describe('applyAgeGatePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the prompt unchanged when there is no userId (anonymous/Trial)', async () => {
    const result = await applyAgeGatePrompt('base prompt', undefined);
    expect(result).toBe('base prompt');
    expect(prisma.profile.findUnique).not.toHaveBeenCalled();
  });

  it('returns the prompt unchanged when the profile has no age on file', async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({ age: null } as never);

    const result = await applyAgeGatePrompt('base prompt', 'user-1');
    expect(result).toBe('base prompt');
  });

  it('appends age-adapted guidance when a real age is on file', async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({ age: 8 } as never);

    const result = await applyAgeGatePrompt('base prompt', 'user-child');
    expect(result).toContain('base prompt');
    expect(result).toContain('8 ANNI');
  });

  it('the same base prompt produces different instructions for different ages', async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValueOnce({ age: 7 } as never);
    const childResult = await applyAgeGatePrompt('base prompt', 'user-child');

    vi.mocked(prisma.profile.findUnique).mockResolvedValueOnce({ age: 17 } as never);
    const teenResult = await applyAgeGatePrompt('base prompt', 'user-teen');

    expect(childResult).not.toBe(teenResult);
    expect(childResult).toContain('7 ANNI');
    expect(teenResult).toContain('17 ANNI');
  });

  it('never throws and falls back to the base prompt on a DB error', async () => {
    vi.mocked(prisma.profile.findUnique).mockRejectedValue(new Error('DB down'));

    const result = await applyAgeGatePrompt('base prompt', 'user-1');
    expect(result).toBe('base prompt');
  });
});
