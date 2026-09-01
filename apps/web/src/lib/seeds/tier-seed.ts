/**
 * Tier Seeding Module
 *
 * Creates default tier definitions (Trial, Base, Pro) in the database.
 * Plan 073: T1-04 - Create seed data: Trial, Base, Pro defaults
 */

import { PrismaClient, Prisma } from '@prisma/client';
import type { TierDefinition } from '@prisma/client';

import { BASE_TIER_MAESTRI, ROSTER_IDS } from '../../data/roster-ids';

// Model defaults from env vars (change in .env to migrate without code changes)
// Every tier chats on the flagship: tutoring quality is not rationed by plan.
// The three names are kept so the env vars stay meaningful, but they default
// to the same model on purpose.
const CHAT_FLAGSHIP = 'gpt-5.6-sol';
const CHAT_MODEL = process.env.DEFAULT_CHAT_MODEL || CHAT_FLAGSHIP;
const CHAT_MODEL_EDU = process.env.DEFAULT_CHAT_MODEL_EDU || CHAT_FLAGSHIP;
const CHAT_MODEL_PRO = process.env.DEFAULT_CHAT_MODEL_PRO || CHAT_FLAGSHIP;
const DEMO_MODEL = process.env.DEFAULT_DEMO_MODEL || 'gpt-5-nano';

/**
 * Per-feature model assignments (ADR 0073).
 *
 * These used to live only in the standalone `prisma/seed-tiers.ts`, which
 * duplicated this whole file. A database initialised through that entry point
 * got per-feature models but a stale maestri list; one seeded through here got
 * the right roster but no per-feature models. Both are now defined once, and
 * the standalone script is a thin wrapper around this function.
 *
 * Values match `createFallbackTier()` in tier-fallbacks.ts, which is what the
 * app serves when the database row is missing — the two must not disagree.
 * Note Base uses `gpt-realtime-mini`, not `gpt-realtime`: the old standalone
 * seed said otherwise and would have quietly upgraded every Base user to the
 * expensive realtime model on the next re-seed.
 */
const TRIAL_MODELS = {
  chatModel: CHAT_MODEL,
  realtimeModel: 'gpt-realtime-mini',
  pdfModel: CHAT_MODEL,
  mindmapModel: CHAT_MODEL,
  quizModel: CHAT_MODEL,
  flashcardsModel: CHAT_MODEL,
  summaryModel: CHAT_MODEL,
  formulaModel: CHAT_MODEL,
  chartModel: CHAT_MODEL,
  homeworkModel: CHAT_MODEL,
  webcamModel: CHAT_MODEL,
  demoModel: DEMO_MODEL,
} as const;

const BASE_MODELS = {
  chatModel: CHAT_MODEL_EDU,
  realtimeModel: 'gpt-realtime-mini',
  pdfModel: CHAT_MODEL,
  mindmapModel: CHAT_MODEL,
  quizModel: CHAT_MODEL_EDU,
  flashcardsModel: CHAT_MODEL,
  summaryModel: CHAT_MODEL,
  formulaModel: CHAT_MODEL_EDU,
  chartModel: CHAT_MODEL,
  homeworkModel: CHAT_MODEL_EDU,
  webcamModel: CHAT_MODEL_EDU,
  demoModel: DEMO_MODEL,
} as const;

const PRO_MODELS = {
  chatModel: CHAT_MODEL_PRO,
  realtimeModel: 'gpt-realtime',
  pdfModel: CHAT_MODEL_PRO,
  mindmapModel: CHAT_MODEL_PRO,
  quizModel: CHAT_MODEL_PRO,
  flashcardsModel: CHAT_MODEL_PRO,
  summaryModel: CHAT_MODEL_PRO,
  formulaModel: CHAT_MODEL_PRO,
  chartModel: CHAT_MODEL_PRO,
  homeworkModel: CHAT_MODEL_PRO,
  webcamModel: CHAT_MODEL_PRO,
  demoModel: DEMO_MODEL,
} as const;

/**
 * Seed tier definitions into the database
 * Creates or updates three tiers: Trial (free, limited), Base (freemium), Pro (paid, unlimited)
 */
export async function seedTiers(prisma: PrismaClient): Promise<{
  trial: TierDefinition;
  base: TierDefinition;
  pro: TierDefinition;
}> {
  // Trial Tier - Free tier with limited features
  //
  // Trial gates the "Studiare" (mindMaps) and "Mettiti alla prova" (quizzes)
  // intents — only "Compiti" (homework, chat+voice) is available. Source of
  // truth: .claude/rules/tier.md + the inline fallback in tier-fallbacks.ts
  // (createFallbackTier(TRIAL)). Keeping these `true` let anonymous Trial
  // users open study/quizMe and broke the home-intent E2E lock assertions
  // (T0.2, D-04).
  //
  // IMPORTANT: also applied in `update` (not just `create`) — upsert with
  // `update: {}` would leave a pre-existing `trial` row's stale `features`
  // untouched on every re-seed (dev/stage/CI DBs seeded before this fix),
  // so Trial users could still reach the locked intents (review finding,
  // PR #457). Production rows still need the separate backfill tracked as
  // D-59 (seeds don't re-run automatically against live prod data).
  const trialFeatures = {
    chat: true,
    voice: true,
    flashcards: true,
    quizzes: false,
    mindMaps: false,
    tools: ['pdf', 'chat'],
    coachesAvailable: ['melissa'],
    buddiesAvailable: ['mario'],
  };
  const trial = await prisma.tierDefinition.upsert({
    where: { code: 'trial' },
    update: { features: trialFeatures, ...TRIAL_MODELS },
    create: {
      code: 'trial',
      name: 'Trial',
      description: 'Free trial tier with limited access',
      chatLimitDaily: 10,
      voiceMinutesDaily: 5,
      toolsLimitDaily: 10,
      docsLimitTotal: 1,
      videoVisionSecondsPerSession: 0,
      videoVisionMinutesMonthly: 0,
      ...TRIAL_MODELS,
      features: trialFeatures,
      availableMaestri: ['leonardo', 'galileo', 'curie'],
      availableCoaches: ['melissa'],
      availableBuddies: ['mario'],
      availableTools: ['pdf', 'chat'],
      monthlyPriceEur: null,
      sortOrder: 1,
      isActive: true,
    },
  });

  // Base Tier - free tier, a curriculum-complete subset of the roster
  //
  // Same reasoning as Pro below: the list is applied in `update` too, because
  // with `update: {}` an already-seeded database keeps its old row forever and
  // a change here would never reach the students already using the product.
  const baseMaestri = [...BASE_TIER_MAESTRI];

  const base = await prisma.tierDefinition.upsert({
    where: { code: 'base' },
    update: {
      availableMaestri: baseMaestri,
      ...BASE_MODELS,
    },
    create: {
      code: 'base',
      name: 'Base',
      description: 'Freemium tier with access to all maestri',
      chatLimitDaily: 50,
      voiceMinutesDaily: 30,
      toolsLimitDaily: 30,
      docsLimitTotal: 5,
      videoVisionSecondsPerSession: 0,
      videoVisionMinutesMonthly: 0,
      ...BASE_MODELS,
      features: {
        chat: true,
        voice: true,
        flashcards: true,
        quizzes: true,
        mindMaps: true,
        tools: ['pdf', 'chat', 'flashcards', 'mindmap'],
        coachesAvailable: ['melissa', 'roberto', 'chiara'],
        buddiesAvailable: ['mario', 'noemi', 'enea'],
        parentDashboard: true,
      },
      availableMaestri: baseMaestri,
      availableCoaches: ['melissa', 'roberto', 'chiara', 'andrea', 'favij'],
      availableBuddies: ['mario', 'noemi', 'enea', 'bruno', 'sofia'],
      availableTools: ['pdf', 'chat', 'flashcards', 'mindmap', 'quiz', 'formula'],
      monthlyPriceEur: null,
      sortOrder: 2,
      isActive: true,
    },
  });

  // Pro Tier - Paid tier with unlimited features
  //
  // Pro grants the whole roster, so the list is derived rather than typed:
  // a hand-maintained copy drifts the moment a maestro is added, and the
  // paid-tier copy promises "all the Maestri" in five languages.
  const proMaestri = [...ROSTER_IDS.maestri];
  const proCoaches = [...ROSTER_IDS.coaches];
  const proBuddies = [...ROSTER_IDS.buddies];

  // IMPORTANT: the roster is applied in `update` too, not just `create`.
  // With `update: {}` an already-seeded database (dev/stage/CI, and prod once
  // backfilled) keeps its stale row forever, so a newly added maestro would
  // never reach paying users — the same bug fixed for Trial in PR #457.
  const pro = await prisma.tierDefinition.upsert({
    where: { code: 'pro' },
    update: {
      availableMaestri: proMaestri,
      availableCoaches: proCoaches,
      availableBuddies: proBuddies,
      ...PRO_MODELS,
    },
    create: {
      code: 'pro',
      name: 'Pro',
      description: 'Professional tier with unlimited access and priority support',
      chatLimitDaily: 999999,
      voiceMinutesDaily: 999999,
      toolsLimitDaily: 999999,
      docsLimitTotal: 999999,
      videoVisionSecondsPerSession: 60,
      videoVisionMinutesMonthly: 10,
      ...PRO_MODELS,
      features: {
        chat: true,
        voice: true,
        flashcards: true,
        quizzes: true,
        mindMaps: true,
        tools: [
          'pdf',
          'chat',
          'flashcards',
          'mindmap',
          'quiz',
          'formula',
          'webcam',
          'homework',
          'chart',
        ],
        coachesAvailable: proCoaches,
        buddiesAvailable: proBuddies,
        parentDashboard: true,
        prioritySupport: true,
        advancedAnalytics: true,
        unlimitedStorage: true,
      },
      availableMaestri: proMaestri,
      availableCoaches: proCoaches,
      availableBuddies: proBuddies,
      availableTools: [
        'pdf',
        'chat',
        'flashcards',
        'mindmap',
        'quiz',
        'formula',
        'webcam',
        'homework',
        'chart',
      ],
      stripePriceId: process.env.STRIPE_PRICE_PRO || undefined,
      monthlyPriceEur: new Prisma.Decimal('9.99'),
      sortOrder: 3,
      isActive: true,
    },
  });

  return { trial, base, pro };
}
