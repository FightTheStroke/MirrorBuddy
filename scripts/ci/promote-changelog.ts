/**
 * Turns the `[Unreleased]` changelog section into a released one.
 *
 * The bump script wrote five version files and never touched CHANGELOG.md, so
 * the record of what shipped depended on somebody remembering. Three releases
 * proved that does not hold. Now the same command that moves the version moves
 * the changelog with it.
 */

const UNRELEASED_HEADING = '## [Unreleased]';

export interface PromoteResult {
  changelog: string;
  /** False when there was nothing to promote, so the caller can stay quiet. */
  changed: boolean;
  reason?: string;
}

function sectionBounds(changelog: string, start: number): { body: string; rest: string } {
  const after = changelog.slice(start + UNRELEASED_HEADING.length);
  const next = after.search(/^## \[/m);
  return {
    body: (next === -1 ? after : after.slice(0, next)).trim(),
    rest: next === -1 ? '' : after.slice(next),
  };
}

export function promoteChangelog(changelog: string, version: string, date: string): PromoteResult {
  const start = changelog.indexOf(UNRELEASED_HEADING);
  if (start === -1) {
    return { changelog, changed: false, reason: 'no [Unreleased] section' };
  }

  if (new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\]`, 'm').test(changelog)) {
    return { changelog, changed: false, reason: `[${version}] already present` };
  }

  const { body, rest } = sectionBounds(changelog, start);
  const released = body.length > 0 ? body : '- No user-facing changes recorded.';

  const promoted =
    `${changelog.slice(0, start)}${UNRELEASED_HEADING}\n\n` +
    `## [${version}] - ${date}\n\n${released}\n\n${rest}`;

  return { changelog: promoted, changed: true };
}

async function main(): Promise<void> {
  const version = process.argv[2];
  if (!version) {
    console.error('usage: promote-changelog.ts <version>');
    process.exit(1);
  }

  const { readFile, writeFile } = await import('node:fs/promises');
  const current = await readFile('CHANGELOG.md', 'utf8');
  const date = new Date().toISOString().slice(0, 10);
  const result = promoteChangelog(current, version, date);

  if (!result.changed) {
    console.log(`CHANGELOG.md unchanged (${result.reason}).`);
    return;
  }

  await writeFile('CHANGELOG.md', result.changelog);
  console.log(`CHANGELOG.md: [Unreleased] promoted to [${version}] - ${date}.`);
}

const isDirectRun =
  typeof process !== 'undefined' && process.argv[1]?.includes('promote-changelog');

if (isDirectRun) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
