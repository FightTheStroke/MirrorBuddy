// @vitest-environment node
/**
 * A release that never reaches the public site is invisible without this.
 *
 * Promotion to production is a manual step, so the domain can keep serving an
 * old build for days while `main` moves on — which is exactly what happened on
 * 21-22 Sep 2026: the site served 0.40.11 while 0.40.15 was tagged and built.
 * Nothing complained. This turns that silence into an alert.
 */

import { describe, it, expect } from 'vitest';
import { staleReleaseAlert } from '../production-watch/sources';

const NOW = Date.parse('2026-09-22T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;

describe('Noticing a release that production never received', () => {
  it('says nothing when the site serves the newest release', () => {
    const alert = staleReleaseAlert(
      {
        liveVersion: '0.40.15',
        latestRelease: 'v0.40.15',
        releasedAt: new Date(NOW - 10 * HOUR).toISOString(),
      },
      NOW,
    );

    expect(alert).toBeNull();
  });

  it('stays quiet while a fresh release is still being promoted', () => {
    const alert = staleReleaseAlert(
      {
        liveVersion: '0.40.14',
        latestRelease: 'v0.40.15',
        releasedAt: new Date(NOW - 30 * 60 * 1000).toISOString(),
      },
      NOW,
    );

    expect(alert).toBeNull();
  });

  it('raises an alert once an unpromoted release has waited too long', () => {
    const alert = staleReleaseAlert(
      {
        liveVersion: '0.40.11',
        latestRelease: 'v0.40.15',
        releasedAt: new Date(NOW - 9 * HOUR).toISOString(),
      },
      NOW,
    );

    expect(alert).not.toBeNull();
    expect(alert!.title).toContain('0.40.11');
    expect(alert!.title).toContain('0.40.15');
    expect(alert!.source).toBe('release');
  });

  it('keys the alert on the release, so one issue covers one stuck version', () => {
    const stuck = {
      liveVersion: '0.40.11',
      latestRelease: 'v0.40.15',
      releasedAt: new Date(NOW - 9 * HOUR).toISOString(),
    };

    const first = staleReleaseAlert(stuck, NOW);
    const later = staleReleaseAlert(stuck, NOW + 3 * HOUR);

    expect(first!.key).toBe(later!.key);
    expect(first!.key).toBe('release:v0.40.15');
  });

  it('says how long production has been behind', () => {
    const alert = staleReleaseAlert(
      {
        liveVersion: '0.40.11',
        latestRelease: 'v0.40.15',
        releasedAt: new Date(NOW - 26 * HOUR).toISOString(),
      },
      NOW,
    );

    expect(alert!.details.join(' ')).toContain('26');
  });

  it('refuses to guess when the live version is unknown', () => {
    expect(() =>
      staleReleaseAlert(
        { liveVersion: '', latestRelease: 'v0.40.15', releasedAt: new Date(NOW).toISOString() },
        NOW,
      ),
    ).toThrow();
  });
});
