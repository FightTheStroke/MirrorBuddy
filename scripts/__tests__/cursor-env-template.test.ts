// @vitest-environment node
// Byte-for-byte guard for scripts/print-cursor-env-template.ts. The upcoming
// change rebuilds the four illustrative connection lines from named placeholder
// components; the emitted template must not move by a single byte. The script
// only prints text, so nothing external is contacted.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repository = resolve(import.meta.dirname, '../..');
const script = join(repository, 'scripts/print-cursor-env-template.ts');
const roots: string[] = [];

afterEach(() => {
  while (roots.length) rmSync(roots.pop() as string, { recursive: true, force: true });
});

// Recorded by the owner from the CURRENT script (05cf029f...), before any edit,
// in one offline Node 24 run. Only the digest and the byte count live here: the
// template text itself is never reproduced in this fixture.
const EXPECTED_OUTPUT_SHA256 = '6a047473262682948b1efc06309d1e0d756b3865e970bc5b7e8e0c47a4eba784';
const EXPECTED_OUTPUT_BYTES = 1709;

const VARIABLES = ['DATABASE_URL', 'DIRECT_URL', 'TEST_DATABASE_URL', 'TEST_DIRECT_URL'];

function emit(): string {
  const root = mkdtempSync(join(tmpdir(), 'mb-cursor-env-'));
  roots.push(root);
  mkdirSync(join(root, 'scripts'), { recursive: true });
  const copy = join(root, 'scripts/print-cursor-env-template.ts');
  copyFileSync(script, copy);

  const result = spawnSync('npx', ['--no-install', 'tsx', copy], {
    cwd: repository,
    encoding: 'utf8',
    timeout: 60_000,
    env: { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}` },
  });
  expect(result.error, 'the template script must launch').toBeUndefined();
  expect(result.signal, 'the template script must not be signalled').toBeNull();
  expect(result.status, `the template script must exit cleanly: ${result.stderr}`).toBe(0);
  return result.stdout ?? '';
}

describe('cursor environment template', () => {
  it('emits exactly the recorded bytes', () => {
    const output = emit();

    expect(Buffer.byteLength(output, 'utf8')).toBe(EXPECTED_OUTPUT_BYTES);
    expect(createHash('sha256').update(output, 'utf8').digest('hex')).toBe(EXPECTED_OUTPUT_SHA256);
  });

  it('emits the same bytes on every run', () => {
    expect(emit()).toBe(emit());
  });

  it('declares each connection variable once, in order', () => {
    const output = emit();
    const declared = output
      .split('\n')
      .map((line) => /^([A-Z_]+)=/.exec(line)?.[1])
      .filter((name): name is string => Boolean(name));

    expect(declared.filter((name) => VARIABLES.includes(name))).toEqual(VARIABLES);
  });

  it('leaves no unresolved placeholder interpolation and no trailing blank line', () => {
    const output = emit();

    expect(output).not.toContain('${');
    expect(output.endsWith('\n')).toBe(true);
    expect(output.slice(0, -1).endsWith('\n')).toBe(false);
  });
});
