/**
 * @vitest-environment node
 *
 * These tests describe the failure that actually happened: VERSION moved from
 * 0.26.1 to 0.29.1 while CHANGELOG.md stayed behind, and three releases went
 * out with no record of what was in them.
 */

import { describe, expect, it } from 'vitest';
import {
  checkVersionConsistency,
  formatProblems,
  releasedVersions,
  type VersionSources,
} from '../ci/check-version-consistency';

function sources(overrides: Partial<VersionSources> = {}): VersionSources {
  return {
    versionFile: '0.29.1\n',
    rootPackageJson: JSON.stringify({ name: 'mirrorbuddy', version: '0.29.1' }),
    webPackageJson: JSON.stringify({ name: 'web', version: '0.29.1' }),
    robotPyproject: '[project]\nname = "x"\nversion = "0.29.1"\n',
    robotInit: '__version__ = "0.29.1"\n',
    changelog: '# Changelog\n\n## [Unreleased]\n\n## [0.29.1] - 2026-08-29\n\n- thing\n',
    ...overrides,
  };
}

describe('version consistency', () => {
  it('passes when all five files and the changelog agree', () => {
    expect(checkVersionConsistency(sources())).toEqual([]);
  });

  it('catches the changelog left behind by a release', () => {
    const problems = checkVersionConsistency(
      sources({
        changelog: '# Changelog\n\n## [Unreleased]\n\n## [0.26.1] - 2026-08-26\n',
      }),
    );

    expect(problems).toHaveLength(1);
    expect(problems[0].source).toBe('CHANGELOG.md');
    expect(problems[0].message).toContain('0.29.1');
  });

  it('catches a workspace package.json left on the old version', () => {
    const problems = checkVersionConsistency(
      sources({ webPackageJson: JSON.stringify({ version: '0.29.0' }) }),
    );

    expect(problems).toEqual([
      { source: 'apps/web/package.json', message: 'says 0.29.0, VERSION says 0.29.1' },
    ]);
  });

  it('catches the robot left behind, because it ships to real hardware', () => {
    const problems = checkVersionConsistency(sources({ robotInit: '__version__ = "0.28.0"\n' }));

    expect(problems.map((p) => p.source)).toEqual(['robot/reachy_mini_mirrorbuddy/__init__.py']);
  });

  it('rejects a changelog whose newest entry is ahead of VERSION', () => {
    const problems = checkVersionConsistency(
      sources({
        changelog: '## [0.30.0] - 2026-09-01\n\n## [0.29.1] - 2026-08-29\n',
      }),
    );

    expect(problems[0].message).toContain('newest entry is 0.30.0');
  });

  it('does not accept [Unreleased] as a release', () => {
    expect(releasedVersions('## [Unreleased]\n## [1.2.3] - 2026-01-01\n')).toEqual(['1.2.3']);
  });

  it('refuses a VERSION file that is not a version', () => {
    const problems = checkVersionConsistency(sources({ versionFile: 'main\n' }));

    expect(problems).toEqual([{ source: 'VERSION', message: 'not a semantic version: "main"' }]);
  });

  it('reports every problem at once, so one push fixes them all', () => {
    const problems = checkVersionConsistency(
      sources({
        rootPackageJson: JSON.stringify({ version: '0.29.0' }),
        webPackageJson: JSON.stringify({ version: '0.29.0' }),
        changelog: '## [0.26.1] - 2026-08-26\n',
      }),
    );

    expect(problems).toHaveLength(3);
    expect(formatProblems(problems)).toContain('auto-version.sh --apply');
  });
});
