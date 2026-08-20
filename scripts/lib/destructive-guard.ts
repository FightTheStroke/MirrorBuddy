/**
 * Safety rail for the destructive repo-root scripts.
 *
 * Two accidents were possible here, and one of them nearly happened while
 * auditing these files:
 *
 * 1. They called main() at module scope, so merely importing one — to check
 *    it, to type it, to test it — executed it against whatever DATABASE_URL
 *    happened to be set.
 * 2. They defaulted to deleting. `--dry-run` was opt-in, which is the wrong
 *    way round for a tool whose failure mode is an empty database.
 *
 * Nothing automated calls these scripts: they are manual tooling, reached for
 * in a hurry. So the default is now the safe one, and destruction needs to be
 * asked for by name.
 */

import { pathToFileURL } from 'node:url';

/**
 * True only when this module's file is the one node was asked to run, so an
 * import never triggers execution.
 */
export function isDirectInvocation(importMetaUrl: string): boolean {
  const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
  return importMetaUrl === entry;
}

/**
 * Deletion happens only when explicitly requested with --confirm.
 * `--dry-run` stays accepted so existing muscle memory keeps working.
 */
export function isDryRun(): boolean {
  return !process.argv.includes('--confirm') || process.argv.includes('--dry-run');
}

/**
 * Prints the mode so the operator sees which one they are in before anything
 * happens, and returns it.
 */
export function announceMode(scriptName: string): boolean {
  const dryRun = isDryRun();

  console.log(
    dryRun
      ? `Mode: DRY RUN (no changes) — re-run with: npx tsx scripts/${scriptName}.ts --confirm`
      : 'Mode: LIVE DELETE (--confirm given)\n',
  );

  return dryRun;
}
