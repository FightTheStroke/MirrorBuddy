// @vitest-environment node
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildSourceIdentity,
  productionBuildCommand,
  proofFile,
  proofSources,
} from '../lib/production-build-proof.mjs';
import { buildFixture, productionValues, root } from './production-build-fixture';

const config = JSON.stringify({
  git: { deploymentEnabled: false },
  ignoreCommand: null,
  buildCommand: productionBuildCommand,
  regions: ['fra1'],
});
let fixture: ReturnType<typeof buildFixture>;
beforeEach(() => {
  fixture = buildFixture();
  mkdirSync(join(fixture.directory, 'apps/web'), { recursive: true });
  writeFileSync(join(fixture.directory, 'apps/web/vercel.json'), config);
  rmSync(join(fixture.directory, 'vercel.json'), { force: true });
});
afterEach(() => fixture.clean());

describe('production configuration belongs to the Vercel application root', () => {
  it('triggers config checks for the active file and explicitly selects it in staging commands', () => {
    const workflow = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8');
    const filters = workflow.match(/^ {12}config:([\s\S]*?)(?=^ {12}\w+:)/m)?.[1] ?? '';
    expect(filters).toContain("'apps/web/vercel.json'");
    expect(filters).toContain("'vercel.json'");
    const staging = workflow
      .split('\n  deploy-to-staging:')[1]
      .split('\n  auto-promote-production:')[0];
    for (const command of ['pull', 'build', 'deploy']) {
      const line = staging.match(new RegExp(`vercel ${command} [^\\n]+`))?.[0] ?? '';
      expect(line).toContain('--local-config=apps/web/vercel.json');
    }
  });
  it('requires the app configuration and never falls back to a root-only configuration', () => {
    rmSync(join(fixture.directory, 'apps/web/vercel.json'));
    writeFileSync(join(fixture.directory, 'vercel.json'), config);
    expect(() => buildSourceIdentity(fixture.directory)).toThrow();
  });
  it('fingerprints the active app configuration as the first configuration source', () => {
    expect(proofSources[0]).toBe('apps/web/vercel.json');
    expect(proofSources).not.toContain('vercel.json');
    expect(buildSourceIdentity(fixture.directory).configHash).toMatch(/^[a-f0-9]{64}$/);
  });
  it('ignores a Vercel-generated root stub without ignoring active configuration bytes', () => {
    const original = buildSourceIdentity(fixture.directory);
    writeFileSync(join(fixture.directory, 'vercel.json'), '{"name":"synthetic","version":2}');
    expect(buildSourceIdentity(fixture.directory)).toEqual(original);
    writeFileSync(join(fixture.directory, 'vercel.json'), '{"name":"other","version":2}');
    expect(buildSourceIdentity(fixture.directory)).toEqual(original);
    writeFileSync(join(fixture.directory, 'apps/web/vercel.json'), `${config}\n`);
    expect(buildSourceIdentity(fixture.directory).configHash).not.toBe(original.configHash);
  });
  it('still rejects build bypasses in the active app configuration', () => {
    writeFileSync(
      join(fixture.directory, 'apps/web/vercel.json'),
      JSON.stringify({ ...JSON.parse(config), buildCommand: 'exit 0' }),
    );
    expect(() => buildSourceIdentity(fixture.directory)).toThrow(
      'Unqualified production build or skip-build configuration',
    );
  });
  it.each([
    ['vercel.json', true],
    ['apps/web/vercel.json', false],
  ])(
    'handles changes to %s during the actual build wrapper',
    (file, succeeds) => {
      const before = buildSourceIdentity(fixture.directory);
      fixture.executable(
        'npm',
        `
const fs = require('node:fs');
fs.mkdirSync('apps/web/.next', { recursive: true });
fs.writeFileSync('apps/web/.next/BUILD_ID', 'synthetic-build');
${
  succeeds
    ? `fs.writeFileSync(${JSON.stringify(file)}, '{"name":"synthetic","version":2}');`
    : `fs.appendFileSync(${JSON.stringify(file)}, '\\n');`
}
`,
      );
      const result = fixture.invoke(productionValues());
      expect(result.status, result.stderr).toBe(succeeds ? 0 : 1);
      expect(existsSync(join(fixture.directory, proofFile))).toBe(succeeds);
      if (succeeds) {
        expect(fixture.receipt()).toMatchObject(before);
        expect(fixture.receipt()).toMatchObject({ valuesValidated: true, buildCompleted: true });
      }
    },
    20_000,
  );
});
