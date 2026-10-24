// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { evaluateAudit } from '../lib/release-audit-exception.mjs';
import { runtimeAbsence } from '../lib/release-audit-runtime.mjs';
import { digest } from '../lib/release-evidence-inputs.mjs';
import { readReceipt, recipe, reports } from '../lib/release-evidence-store.mjs';
import { buildFixture } from './release-native-fixture';
const approval = JSON.parse(
  readFileSync(new URL('../security/braces-exception.json', import.meta.url), 'utf8'),
);
const now = Date.parse('2026-10-16T16:00:00+02:00');
const clean = () => ({
  advisories: {},
  metadata: { vulnerabilities: { info: 0, low: 3, moderate: 23, high: 0, critical: 0 } },
});
function fixture() {
  const audit = clean();
  audit.metadata.vulnerabilities.high = 1;
  Object.assign(audit.advisories, {
    '1240992': {
      id: 1240992,
      github_advisory_id: 'GHSA-vfj7-8cjw-p6xm',
      module_name: 'braces',
      severity: 'high',
      findings: [{ version: '3.0.3', paths: [approval.paths[0]] }],
    },
  });
  type Dependency = { name: string; dependents: Dependency[]; depField?: string };
  const dependency = (name: string, dependents: Dependency[], depField?: string): Dependency => ({
    name,
    dependents,
    ...(depField ? { depField } : {}),
  });
  const leaf = dependency('mirrorbuddy', [], 'devDependencies');
  const why = [
    {
      name: 'braces',
      version: '3.0.3',
      dependents: [
        dependency('micromatch', [
          dependency('fast-glob', [
            dependency('@next/eslint-plugin-next', [dependency('eslint-config-next', [leaf])]),
          ]),
          dependency('fast-glob', [dependency('knip', [leaf])]),
        ]),
      ],
    },
  ];
  const context = {
    approval: structuredClone(approval),
    rawExitCode: 1,
    productionExitCode: 0,
    production: clean(),
    whyExitCode: 0,
    why,
    runtime: { build: 'a'.repeat(64), traces: 1, traceHash: 'b'.repeat(64), files: 1 },
  };
  return { audit, context };
}
const directories: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  directories.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true }));
});
describe('the one approved development-only audit exception', () => {
  it('retains raw counts and reports the exact approval expiry', () => {
    const { audit, context } = fixture();
    const before = JSON.stringify(audit);
    expect(evaluateAudit(audit, context, now)).toMatchObject({
      high: 1,
      critical: 0,
      acceptedHigh: 1,
      expiresAt: '2026-10-24T00:00:00+02:00',
    });
    expect(JSON.stringify(audit)).toBe(before);
  });
  it('does not waive a finding that is absent', () => {
    expect(evaluateAudit(clean(), { rawExitCode: 0 }, now).acceptedHigh).toBe(0);
  });
  it('allows either or both approved audit paths, never another chain', () => {
    const { audit, context } = fixture();
    const advisory = Object.values(audit.advisories)[0] as {
      findings: { version: string; paths: string[] }[];
    };
    advisory.findings[0].paths = [...approval.paths];
    expect(evaluateAudit(audit, context, now).acceptedHigh).toBe(1);
    advisory.findings[0].paths = [approval.paths[1]];
    expect(evaluateAudit(audit, context, now).acceptedHigh).toBe(1);
  });
  it.each([
    '2026-10-24T00:00:00+02:00',
    '2026-10-25T00:00:00+02:00',
    '2026-10-15T23:59:59+02:00',
    'invalid',
  ])('rejects approval outside its actual authorized time: %s', (time) => {
    const { audit, context } = fixture();
    expect(() => evaluateAudit(audit, context, Date.parse(time))).toThrow();
  });
  it('rejects missing audit data without substituting zero counts', () => {
    expect(() => evaluateAudit(null, {}, now)).toThrow();
    expect(() => evaluateAudit(undefined, {}, now)).toThrow();
  });
  it.each([
    'expired',
    'invalidExpiry',
    'changedApproval',
    'newAdvisory',
    'critical',
    'production',
    'productionPath',
    'version',
    'missingAdvisories',
    'missingMetadata',
    'missingRuntime',
    'missingProduction',
    'missingWhy',
    'runtimeDependency',
    'unknownChain',
    'rawFailure',
    'muted',
    'productionFlag',
  ])('fails closed for %s', (scenario) => {
    const { audit, context } = fixture();
    const advisory = Object.values(audit.advisories)[0] as {
      findings: { version: string; paths: string[] }[];
    };
    if (scenario === 'expired') context.approval.expiresAt = '2026-10-16T00:00:00+02:00';
    if (scenario === 'invalidExpiry') context.approval.expiresAt = 'not-a-date';
    if (scenario === 'changedApproval') context.approval.approvedBy = 'Someone else';
    if (scenario === 'newAdvisory')
      Object.assign(audit.advisories, { unexpected: { severity: 'high' } });
    if (scenario === 'critical') audit.metadata.vulnerabilities.critical = 1;
    if (scenario === 'production') context.production.metadata.vulnerabilities.high = 1;
    if (scenario === 'productionPath') advisory.findings[0].paths = ['.>runtime>braces'];
    if (scenario === 'version') advisory.findings[0].version = '3.0.4';
    if (scenario === 'missingAdvisories') Reflect.deleteProperty(audit, 'advisories');
    if (scenario === 'missingMetadata') Reflect.deleteProperty(audit, 'metadata');
    if (scenario === 'missingRuntime') Reflect.deleteProperty(context, 'runtime');
    if (scenario === 'missingProduction') Reflect.deleteProperty(context, 'production');
    if (scenario === 'missingWhy') Reflect.deleteProperty(context, 'why');
    if (scenario === 'runtimeDependency') {
      context.why[0].dependents[0].dependents[1].dependents[0].dependents[0].depField =
        'dependencies';
    }
    if (scenario === 'unknownChain')
      context.why[0].dependents.push({ name: 'unknown', dependents: [] });
    if (scenario === 'rawFailure') context.rawExitCode = 2;
    if (scenario === 'muted') Object.assign(audit, { muted: ['unexpected-advisory'] });
    if (scenario === 'productionFlag') Object.assign(advisory.findings[0], { dev: false });
    expect(() => evaluateAudit(audit, context, now)).toThrow();
  });
});

describe('current completed build runtime absence', () => {
  function runtimeFixture() {
    const parent = resolve(import.meta.dirname, '../../apps/web/coverage/.audit-test-fixtures');
    mkdirSync(parent, { recursive: true });
    const root = mkdtempSync(join(parent, 'runtime-'));
    directories.push(root);
    const state = buildFixture(root);
    writeFileSync(
      join(state.build, 'server/page.js.nft.json'),
      '{"version":1,"files":["page.js"]}',
    );
    return { root, ...state };
  }
  it('checks completed traces and standalone, and binds current build bytes', () => {
    const { root, app } = runtimeFixture();
    const before = runtimeAbsence(root);
    expect(before.traces).toBe(1);
    writeFileSync(join(app, 'server.js'), 'changed');
    expect(runtimeAbsence(root).build).not.toBe(before.build);
  });
  it.each(['braces', 'micromatch', 'next/dist/compiled/micromatch'])(
    'rejects runtime %s',
    (name) => {
      const { root, standalone } = runtimeFixture();
      const directory = join(standalone, 'node_modules', name);
      mkdirSync(directory, { recursive: true });
      writeFileSync(join(directory, 'index.js'), 'module.exports = {};');
      expect(() => runtimeAbsence(root)).toThrow(/runtime/i);
    },
  );
  it.each(['server/page.js.nft.json', 'standalone/apps/web/.next/server/page.js.nft.json'])(
    'rejects a vulnerable or malformed trace at %s and missing build',
    (name) => {
      const { root, build } = runtimeFixture();
      const trace = join(build, name);
      writeFileSync(trace, '{"version":1,"files":["../../../node_modules/braces/index.js"]}');
      expect(() => runtimeAbsence(root)).toThrow();
      writeFileSync(trace, '{}');
      expect(() => runtimeAbsence(root)).toThrow();
      rmSync(join(build, 'BUILD_ID'));
      expect(() => runtimeAbsence(root)).toThrow();
    },
  );
  function receiptFixture() {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const state = runtimeFixture();
    const directory = join(state.root, 'evidence');
    const policy = join(state.root, 'scripts/security');
    mkdirSync(directory);
    mkdirSync(policy, { recursive: true });
    const policyText = JSON.stringify(approval);
    writeFileSync(join(policy, 'braces-exception.json'), policyText);
    const { audit, context } = fixture();
    Object.assign(context, {
      runtime: runtimeAbsence(state.root),
      approvalHash: digest(policyText),
    });
    writeFileSync(join(directory, 'audit.json'), JSON.stringify(audit));
    writeFileSync(join(directory, 'audit.context.json'), JSON.stringify(context));
    const identity = { root: state.root };
    const receipt = {
      version: 1,
      kind: 'audit',
      exitCode: 0,
      rawExitCode: 1,
      identity,
      command: recipe('audit', directory),
      startedAt: Date.now() - 10,
      finishedAt: Date.now(),
      reportHashes: Object.fromEntries(
        reports('audit').map((name) => [name, digest(readFileSync(join(directory, name)))]),
      ),
    };
    writeFileSync(join(directory, 'audit.receipt.json'), JSON.stringify(receipt));
    return { ...state, directory, identity };
  }
  it('accepts a bound evaluated receipt without turning the raw audit exit into zero', () => {
    const { directory, identity } = receiptFixture();
    expect(readReceipt('audit', directory, identity).rawExitCode).toBe(1);
  });
  it.each(['approval', 'context', 'audit', 'runtime', 'missingContext'])(
    'rejects post-execution %s replacement',
    (scenario) => {
      const { root, directory, identity, app } = receiptFixture();
      if (scenario === 'approval') {
        writeFileSync(join(root, 'scripts/security/braces-exception.json'), '{}');
      }
      if (scenario === 'context') writeFileSync(join(directory, 'audit.context.json'), '{}');
      if (scenario === 'audit') writeFileSync(join(directory, 'audit.json'), '{}');
      if (scenario === 'runtime') writeFileSync(join(app, 'server.js'), 'changed runtime');
      if (scenario === 'missingContext') rmSync(join(directory, 'audit.context.json'));
      expect(() => readReceipt('audit', directory, identity)).toThrow();
    },
  );
});
