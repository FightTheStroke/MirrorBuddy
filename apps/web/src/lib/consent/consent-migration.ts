import { logger } from '@/lib/logger';
import {
  CONSENT_VERSION,
  UNIFIED_CONSENT_KEY,
  emptyConsent,
  isConsentTimestamp,
  type ConsentDecision,
  type UnifiedConsentData,
} from './unified-consent';

export interface LegacyConsentSources {
  unified?: unknown;
  cookies?: unknown;
  sessionTerms?: unknown;
  serverTerms?: unknown;
  /** Actual GET /api/user/consent response: { consent: ... }, not a flat payload. */
  serverCookies?: unknown;
  trial?: unknown;
}

export interface ConsentMigrationResult {
  consent: UnifiedConsentData | null;
  /** Source/field names only; never include input values or identifying data. */
  issues: string[];
}

function record(value: unknown, path: string, issues: string[]): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      issues.push(`${path}: invalid JSON`);
      return null;
    }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    issues.push(`${path}: expected object`);
    return null;
  }
  return value as Record<string, unknown>;
}

function decision(
  value: Record<string, unknown>,
  flag: string,
  version: unknown,
  path: string,
  issues: string[],
): ConsentDecision {
  const accepted = value[flag];
  const acceptedAt = value.acceptedAt;
  const validFlag = accepted === true || accepted === false || accepted == null;
  const validVersion = typeof version === 'string' && version.trim().length > 0;
  const dated = isConsentTimestamp(acceptedAt);
  if (!validFlag) issues.push(`${path}: invalid choice`);
  if (version != null && version !== '' && !validVersion) issues.push(`${path}: invalid version`);
  if (acceptedAt != null && acceptedAt !== '' && !dated) {
    issues.push(`${path}: invalid timestamp`);
  }
  // Terms session evidence never recorded a date. Analytics records always did.
  const undatedTerms = flag === 'accepted' && (acceptedAt == null || acceptedAt === '');
  const supportedAnalytics = flag !== 'analytics' || version === CONSENT_VERSION;
  const validAcceptance = validVersion && (undatedTerms || dated) && supportedAnalytics;
  if (accepted === true && !validAcceptance) issues.push(`${path}: incomplete acceptance metadata`);
  return {
    accepted: accepted === false ? false : accepted === true && validAcceptance ? true : null,
    version: validVersion ? version : '',
    acceptedAt: dated ? acceptedAt : '',
  };
}

function choose(candidates: ConsentDecision[]): ConsentDecision | undefined {
  // Refusal beats acceptance regardless of source order or timestamp.
  return (
    candidates.find((candidate) => candidate.accepted === false) ??
    candidates.find((candidate) => candidate.accepted === true) ??
    candidates[0]
  );
}

/** Pure, deterministic and idempotent. No clock, locale, identity or legal-purpose inference. */
export function migrateConsent(sources?: LegacyConsentSources | null): ConsentMigrationResult {
  const issues: string[] = [];
  const input = record(sources, 'sources', issues);
  if (!input) return { consent: null, issues };
  const terms: ConsentDecision[] = [];
  const analytics: ConsentDecision[] = [];
  const unified = record(input.unified, 'unified', issues);
  if (unified) {
    const supported = unified.version === CONSENT_VERSION;
    if (!supported) issues.push('unified: unsupported structure version');
    const tos = record(unified.tos, 'unified.tos', issues);
    const cookies = record(unified.cookies, 'unified.cookies', issues);
    const validEssential = cookies?.essential === true;
    if (cookies && !validEssential) issues.push('unified.cookies: invalid essential invariant');
    if (!tos && !cookies) issues.push('unified: missing decisions');
    if (tos) terms.push(decision(tos, 'accepted', tos.version, 'unified.tos', issues));
    if (cookies)
      analytics.push(
        decision(
          cookies,
          'analytics',
          Object.hasOwn(cookies, 'version') ? cookies.version : unified.version,
          'unified.cookies',
          issues,
        ),
      );
    // The old key-existence migration manufactured both acceptances with this
    // sentinel, never an actual legal version. It is not positive evidence.
    const syntheticLegacy =
      tos?.version === 'legacy' && cookies !== null && !Object.hasOwn(cookies, 'version');
    if (syntheticLegacy) issues.push('unified: synthetic legacy acceptance');
    if (!supported || !validEssential || syntheticLegacy) {
      [...terms, ...analytics].forEach((item) => {
        if (item.accepted === true) item.accepted = null;
      });
    }
  }
  const session = record(input.sessionTerms, 'sessionTerms', issues);
  if (session) {
    const accepted =
      session.accepted === 'true' ? true : session.accepted === 'false' ? false : session.accepted;
    terms.push(
      decision({ ...session, accepted }, 'accepted', session.version, 'sessionTerms', issues),
    );
  }
  const serverTerms = record(input.serverTerms, 'serverTerms', issues);
  if (serverTerms)
    terms.push(decision(serverTerms, 'accepted', serverTerms.version, 'serverTerms', issues));
  const serverEnvelope = record(input.serverCookies, 'serverCookies', issues);
  if (serverEnvelope && !Object.hasOwn(serverEnvelope, 'consent')) {
    issues.push('serverCookies: missing consent envelope');
  }
  for (const [path, raw] of [
    ['cookies', input.cookies],
    ['serverCookies.consent', serverEnvelope?.consent],
  ] as const) {
    const value = record(raw, path, issues);
    if (!value) continue;
    const item = decision(value, 'analytics', value.version, path, issues);
    if (value.essential !== true) {
      issues.push(`${path}: invalid essential invariant`);
      if (item.accepted === true) item.accepted = null;
    }
    analytics.push(item);
  }
  // trialConsent, profile/parent/student permissions and marketing are NOT evidence
  // for either decision. The existing trial server prerequisite remains separate.
  if (input.trial != null) issues.push('trial: not evidence of terms or analytics');
  if (!terms.length && !analytics.length) return { consent: null, issues };
  const consent = emptyConsent();
  if (unified?.pending !== undefined) {
    if (
      Array.isArray(unified.pending) &&
      unified.pending.every((purpose) => purpose === 'terms' || purpose === 'analytics')
    ) {
      consent.pending = [...new Set(unified.pending)].sort();
    } else {
      issues.push('unified.pending: invalid delivery state');
      [...terms, ...analytics].forEach((item) => {
        if (item.accepted === true) item.accepted = null;
      });
    }
  }
  const tos = choose(terms);
  const cookies = choose(analytics);
  if (tos) consent.tos = tos;
  if (cookies)
    consent.cookies = {
      essential: true,
      analytics: cookies.accepted,
      version: cookies.version,
      acceptedAt: cookies.acceptedAt,
    };
  return { consent, issues };
}

const LOCAL_LEGACY_KEYS = ['mirrorbuddy-consent', 'trialConsent'] as const;
const SESSION_LEGACY_KEYS = ['tos_accepted', 'tos_accepted_version'] as const;

export function readStoredConsent(): UnifiedConsentData | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(UNIFIED_CONSENT_KEY);
  const accepted = sessionStorage.getItem('tos_accepted');
  const version = sessionStorage.getItem('tos_accepted_version');
  const cookie = localStorage.getItem('mirrorbuddy-consent');
  const result = migrateConsent({
    unified: stored,
    cookies: cookie,
    sessionTerms: accepted !== null || version !== null ? { accepted, version } : null,
  });
  if (result.issues.length)
    logger.warn('Consent migration input rejected', { issues: result.issues });
  if (result.consent) {
    const serialized = JSON.stringify(result.consent);
    if (stored !== serialized) localStorage.setItem(UNIFIED_CONSENT_KEY, serialized);
    // Retire consumed keys only after the canonical write succeeds; stale refusals
    // must not undo a later explicit choice. Unmapped trial evidence is left untouched.
    localStorage.removeItem('mirrorbuddy-consent');
    SESSION_LEGACY_KEYS.forEach((key) => sessionStorage.removeItem(key));
    if (cookie !== null || accepted !== null || version !== null) {
      localStorage.setItem('mirrorbuddy-consent-migrated', 'true');
    }
  }
  return result.consent;
}

export function migrateLegacyConsentKeys(): boolean {
  if (typeof window === 'undefined') return false;
  const before = localStorage.getItem(UNIFIED_CONSENT_KEY);
  readStoredConsent();
  return localStorage.getItem(UNIFIED_CONSENT_KEY) !== before;
}

export function clearStoredConsent(): void {
  if (typeof window === 'undefined') return;
  [
    UNIFIED_CONSENT_KEY,
    ...LOCAL_LEGACY_KEYS,
    'mirrorbuddy-consent-migrated',
    'mirrorbuddy-trial-migrated',
  ].forEach((key) => localStorage.removeItem(key));
  [...SESSION_LEGACY_KEYS, 'tos_migrated', 'mirrorbuddy-consent-loaded'].forEach((key) =>
    sessionStorage.removeItem(key),
  );
}
