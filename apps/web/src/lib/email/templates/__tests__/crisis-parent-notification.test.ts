import { describe, expect, it } from 'vitest';
import { buildCrisisParentEmail } from '../crisis-parent-notification';

const SUPPORTED_LOCALES = ['en', 'it', 'de', 'es', 'fr'] as const;
const TEST_TIMESTAMP = new Date('2026-01-15T10:30:00.000Z');
const RAW_USER_CRISIS_MESSAGE = "I can't do this anymore, I want to disappear and hurt myself.";

describe('buildCrisisParentEmail', () => {
  it.each(SUPPORTED_LOCALES)('renders subject, html, and text for locale %s', (locale) => {
    const email = buildCrisisParentEmail({
      locale,
      severity: 'critical',
      timestamp: TEST_TIMESTAMP,
      parentDashboardUrl: `https://mirrorbuddy.it/${locale}/parent-dashboard`,
    });

    expect(email.subject).toBeTruthy();
    expect(email.html).toContain('<html>');
    expect(email.text.length).toBeGreaterThan(0);
    expect(email.html).toContain('parent-dashboard');
    expect(email.text).toContain('parent-dashboard');
  });

  it('includes Telefono Azzurro and 19696 for Italian locale', () => {
    const email = buildCrisisParentEmail({
      locale: 'it',
      severity: 'critical',
      timestamp: TEST_TIMESTAMP,
      parentDashboardUrl: 'https://mirrorbuddy.it/it/parent-dashboard',
    });

    expect(email.html).toContain('Telefono Azzurro');
    expect(email.html).toContain('19696');
    expect(email.text).toContain('Telefono Azzurro');
    expect(email.text).toContain('19696');
  });

  it.each(SUPPORTED_LOCALES)(
    'does not include raw user crisis message in locale %s email output',
    (locale) => {
      const email = buildCrisisParentEmail({
        locale,
        severity: 'high',
        timestamp: TEST_TIMESTAMP,
        parentDashboardUrl: `https://mirrorbuddy.it/${locale}/parent-dashboard`,
      });

      expect(email.html).not.toContain(RAW_USER_CRISIS_MESSAGE);
      expect(email.text).not.toContain(RAW_USER_CRISIS_MESSAGE);
    },
  );
});
