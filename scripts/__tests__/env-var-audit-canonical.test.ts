// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { accessSync, chmodSync, constants, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { criticalProductionEnv } from '../lib/production-env-policy';
import {
  checkout,
  cleanupRoots,
  DOCUMENTED,
  registryModule,
  remove,
  run,
  usage,
} from './env-var-audit-fixture';

// Unlike the isolated CLI fixtures, these checks deliberately bind to the real
// pure registry export and read the real validator without executing it.
const repository = resolve(import.meta.dirname, '../..');
const reader = resolve(repository, 'scripts/lib/collect-declared-env.mjs');
const policySource = resolve(repository, 'scripts/lib/production-env-policy.ts');
const validatorSource = resolve(repository, 'scripts/validate-pre-deploy.ts');

afterEach(cleanupRoots);

function readDeclarations(sources: string[]) {
  const result = spawnSync(process.execPath, [reader, ...sources], {
    cwd: repository,
    encoding: 'utf8',
    timeout: 15_000,
  });

  expect(result.error, 'the declaration reader must launch').toBeUndefined();
  expect(result.signal, 'the declaration reader must not be signalled').toBeNull();
  expect(typeof result.status, 'the reader must return a numeric status').toBe('number');
  if (typeof result.status !== 'number') throw new Error('Reader returned no exit status');
  const stdout = result.stdout ?? '';
  const names = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return { status: result.status, names, stdout, stderr: result.stderr ?? '' };
}

describe('env-var-audit repository executable contract', () => {
  it('keeps the real audit directly executable by the pre-push hook', () => {
    const audit = resolve(repository, 'scripts/env-var-audit.sh');

    expect(() => accessSync(audit, constants.X_OK)).not.toThrow();
  });
});

describe('env-var-audit canonical declaration contract', () => {
  it('recognises exactly the exported production registry', () => {
    const expected = criticalProductionEnv.map(({ name }) => name).sort();

    const declarations = readDeclarations([policySource]);

    expect(expected.length, 'the canonical registry must not be empty').toBeGreaterThan(0);
    expect(declarations.status, declarations.stderr).toBe(0);
    expect(declarations.names.sort()).toEqual(expected);
  });

  it('does not accept a plain string of the real policy source as a declaration', () => {
    const source = readFileSync(policySource, 'utf8');

    const declarations = readDeclarations([policySource]);

    expect(source, 'this control needs the real string to still be there').toContain('SENTRY_ORG');
    expect(declarations.status, declarations.stderr).toBe(0);
    expect(criticalProductionEnv.map(({ name }) => name)).not.toContain('SENTRY_ORG');
    expect(declarations.names).not.toContain('SENTRY_ORG');
  });

  it('recognises the optional entry the real validator declares inline', () => {
    const source = readFileSync(validatorSource, 'utf8');

    const declarations = readDeclarations([validatorSource]);

    expect(source, 'this control needs the real inline shape to still be there').toContain(
      "{ name: 'E2E_SERVER_MODE'",
    );
    expect(declarations.status, declarations.stderr).toBe(0);
    expect(declarations.names).toContain('E2E_SERVER_MODE');
  });

  it('fails closed on a source it cannot read', () => {
    const absent = resolve(repository, 'scripts/lib/this-file-does-not-exist.ts');
    expect(existsSync(absent)).toBe(false);

    const declarations = readDeclarations([absent]);

    expect(declarations.status).toBe(2);
    expect(declarations.stdout).toBe('');
    expect(declarations.stderr).toContain('this-file-does-not-exist.ts');
  });

  it('rejects malformed declaration source without emitting partial names', () => {
    const root = checkout({
      files: {
        'scripts/lib/production-env-policy.ts': "export const criticalProductionEnv = ['X'",
      },
    });

    const declarations = readDeclarations([resolve(root, 'scripts/lib/production-env-policy.ts')]);

    expect(declarations.status).toBe(2);
    expect(declarations.stdout).toBe('');
    expect(declarations.stderr).toContain('cannot parse');
  });

  it('does not treat an unrelated object name as an optional declaration', () => {
    const root = checkout({
      files: {
        'scripts/lib/production-env-policy.ts':
          registryModule([DOCUMENTED]) + "export const unrelated = { name: 'MB_NOT_DECLARED' };\n",
      },
    });

    const declarations = readDeclarations([resolve(root, 'scripts/lib/production-env-policy.ts')]);

    expect(declarations.status, declarations.stderr).toBe(0);
    expect(declarations.names).toEqual([DOCUMENTED]);
  });
});

describe('env-var-audit infrastructure validation with empty sources', () => {
  it.each(['node', 'typescript'])(
    'rejects a missing %s dependency even without references',
    (name) => {
      const root = checkout({});
      remove(root, name === 'node' ? 'bin/node' : 'node_modules/typescript');

      const outcome = run(root);

      expect(outcome.status).toBe(2);
      expect(outcome.output).toContain(name);
    },
  );

  it.each([false, true])('rejects malformed declarations with references=%s', (withReferences) => {
    const root = checkout({
      files: {
        'scripts/lib/production-env-policy.ts': "export const criticalProductionEnv = ['X'",
        ...(withReferences ? { 'apps/web/src/fixture-usage.ts': usage(DOCUMENTED) } : {}),
      },
    });

    const outcome = run(root);

    expect(outcome.status).toBe(2);
    expect(outcome.output).toContain('cannot parse');
  });

  it('rejects unreadable documentation even without references', () => {
    const root = checkout({});
    chmodSync(resolve(root, '.env.example'), 0o000);

    const outcome = run(root);

    expect(outcome.status).toBe(2);
    expect(outcome.output).toContain('.env.example');
  });
});
