/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';
import { promoteChangelog } from '../ci/promote-changelog';

const CHANGELOG = [
  '# Changelog',
  '',
  '## [Unreleased]',
  '',
  '### Fixed',
  '',
  '- The voice works again.',
  '',
  '## [0.26.1] - 2026-08-26',
  '',
  '- Older thing.',
  '',
].join('\n');

describe('promote changelog', () => {
  it('moves the unreleased notes under the new version', () => {
    const { changelog, changed } = promoteChangelog(CHANGELOG, '0.27.0', '2026-08-30');

    expect(changed).toBe(true);
    expect(changelog).toContain('## [0.27.0] - 2026-08-30');
    expect(changelog).toContain('- The voice works again.');
  });

  it('leaves an empty [Unreleased] ready for the next change', () => {
    const { changelog } = promoteChangelog(CHANGELOG, '0.27.0', '2026-08-30');
    const unreleased = changelog.slice(
      changelog.indexOf('## [Unreleased]'),
      changelog.indexOf('## [0.27.0]'),
    );

    expect(unreleased.replace('## [Unreleased]', '').trim()).toBe('');
  });

  it('keeps the older entries', () => {
    const { changelog } = promoteChangelog(CHANGELOG, '0.27.0', '2026-08-30');

    expect(changelog).toContain('## [0.26.1] - 2026-08-26');
    expect(changelog).toContain('- Older thing.');
  });

  it('records a release even when nobody wrote notes, instead of silently skipping', () => {
    const empty = '# Changelog\n\n## [Unreleased]\n\n## [0.26.1] - 2026-08-26\n';
    const { changelog, changed } = promoteChangelog(empty, '0.27.0', '2026-08-30');

    expect(changed).toBe(true);
    expect(changelog).toContain('## [0.27.0] - 2026-08-30');
    expect(changelog).toContain('No user-facing changes recorded.');
  });

  it('is safe to run twice', () => {
    const once = promoteChangelog(CHANGELOG, '0.27.0', '2026-08-30').changelog;
    const twice = promoteChangelog(once, '0.27.0', '2026-08-31');

    expect(twice.changed).toBe(false);
    expect(twice.changelog).toBe(once);
  });
});
