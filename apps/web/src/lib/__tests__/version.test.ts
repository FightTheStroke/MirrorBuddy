import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearVersionCache, getAppVersion } from '../version';

const originalCwd = process.cwd();
const tempDirs: string[] = [];

function useTempCwd(): string {
  const dir = mkdtempSync(join(tmpdir(), 'mirrorbuddy-version-'));
  tempDirs.push(dir);
  process.chdir(dir);
  clearVersionCache();
  return dir;
}

afterEach(() => {
  process.chdir(originalCwd);
  vi.unstubAllEnvs();
  clearVersionCache();
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('getAppVersion', () => {
  it('reads VERSION from the current working directory first', () => {
    const dir = useTempCwd();
    writeFileSync(join(dir, 'VERSION'), '1.2.3\n');
    vi.stubEnv('APP_VERSION', '9.9.9');

    expect(getAppVersion()).toBe('1.2.3');
  });

  it('uses APP_VERSION before the thin app package version', () => {
    const dir = useTempCwd();
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ version: '0.0.1' }));
    vi.stubEnv('APP_VERSION', '0.16.10');

    expect(getAppVersion()).toBe('0.16.10');
  });

  it('falls back to package.json when VERSION and APP_VERSION are unavailable', () => {
    const dir = useTempCwd();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ version: '2.0.0' }));

    expect(getAppVersion()).toBe('2.0.0');
  });
});
