/**
 * One version number, written in five places, plus a changelog entry that
 * proves the release happened.
 *
 * Between 0.26.1 and 0.29.1 the version files kept moving and CHANGELOG.md did
 * not: three releases shipped with no record of what was in them. Nothing
 * failed, because nothing was checking. This is the thing that checks.
 *
 * Pure functions over already-read text, so the rules are testable without a
 * filesystem, a network, or a release.
 */

export interface VersionSources {
  /** Content of VERSION */
  versionFile: string;
  /** Content of package.json */
  rootPackageJson: string;
  /** Content of apps/web/package.json */
  webPackageJson: string;
  /** Content of robot/pyproject.toml */
  robotPyproject: string;
  /** Content of robot/reachy_mini_mirrorbuddy/__init__.py */
  robotInit: string;
  /** Content of CHANGELOG.md */
  changelog: string;
}

export interface VersionProblem {
  source: string;
  message: string;
}

const SEMVER = /^\d+\.\d+\.\d+$/;

function jsonVersion(raw: string): string | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'version' in parsed) {
      const value = (parsed as { version: unknown }).version;
      return typeof value === 'string' ? value : null;
    }
    return null;
  } catch {
    return null;
  }
}

function tomlVersion(raw: string): string | null {
  const match = raw.match(/^\s*version\s*=\s*["']([^"']+)["']/m);
  return match ? match[1] : null;
}

function pythonVersion(raw: string): string | null {
  const match = raw.match(/^\s*__version__\s*=\s*["']([^"']+)["']/m);
  return match ? match[1] : null;
}

/**
 * The versions released so far, newest first, as written in the changelog.
 * `[Unreleased]` is deliberately not one of them: it is a draft, not a release.
 */
export function releasedVersions(changelog: string): string[] {
  const versions: string[] = [];
  const pattern = /^##\s*\[([^\]]+)\]/gm;
  let match = pattern.exec(changelog);
  while (match !== null) {
    const label = match[1].trim();
    if (SEMVER.test(label)) versions.push(label);
    match = pattern.exec(changelog);
  }
  return versions;
}

export function checkVersionConsistency(sources: VersionSources): VersionProblem[] {
  const problems: VersionProblem[] = [];
  const expected = sources.versionFile.trim();

  if (!SEMVER.test(expected)) {
    return [{ source: 'VERSION', message: `not a semantic version: "${expected}"` }];
  }

  const others: Array<[string, string | null]> = [
    ['package.json', jsonVersion(sources.rootPackageJson)],
    ['apps/web/package.json', jsonVersion(sources.webPackageJson)],
    ['robot/pyproject.toml', tomlVersion(sources.robotPyproject)],
    ['robot/reachy_mini_mirrorbuddy/__init__.py', pythonVersion(sources.robotInit)],
  ];

  for (const [source, found] of others) {
    if (found === null) {
      problems.push({ source, message: 'no version found' });
    } else if (found !== expected) {
      problems.push({ source, message: `says ${found}, VERSION says ${expected}` });
    }
  }

  const released = releasedVersions(sources.changelog);
  if (!released.includes(expected)) {
    problems.push({
      source: 'CHANGELOG.md',
      message: `no "## [${expected}]" entry — a release with no record of what changed`,
    });
  } else if (released[0] !== expected) {
    problems.push({
      source: 'CHANGELOG.md',
      message: `newest entry is ${released[0]}, but this release is ${expected}`,
    });
  }

  return problems;
}

export function formatProblems(problems: VersionProblem[]): string {
  if (problems.length === 0) return 'Version and changelog agree.';
  return [
    'Version consistency failed:',
    ...problems.map((p) => `  - ${p.source}: ${p.message}`),
    '',
    'Fix: run ./scripts/auto-version.sh --apply (it writes all five files and',
    'promotes the [Unreleased] changelog section), or add the missing entry by hand.',
  ].join('\n');
}

async function main(): Promise<void> {
  const { readFile } = await import('node:fs/promises');
  const read = (path: string) => readFile(path, 'utf8');

  const [versionFile, rootPackageJson, webPackageJson, robotPyproject, robotInit, changelog] =
    await Promise.all([
      read('VERSION'),
      read('package.json'),
      read('apps/web/package.json'),
      read('robot/pyproject.toml'),
      read('robot/reachy_mini_mirrorbuddy/__init__.py'),
      read('CHANGELOG.md'),
    ]);

  const problems = checkVersionConsistency({
    versionFile,
    rootPackageJson,
    webPackageJson,
    robotPyproject,
    robotInit,
    changelog,
  });

  console.log(formatProblems(problems));
  if (problems.length > 0) process.exit(1);
}

const isDirectRun =
  typeof process !== 'undefined' && process.argv[1]?.includes('check-version-consistency');

if (isDirectRun) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
