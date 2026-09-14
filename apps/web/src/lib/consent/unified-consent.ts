import { z } from 'zod';
import { TOS_VERSION } from '@/lib/tos/constants';

export const UNIFIED_CONSENT_KEY = 'mirrorbuddy-unified-consent';
export const CONSENT_VERSION = '1.0';
export const CONSENT_LOADED_KEY = 'mirrorbuddy-consent-loaded';
export type ConsentPurpose = 'terms' | 'analytics';
export type ConsentErrorCode =
  | 'storage'
  | 'network'
  | 'http'
  | 'invalid-response'
  | 'invalid-intent'
  | 'identity'
  | 'superseded';
export class ConsentSyncError extends Error {
  readonly retryable: boolean;
  constructor(
    readonly code: ConsentErrorCode,
    readonly status?: number,
  ) {
    super(`Consent ${code}${status === undefined ? '' : ` (${status})`}`);
    this.name = 'ConsentSyncError';
    this.retryable = code !== 'invalid-intent' && code !== 'superseded';
  }
}
/** Transient auth-context generation, never part of the persisted consent record. */
export interface ConsentIdentity {
  readonly account: string | null;
  readonly generation: number;
}
export interface ConsentSyncSnapshot {
  ready: boolean;
  status: 'idle' | 'loading' | 'pending' | 'error' | 'saved';
  pending: ConsentPurpose[];
  error: {
    code: ConsentErrorCode;
    status?: number;
    retryable: boolean;
    scope?: ConsentPurpose | 'initialization';
  } | null;
  confirmations: Partial<Record<ConsentPurpose, 'local' | 'received' | 'persisted'>>;
}

/** null is unanswered/unknown, not refusal; empty metadata means it was not recorded. */
export interface ConsentDecision {
  accepted: boolean | null;
  version: string;
  acceptedAt: string;
}

/** The existing v1 contract, with independent decision metadata and no new legal purposes. */
export interface UnifiedConsentData {
  version: string;
  /** Technical delivery state, not additional consent purposes. */
  pending?: ConsentPurpose[];
  tos: ConsentDecision;
  cookies: {
    essential: true;
    analytics: boolean | null;
    version: string;
    acceptedAt: string;
  };
}

export function emptyConsent(): UnifiedConsentData {
  return {
    version: CONSENT_VERSION,
    tos: { accepted: null, version: '', acceptedAt: '' },
    cookies: { essential: true, analytics: null, version: '', acceptedAt: '' },
  };
}

const timestampSchema = z.string().datetime({ offset: true });
export const cookieConsentSchema = z.object({
  version: z.literal(CONSENT_VERSION),
  acceptedAt: timestampSchema,
  essential: z.literal(true),
  analytics: z.boolean(),
  marketing: z.literal(false),
});
export const cookieAcknowledgementSchema = z
  .object({
    success: z.literal(true),
    consent: cookieConsentSchema,
    persisted: z.boolean(),
    analyticsAllowed: z.boolean(),
  })
  .refine((value) => !value.analyticsAllowed || (value.persisted && value.consent.analytics));
export const termsAcknowledgementSchema = z.object({
  success: z.literal(true),
  version: z.string().min(1),
  acceptedAt: timestampSchema,
});
export const termsResponseSchema = z.discriminatedUnion('accepted', [
  z.object({ accepted: z.literal(true), version: z.string().min(1), acceptedAt: timestampSchema }),
  z.object({ accepted: z.literal(false), version: z.string().min(1) }),
]);
export const cookieResponseSchema = z
  .object({
    consent: cookieConsentSchema.nullable(),
    analyticsAllowed: z.boolean(),
  })
  .refine((value) => !value.analyticsAllowed || value.consent?.analytics === true);

export function isConsentTimestamp(value: unknown): value is string {
  return timestampSchema.safeParse(value).success;
}

export function assertConsentChoice(value: unknown): asserts value is boolean {
  if (typeof value !== 'boolean') throw new TypeError('Consent choice must be a boolean');
}
export function hasAcceptedTerms(consent: UnifiedConsentData | null | undefined): boolean {
  return (
    consent?.tos.accepted === true &&
    consent.tos.version === TOS_VERSION &&
    !consent.pending?.includes('terms')
  );
}

export function decisionFor(consent: UnifiedConsentData, purpose: ConsentPurpose): ConsentDecision {
  return purpose === 'terms'
    ? consent.tos
    : {
        accepted: consent.cookies.analytics,
        version: consent.cookies.version,
        acceptedAt: consent.cookies.acceptedAt,
      };
}

export function withDecision(
  consent: UnifiedConsentData,
  purpose: ConsentPurpose,
  decision: ConsentDecision,
  pending: boolean,
): UnifiedConsentData {
  const next = { ...consent };
  if (purpose === 'terms') next.tos = decision;
  else
    next.cookies = {
      essential: true,
      analytics: decision.accepted,
      version: decision.version,
      acceptedAt: decision.acceptedAt,
    };
  const purposes = new Set(consent.pending);
  if (pending) purposes.add(purpose);
  else purposes.delete(purpose);
  if (purposes.size) next.pending = [...purposes].sort();
  else delete next.pending;
  return next;
}

export type UnifiedConsent = UnifiedConsentData;
