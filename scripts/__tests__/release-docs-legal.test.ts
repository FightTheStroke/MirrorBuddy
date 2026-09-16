// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
let fixture: string;
let auditInvocations: number;
function put(file: string, content = '') {
  mkdirSync(dirname(join(fixture, file)), { recursive: true });
  writeFileSync(join(fixture, file), content);
}
beforeEach(() => {
  auditInvocations = 0;
  fixture = mkdtempSync(join(tmpdir(), 'release-docs-legal-'));
  const countries = ['italy', 'spain', 'france', 'germany', 'uk'];
  const sources = [
    'https://www.garanteprivacy.it',
    'https://www.agid.gov.it',
    'https://www.normattiva.it',
    'https://www.aepd.es',
    'https://www.boe.es',
    'https://www.cnil.fr',
    'https://www.numerique.gouv.fr',
    'https://www.legifrance.gouv.fr',
    'https://www.bfdi.bund.de',
    'https://www.gesetze-im-internet.de',
    'https://ico.org.uk',
    'https://www.equalityhumanrights.com',
    'https://design-system.service.gov.uk',
    'https://administracionelectronica.gob.es',
    'https://www.bfit-bund.de',
  ].join('\n');
  for (const country of countries) {
    for (const doc of [
      'data-protection',
      'cookie-compliance',
      'accessibility-compliance',
      'ai-regulatory-contacts',
    ]) {
      put(`docs/compliance/countries/${country}/${doc}.md`, sources);
    }
  }
  put('docs/compliance/COMPLIANCE-MATRIX.md', countries.join('\n'));
  put(
    'docs/compliance/LEGAL-REVIEW-CHECKLIST-BY-COUNTRY.md',
    countries.map((c) => `## ${c}`).join('\n'),
  );
  for (const locale of ['it', 'en', 'fr', 'de', 'es']) {
    for (const namespace of ['compliance', 'consent']) {
      put(
        `apps/web/messages/${locale}/${namespace}.json`,
        JSON.stringify({ [namespace]: { title: 'Policy' } }),
      );
    }
  }
  for (const file of [
    'apps/web/src/lib/compliance/cookie-consent-config.ts',
    'apps/web/src/app/[locale]/accessibility/page.tsx',
    'apps/web/src/app/[locale]/accessibility/accessibility-client.tsx',
    'apps/web/src/components/consent/unified-consent-wall.tsx',
    'docs/adr/0100-multi-country-compliance-architecture.md',
  ])
    put(file);
  mkdirSync(join(fixture, 'scripts'));
  copyFileSync(
    join(root, 'scripts/compliance-audit-source-verification.ts'),
    join(fixture, 'scripts/compliance-audit-source-verification.ts'),
  );
});
afterEach(() => {
  rmSync(fixture, { recursive: true, force: true });
  expect(auditInvocations).toBe(1);
});
function run() {
  auditInvocations += 1;
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      join(root, 'node_modules/tsx/dist/loader.mjs'),
      join(fixture, 'scripts/compliance-audit-source-verification.ts'),
    ],
    { cwd: fixture, encoding: 'utf8', timeout: 15_000 },
  );
  if (result.error) throw result.error;
  return { status: result.status, output: result.stdout + result.stderr };
}
describe('native legal documentation audit', () => {
  it('uses monorepo translations and ADR 0100', () => {
    expect(run().status).toBe(0);
  });
  it('rejects a missing namespace even when the obsolete root contains it', () => {
    rmSync(join(fixture, 'apps/web/messages/it/consent.json'));
    put('messages/it/consent.json', '{"consent": {}}');
    const result = run();
    expect(result.status).toBe(1);
    expect(result.output).toContain('Missing translation file: apps/web/messages/it/consent.json');
  });
  it('requires an actual authority citation, not a deceptive host prefix', () => {
    put(
      'docs/compliance/countries/italy/data-protection.md',
      'https://www.garanteprivacy.it.example.org',
    );
    const result = run();
    expect(result.status).toBe(1);
    expect(result.output).toMatch(/Data Protection - Authority: Missing/);
  });
  it('fails explicitly on unreadable documents without dumping contents', () => {
    const file = join(fixture, 'docs/compliance/countries/italy/data-protection.md');
    rmSync(file);
    mkdirSync(file);
    const result = run();
    expect(result.status).toBe(1);
    expect(result.output).toContain('Unable to read compliance document');
    expect(result.output).not.toContain('EISDIR');
  });
  it.each([
    ['italy', 'https://www.agid.gov.it'],
    ['spain', 'https://administracionelectronica.gob.es'],
    ['france', 'https://www.numerique.gouv.fr'],
    ['germany', 'https://www.bfit-bund.de'],
  ])('uses the accessibility body, not the privacy regulator, for %s', (country, website) => {
    put(`docs/compliance/countries/${country}/accessibility-compliance.md`, website);
    expect(run().status).toBe(0);
  });
  it('does not accept a privacy regulator in place of the accessibility body', () => {
    put(
      'docs/compliance/countries/germany/accessibility-compliance.md',
      'https://www.bfdi.bund.de',
    );
    const result = run();
    expect(result.status).toBe(1);
    expect(result.output).toMatch(/Accessibility Compliance - Authority: Missing/);
  });
  it.each([
    ['italy', 'cookie-compliance', 'Provvedimento 229/2021'],
    ['france', 'accessibility-compliance', 'Law 78-17 Art. 47'],
  ])('blocks the known incorrect statutory reference in %s/%s', (country, document, reference) => {
    put(
      `docs/compliance/countries/${country}/${document}.md`,
      `${reference}\nhttps://www.garanteprivacy.it\nhttps://www.numerique.gouv.fr`,
    );
    const result = run();
    expect(result.status).toBe(1);
    expect(result.output).toContain('Statutory reference requires legal review');
  });
});
