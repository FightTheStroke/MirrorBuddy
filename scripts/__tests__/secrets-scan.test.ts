// @vitest-environment node
// Behaviour regressions for scripts/secrets-scan.sh. The fixture harness lives in
// the sibling secrets-scan-fixture.ts module.
import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import { join } from 'node:path';
import {
  SHARED_REPORT,
  checkout,
  cleanupRoots,
  random,
  scan,
  scanner,
  synthetic,
} from './secrets-scan-fixture';

afterEach(cleanupRoots);

describe('secrets scan harness', () => {
  it('runs the unmodified repository script', () => {
    const root = checkout();
    const digest = (file: string) => fs.readFileSync(file).toString('base64');
    expect(digest(join(root, 'scripts/secrets-scan.sh'))).toBe(digest(scanner));
  });
  it('scans the fixture checkout rather than any other directory', () => {
    // Planted under scripts/, a root today's scanner already reads, so this case
    // isolates working-directory resolution from the monorepo-scope defect.
    const relative = `scripts/${random(12)}-marker.sh`;
    const outcome = scan(checkout({ [relative]: `const key = '${synthetic.resendKey()}';\n` }));
    expect(outcome.critical, 'the planted fixture secret must be found').toBe(1);
    expect(outcome.report?.contents ?? '').toContain(relative);
  });
  it('passes a clean monorepo checkout', () => {
    const files = { 'apps/web/src/page.tsx': 'export const x = 1;\n' };
    const outcome = scan(
      checkout({ ...files, 'packages/ui/src/index.ts': 'export const u = 1;\n' }),
    );
    expect(outcome.status).toBe(0);
    expect(outcome.critical).toBe(0);
  });
});

describe('secrets scan fails closed on tooling faults', () => {
  it('reports a tooling fault when the search binary is absent', () => {
    const outcome = scan(checkout({ 'apps/web/src/page.tsx': 'export const x = 1;\n' }), {
      search: 'absent',
    });
    expect(outcome.status).toBe(2);
    expect(outcome.stdout).not.toContain('"status":"PASS"');
  });
  it('reports a tooling fault when the search engine rejects a pattern', () => {
    const clean = { 'apps/web/src/page.tsx': 'export const x = 1;\n' };

    const failing = scan(checkout(clean), { search: 'failing' });
    expect(failing.status).toBe(2);
    expect(scan(checkout(clean)).status).toBe(0);
  });
});

describe('secrets scan monorepo coverage', () => {
  it.each([
    ['the web application source', 'apps/web/src/config.ts'],
    ['a shared package source', 'packages/ui/src/config.ts'],
    ['a repository script', 'scripts/deploy-helper.sh'],
    ['an end-to-end spec', 'apps/web/e2e/login.spec.ts'],
  ])('detects a planted API key in %s', (_label, relative) => {
    const outcome = scan(checkout({ [relative]: `const key = '${synthetic.resendKey()}';\n` }));
    expect(outcome.status).toBe(1);
    expect(outcome.critical).toBe(1);
  });
  it('detects a private key header despite its leading hyphens', () => {
    const outcome = scan(
      checkout({ 'apps/web/src/cert.ts': `const pem = \`${synthetic.privateKey()}\`;\n` }),
    );
    expect(outcome.status).toBe(1);
    expect(outcome.critical).toBe(1);
  });
  it('detects a remote database password but accepts a local one', () => {
    const remote = scan(
      checkout({ 'apps/web/src/db.ts': `const url = '${synthetic.remoteDsn()}';\n` }),
    );
    const local = scan(
      checkout({ 'apps/web/src/db.ts': `const url = '${synthetic.localDsn()}';\n` }),
    );
    expect(remote.status).toBe(1);
    expect(remote.critical).toBe(1);
    expect(local.status).toBe(0);
    expect(local.critical).toBe(0);
  });
});

describe('secrets scan preserved semantics', () => {
  it('keeps the known-safe exclusions under strict mode', () => {
    const key = synthetic.resendKey();
    const outcome = scan(
      checkout({
        '.env.example': `RESEND_API_KEY=${key}\n`,
        'docs/setup.md': `Use ${key} as an example.\n`,
        'apps/web/src/app/admin/page.tsx':
          "export const url = 'https://mirrorbuddy.grafana.net/d/x';\n",
      }),
      { args: ['--json', '--strict'] },
    );
    expect(outcome.status).toBe(0);
    expect(outcome.critical).toBe(0);
    expect(outcome.warnings).toBe(0);
  });
  it('treats a focused test as a warning by default and a failure under strict', () => {
    const files = { 'apps/web/e2e/login.spec.ts': "it.only('logs in', () => {});\n" };

    const normal = scan(checkout(files));
    const strict = scan(checkout(files), { args: ['--json', '--strict'] });
    expect(normal.status).toBe(0);
    expect(normal.warnings).toBe(1);
    expect(strict.status).toBe(1);
    expect(strict.warnings).toBe(1);
  });
});

describe('secrets scan report handling', () => {
  it('writes an owned report and never the shared path', () => {
    const before = fs.existsSync(SHARED_REPORT) ? fs.statSync(SHARED_REPORT).mtimeMs : null;
    const root = checkout({ 'scripts/deploy-helper.sh': `KEY='${synthetic.resendKey()}'\n` });

    const outcome = scan(root);
    expect(outcome.critical).toBe(1);
    expect(outcome.report, 'a findings report must exist').toBeDefined();
    expect(outcome.report?.path.startsWith(`${root}/`)).toBe(true);
    expect(outcome.report?.mode).toBe(0o600);
    expect(fs.existsSync(SHARED_REPORT) ? fs.statSync(SHARED_REPORT).mtimeMs : null).toBe(before);
  });
  it('never prints or stores the matched value', () => {
    const key = synthetic.resendKey();
    const outcome = scan(checkout({ 'scripts/deploy-helper.sh': `KEY='${key}'\n` }), { args: [] });
    expect(outcome.status).toBe(1);
    expect(outcome.stdout).toContain('SECRETS SCAN FAIL');
    expect(outcome.report, 'a findings report must exist').toBeDefined();
    expect(outcome.stdout).not.toContain(key);
    expect(outcome.stderr).not.toContain(key);
    expect(outcome.report?.contents ?? key).not.toContain(key);
  });
});

const source = (value: string) => `export const value = '${value}';\n`;

describe('secrets scan critical categories', () => {
  it.each([
    ['a Sentry DSN', 'apps/web/src/telemetry.ts', synthetic.sentryDsn()],
    ['a Vercel project identifier', 'apps/web/src/deploy.ts', synthetic.vercelId()],
    ['a hardcoded JWT', 'apps/web/src/token.ts', synthetic.jwt()],
    ['a personal username in a script', 'scripts/db-restore.sh', synthetic.personalUsername()],
  ])('detects %s', (_label, relative, value) => {
    const outcome = scan(checkout({ [relative]: source(value) }));
    expect(outcome.status).toBe(1);
    expect(outcome.critical).toBe(1);
    expect(outcome.warnings).toBe(0);
    expect(outcome.stdout).not.toContain(value);
    expect(outcome.stderr).not.toContain(value);
    expect(outcome.report?.contents ?? value).not.toContain(value);
  });

  it.each([
    [
      'a placeholder Sentry DSN',
      'apps/web/src/telemetry.ts',
      'https://placeholder@o12345.ingest.invalid/42',
    ],
    ['a short Vercel identifier', 'apps/web/src/deploy.ts', 'prj_demo'],
    ['a JWT inside a test file', 'apps/web/src/token.test.ts', synthetic.jwt()],
    ['a personal username outside scripts', 'apps/web/src/legacy.ts', synthetic.awsStyleUsername()],
  ])('does not report %s', (_label, relative, value) => {
    const outcome = scan(checkout({ [relative]: source(value) }));
    expect(outcome.status).toBe(0);
    expect(outcome.critical).toBe(0);
  });
});

describe('secrets scan warning categories', () => {
  it('warns about a personal email in application code but not in a script', () => {
    const comment = `// contact ${synthetic.personalEmail()}\n`;

    const code = scan(checkout({ 'apps/web/src/support.ts': comment }));
    const script = scan(checkout({ 'scripts/support.sh': comment }));

    expect(code.status).toBe(0);
    expect(code.critical).toBe(0);
    expect(code.warnings).toBe(1);
    expect(script.warnings).toBe(0);
  });

  it('warns about a debugger statement but not an inline mention of one', () => {
    const statement = scan(
      checkout({ 'apps/web/src/trace.ts': 'function f() {\n  debugger;\n}\n' }),
    );
    const mention = scan(checkout({ 'apps/web/src/trace.ts': source('debugger;') }));

    expect(statement.warnings).toBe(1);
    expect(statement.status).toBe(0);
    expect(mention.warnings).toBe(0);
  });
});

describe('secrets scan changed exclusion filters', () => {
  const grafana = 'https://mirrorbuddy.grafana.net/d/overview';

  it('warns about a live Grafana URL but excludes a commented one', () => {
    const live = scan(checkout({ 'apps/web/src/links.ts': source(grafana) }), {
      args: ['--json', '--strict'],
    });
    const commented = scan(checkout({ 'apps/web/src/links.ts': `  // ${grafana}\n` }), {
      args: ['--json', '--strict'],
    });

    expect(live.status).toBe(1);
    expect(live.warnings).toBe(1);
    expect(commented.status).toBe(0);
    expect(commented.warnings).toBe(0);
  });

  it('warns about a production URL but excludes example.com and mailto lines', () => {
    const live = scan(checkout({ 'apps/web/src/lib/site.ts': source('https://mirrorbuddy.org') }));
    const filtered = scan(
      checkout({
        'apps/web/src/lib/site.ts':
          '// see https://example.com instead of mirrorbuddy.org\n// mailto:hello@mirrorbuddy.org\n',
      }),
    );

    expect(live.warnings).toBe(1);
    expect(live.status).toBe(0);
    expect(filtered.warnings).toBe(0);
  });
});
