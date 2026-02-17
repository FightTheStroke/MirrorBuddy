/**
 * Funnel Constants
 * Shared constants that can be imported by client and server components
 * Plan 069 - Conversion Funnel Dashboard
 */

export const FUNNEL_STAGES = [
  'WAITLIST_SIGNUP',
  'WAITLIST_VERIFIED',
  'VISITOR',
  'TRIAL_START',
  'TRIAL_ENGAGED',
  'LIMIT_HIT',
  'BETA_REQUEST',
  'APPROVED',
  'FIRST_LOGIN',
  'ACTIVE',
  'CHURNED',
] as const;

export type FunnelStage = (typeof FUNNEL_STAGES)[number];
