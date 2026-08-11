/**
 * Tier Seeding Tests
 *
 * These tests used to assert on literals declared inside the test itself —
 * `expect(999999).toBeGreaterThan(100000)`, `expect(3).toBeLessThan(25)`,
 * and a hand-copied roster of maestro IDs. They passed no matter what the
 * seed did, and indeed kept passing while the roster grew and while a second
 * seed entry point drifted away with stale IDs like 'leonardo-art'.
 *
 * They now call seedTiers() against a fake Prisma client and assert on the
 * arguments it actually sends to the database.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';

import { seedTiers } from '../lib/seeds/tier-seed';
import { BASE_TIER_MAESTRI, ROSTER_IDS } from '../data/roster-ids';

type UpsertCall = {
  where: { code: string };
  update: Record<string, unknown>;
  create: Record<string, unknown>;
};

const upsert = vi.fn();
const prisma = {
  tierDefinition: { upsert },
} as unknown as PrismaClient;

/** The arguments seedTiers passed for one tier code. */
function seededTier(code: 'trial' | 'base' | 'pro'): UpsertCall {
  const call = upsert.mock.calls
    .map(([arg]) => arg as UpsertCall)
    .find((a) => a.where.code === code);
  if (!call) throw new Error(`seedTiers never upserted the ${code} tier`);
  return call;
}

beforeEach(async () => {
  upsert.mockReset();
  upsert.mockImplementation(({ create }: UpsertCall) => Promise.resolve(create));
  await seedTiers(prisma);
});

describe('seedTiers', () => {
  it('seeds exactly the three tiers', () => {
    const codes = upsert.mock.calls.map(([a]) => (a as UpsertCall).where.code);
    expect(codes).toEqual(['trial', 'base', 'pro']);
  });
});

describe('Base tier roster', () => {
  it('is derived from BASE_TIER_MAESTRI, not hand-copied', () => {
    expect(seededTier('base').create.availableMaestri).toEqual([...BASE_TIER_MAESTRI]);
  });

  it('is 20 maestri', () => {
    expect(seededTier('base').create.availableMaestri).toHaveLength(20);
  });

  it('reaches databases that were already seeded, via update', () => {
    expect(seededTier('base').update.availableMaestri).toEqual([...BASE_TIER_MAESTRI]);
  });

  it('uses maestro ids that actually exist in the roster', () => {
    for (const id of seededTier('base').create.availableMaestri as string[]) {
      expect(ROSTER_IDS.maestri).toContain(id);
    }
  });
});

describe('Pro tier roster', () => {
  it('grants the whole roster, however large it currently is', () => {
    const pro = seededTier('pro');
    expect(pro.create.availableMaestri).toEqual([...ROSTER_IDS.maestri]);
    expect(pro.create.availableCoaches).toEqual([...ROSTER_IDS.coaches]);
    expect(pro.create.availableBuddies).toEqual([...ROSTER_IDS.buddies]);
  });

  it('is a strict superset of Base', () => {
    const proIds = seededTier('pro').create.availableMaestri as string[];
    for (const id of BASE_TIER_MAESTRI) expect(proIds).toContain(id);
    expect(proIds.length).toBeGreaterThan(BASE_TIER_MAESTRI.length);
  });

  it('reaches already-seeded databases, so a new maestro is not withheld from paying users', () => {
    expect(seededTier('pro').update.availableMaestri).toEqual([...ROSTER_IDS.maestri]);
  });
});

describe('Per-feature models (ADR 0073)', () => {
  const FEATURE_MODEL_FIELDS = [
    'chatModel',
    'realtimeModel',
    'pdfModel',
    'mindmapModel',
    'quizModel',
    'flashcardsModel',
    'summaryModel',
    'formulaModel',
    'chartModel',
    'homeworkModel',
    'webcamModel',
    'demoModel',
  ];

  it.each(['trial', 'base', 'pro'] as const)('%s sets every per-feature model', (code) => {
    const tier = seededTier(code);
    for (const field of FEATURE_MODEL_FIELDS) {
      expect(tier.create[field], `${code}.${field}`).toBeTruthy();
    }
  });

  it.each(['trial', 'base', 'pro'] as const)(
    '%s applies the models on update too, or a re-seed silently keeps stale ones',
    (code) => {
      const tier = seededTier(code);
      for (const field of FEATURE_MODEL_FIELDS) {
        expect(tier.update[field], `${code}.${field}`).toBeTruthy();
      }
    },
  );

  it('keeps Base on the cheap realtime model, matching tier-fallbacks', () => {
    const base = seededTier('base');
    expect(base.create.realtimeModel).toBe('gpt-realtime-mini');
    expect(base.update.realtimeModel).toBe('gpt-realtime-mini');
  });

  it('gives full realtime only to Pro', () => {
    expect(seededTier('pro').create.realtimeModel).toBe('gpt-realtime');
    expect(seededTier('trial').create.realtimeModel).toBe('gpt-realtime-mini');
  });
});

describe('Trial tier stays locked down', () => {
  it('gates the study and quiz intents', () => {
    const features = seededTier('trial').create.features as Record<string, unknown>;
    expect(features.quizzes).toBe(false);
    expect(features.mindMaps).toBe(false);
  });

  it('re-applies those gates on update, the PR #457 regression', () => {
    const features = seededTier('trial').update.features as Record<string, unknown>;
    expect(features.quizzes).toBe(false);
    expect(features.mindMaps).toBe(false);
  });

  it('offers far fewer maestri than Base', () => {
    const ids = seededTier('trial').create.availableMaestri as string[];
    expect(ids.length).toBeLessThan(BASE_TIER_MAESTRI.length);
    for (const id of ids) expect(ROSTER_IDS.maestri).toContain(id);
  });
});

describe('Tier hierarchy', () => {
  it('escalates limits from trial to base to pro', () => {
    const [trial, base, pro] = [seededTier('trial'), seededTier('base'), seededTier('pro')];
    expect(Number(trial.create.chatLimitDaily)).toBeLessThan(Number(base.create.chatLimitDaily));
    expect(Number(base.create.chatLimitDaily)).toBeLessThan(Number(pro.create.chatLimitDaily));
    expect(Number(trial.create.voiceMinutesDaily)).toBeLessThan(
      Number(base.create.voiceMinutesDaily),
    );
    expect(Number(base.create.voiceMinutesDaily)).toBeLessThan(
      Number(pro.create.voiceMinutesDaily),
    );
  });

  it('orders the tiers for display', () => {
    const [trial, base, pro] = [seededTier('trial'), seededTier('base'), seededTier('pro')];
    expect(Number(trial.create.sortOrder)).toBeLessThan(Number(base.create.sortOrder));
    expect(Number(base.create.sortOrder)).toBeLessThan(Number(pro.create.sortOrder));
  });

  it('charges only for Pro', () => {
    const [trial, base, pro] = [seededTier('trial'), seededTier('base'), seededTier('pro')];
    expect(trial.create.monthlyPriceEur).toBeNull();
    expect(base.create.monthlyPriceEur).toBeNull();
    expect(String(pro.create.monthlyPriceEur)).toBe('9.99');
  });
});
