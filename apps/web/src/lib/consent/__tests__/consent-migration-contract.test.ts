import { describe, expect, it } from 'vitest';
import { migrateConsent } from '../consent-migration';

const date = '2026-02-01T10:00:00.000Z';
const tos = { accepted: true, version: '1.0', acceptedAt: date };
const cookies = {
  version: '1.0',
  acceptedAt: date,
  essential: true,
  analytics: true,
  marketing: false,
};
const unified = { version: '1.0', tos, cookies };

describe('deterministic legacy adapters', () => {
  it.each([null, undefined])('has no evidence for absent sources %s', (sources) => {
    expect(migrateConsent(sources)).toEqual({ consent: null, issues: [] });
  });

  it('reads the real server terms and nested cookie response, preserving both dates', () => {
    const result = migrateConsent({ serverTerms: tos, serverCookies: { consent: cookies } });
    expect(result.issues).toEqual([]);
    expect(result.consent?.tos).toEqual(tos);
    expect(result.consent?.cookies).toEqual({
      essential: true,
      analytics: true,
      version: '1.0',
      acceptedAt: date,
    });
  });

  it('does not treat the wrong flat server envelope as valid consent', () => {
    const result = migrateConsent({ serverCookies: cookies });
    expect(result.consent).toBeNull();
    expect(result.issues).toContain('serverCookies: missing consent envelope');
  });

  it('does not infer analytics from accepted terms or a server timestamp', () => {
    const result = migrateConsent({
      serverTerms: tos,
      serverCookies: { consent: { version: '1.0', essential: true, acceptedAt: date } },
    });
    expect(result.consent?.tos.accepted).toBe(true);
    expect(result.consent?.cookies.analytics).toBeNull();
  });

  it('does not infer terms from analytics acceptance or null server terms', () => {
    const result = migrateConsent({ serverTerms: null, serverCookies: { consent: cookies } });
    expect(result.consent?.tos.accepted).toBeNull();
    expect(result.consent?.cookies.analytics).toBe(true);
  });

  it('keeps explicit local refusal despite later server acceptance', () => {
    const result = migrateConsent({
      unified: { ...unified, cookies: { ...cookies, analytics: false } },
      serverCookies: { consent: { ...cookies, acceptedAt: '2026-03-01T00:00:00.000Z' } },
    });
    expect(result.consent?.cookies.analytics).toBe(false);
    expect(result.consent?.cookies.acceptedAt).toBe(date);
  });

  it('keeps explicit server refusal despite existing local acceptance', () => {
    const result = migrateConsent({
      unified,
      serverTerms: { accepted: false, version: '1.0' },
      serverCookies: { consent: { ...cookies, analytics: false } },
    });
    expect(result.consent?.tos.accepted).toBe(false);
    expect(result.consent?.tos.acceptedAt).toBe('');
    expect(result.consent?.cookies.analytics).toBe(false);
  });

  it('keeps unknown local decisions distinct from explicit refusals during server reconciliation', () => {
    const unknown = migrateConsent({ cookies: { ...cookies, analytics: null } }).consent;
    const result = migrateConsent({
      unified: unknown,
      serverTerms: tos,
      serverCookies: { consent: cookies },
    });
    expect(result.consent?.tos.accepted).toBe(true);
    expect(result.consent?.cookies.analytics).toBe(true);
  });

  it.each(['not-a-date', '2026-02-30T10:00:00.000Z', 123])(
    'rejects malformed acceptance timestamp %s without losing refusal',
    (acceptedAt) => {
      const result = migrateConsent({
        unified: {
          ...unified,
          tos: { ...tos, acceptedAt },
          cookies: { ...cookies, analytics: false, acceptedAt },
        },
      });
      expect(result.consent?.tos.accepted).toBeNull();
      expect(result.consent?.cookies.analytics).toBe(false);
      expect(result.consent?.cookies.acceptedAt).toBe('');
      expect(result.issues.length).toBeGreaterThan(0);
    },
  );

  it('rejects truthy non-booleans without discarding an independent explicit refusal', () => {
    const result = migrateConsent({
      unified: { ...unified, tos: { ...tos, accepted: 'true' } },
      cookies: { ...cookies, analytics: false },
    });
    expect(result.consent?.tos.accepted).toBeNull();
    expect(result.consent?.cookies.analytics).toBe(false);
    expect(result.issues).toContain('unified.tos: invalid choice');
  });

  it('does not reinterpret positive choices from an unsupported structure version', () => {
    const result = migrateConsent({ unified: { ...unified, version: '99' } });
    expect(result.consent?.tos.accepted).toBeNull();
    expect(result.consent?.cookies.analytics).toBeNull();
  });

  it('still preserves explicit refusal from an unsupported structure version', () => {
    const result = migrateConsent({
      unified: {
        ...unified,
        version: '99',
        tos: { ...tos, accepted: false },
        cookies: { ...cookies, analytics: false },
      },
    });
    expect(result.consent?.tos.accepted).toBe(false);
    expect(result.consent?.cookies.analytics).toBe(false);
  });

  it('does not endorse the old migration that manufactured acceptance from key existence', () => {
    const result = migrateConsent({
      unified: {
        ...unified,
        tos: { ...tos, version: 'legacy' },
        cookies: { essential: true, analytics: true, acceptedAt: date },
      },
    });
    expect(result.consent?.tos.accepted).toBeNull();
    expect(result.consent?.cookies.analytics).toBeNull();
    expect(result.issues).toContain('unified: synthetic legacy acceptance');
  });

  it('does not invent terms or analytics from profile/parent/student permissions or locale', () => {
    const result = migrateConsent({
      unified: {
        parentConsent: true,
        studentConsent: true,
        consentDate: date,
        locale: 'it',
        country: 'IT',
      },
      trial: { accepted: true, version: '1.0', acceptedAt: date },
    });
    expect(result.consent).toBeNull();
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it.each([false, null, 'true'])('rejects invalid essential invariant %s', (essential) => {
    const result = migrateConsent({ unified: { ...unified, cookies: { ...cookies, essential } } });
    expect(result.consent?.tos.accepted).toBeNull();
    expect(result.consent?.cookies.analytics).toBeNull();
    expect(result.issues).toContain('unified.cookies: invalid essential invariant');
  });

  it('preserves offset timestamps without renormalizing consent evidence', () => {
    const offsetDate = '2026-02-01T12:00:00+02:00';
    const result = migrateConsent({ cookies: { ...cookies, acceptedAt: offsetDate } });
    expect(result.consent?.cookies.acceptedAt).toBe(offsetDate);
  });

  it('is idempotent even when the same legacy sources are supplied again', () => {
    const source = { unified, cookies: { ...cookies, analytics: false } };
    const first = migrateConsent(source).consent;
    expect(migrateConsent({ ...source, unified: first }).consent).toEqual(first);
    expect(migrateConsent({ unified: first }).consent).toEqual(first);
  });
});
