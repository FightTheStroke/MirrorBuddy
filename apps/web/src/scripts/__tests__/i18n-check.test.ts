/**
 * Tests for scripts/i18n-check.ts.
 *
 * These tests work on a throwaway copy of the message tree, never on
 * `apps/web/messages/` itself. The script locates messages relative to its
 * working directory, so pointing the working directory at a sandbox is enough
 * to isolate it. Mutating the real tree — which this suite used to do, down to
 * writing `{ invalid json }` into `es/common.json` — raced with every other
 * test file that reads those messages, and a crash between mutation and
 * restore left the checkout broken.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';

const REPO_ROOT = process.cwd();
const REAL_MESSAGES_DIR = path.join(REPO_ROOT, 'apps', 'web', 'messages');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'i18n-check.ts');
// The repository's own tsx, by absolute path. `npx tsx` resolves against the
// working directory, which here is a sandbox outside the checkout: npx would
// find no local install and try to fetch tsx from the registry, so the suite
// failed wherever there was no network.
const TSX = path.join(REPO_ROOT, 'node_modules', '.bin', 'tsx');

let sandbox: string;
let messagesDir: string;

function runCheck(): { ok: boolean; output: string } {
  try {
    const output = execSync(`${JSON.stringify(TSX)} ${JSON.stringify(SCRIPT)}`, {
      cwd: sandbox,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { ok: true, output };
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string };
    return { ok: false, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

function readNamespace(locale: string, ns: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(messagesDir, locale, ns), 'utf-8'));
}

function writeNamespace(locale: string, ns: string, data: unknown): void {
  fs.writeFileSync(path.join(messagesDir, locale, ns), JSON.stringify(data, null, 2));
}

// Each case shells out to tsx, which costs seconds on its own and more
// when the rest of the suite is competing for CPU. The default 5s timeout is
// not a meaningful assertion about this script.
describe('i18n-check script', { timeout: 120_000 }, () => {
  beforeAll(() => {
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-check-'));
    messagesDir = path.join(sandbox, 'apps', 'web', 'messages');
    fs.mkdirSync(path.dirname(messagesDir), { recursive: true });
    fs.cpSync(REAL_MESSAGES_DIR, messagesDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it('leaves the real message tree untouched', () => {
    expect(messagesDir.startsWith(os.tmpdir())).toBe(true);
    expect(messagesDir).not.toBe(REAL_MESSAGES_DIR);
  });

  it('should pass when all language files have consistent keys', () => {
    const { ok, output } = runCheck();
    expect(output).toContain('Result: PASS');
    expect(ok).toBe(true);
  });

  it('should detect missing keys in a language file', () => {
    const de = readNamespace('de', 'common.json');
    const common = de.common as Record<string, unknown> | undefined;
    expect(
      common?.loading,
      'fixture expects de/common.json to define common.loading',
    ).toBeDefined();
    delete common!.loading;
    writeNamespace('de', 'common.json', de);

    expect(runCheck().ok).toBe(false);

    fs.copyFileSync(
      path.join(REAL_MESSAGES_DIR, 'de', 'common.json'),
      path.join(messagesDir, 'de', 'common.json'),
    );
  });

  it('should detect extra keys in a language file (and report but not fail)', () => {
    const en = readNamespace('en', 'common.json');
    en.extraTestKey = 'should not exist';
    writeNamespace('en', 'common.json', en);

    const { ok, output } = runCheck();
    expect(output).toContain('Extra: extraTestKey');
    expect(ok).toBe(true);

    fs.copyFileSync(
      path.join(REAL_MESSAGES_DIR, 'en', 'common.json'),
      path.join(messagesDir, 'en', 'common.json'),
    );
  });

  it('should detect invalid JSON syntax', () => {
    fs.writeFileSync(path.join(messagesDir, 'es', 'common.json'), '{ invalid json }');

    expect(runCheck().ok).toBe(false);

    fs.copyFileSync(
      path.join(REAL_MESSAGES_DIR, 'es', 'common.json'),
      path.join(messagesDir, 'es', 'common.json'),
    );
  });
});
