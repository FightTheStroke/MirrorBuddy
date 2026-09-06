import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(__dirname, '../../../..');
const files = [
  'e2e/helpers/durable-session.ts',
  'e2e/helpers/session-token-factory.ts',
  'e2e/helpers/session-token-command.ts',
  'e2e/helpers/session-cookie-format.ts',
  'e2e/helpers/auth-session.ts',
  'e2e/helpers/prisma-setup.ts',
  'e2e/helpers/test-data.ts',
  'e2e/helpers/e2e-user-factory.ts',
  'e2e/fixtures/auth-fixtures.ts',
  'e2e/fixtures/auth-fixtures-helpers.ts',
  'e2e/fixtures/user-fixtures.ts',
  'e2e/global-setup.ts',
  'e2e/auth.spec.ts',
  'e2e/invite.spec.ts',
  'e2e/tos.spec.ts',
  'e2e/authorization-cookies.spec.ts',
  'e2e/cookie-signing.spec.ts',
  'e2e/auth-system.spec.ts',
  'e2e/production-smoke/fixtures.ts',
  'playwright.config.ts',
  'playwright.config.study-kit.ts',
];
const source = (file: string) => readFileSync(path.join(root, file), 'utf8');

describe('bounded E2E authentication callsite compatibility', () => {
  it.each(files)('parses the migrated TypeScript source without executing fixtures: %s', (file) => {
    const result = ts.transpileModule(source(file), {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    });
    expect(result.diagnostics).toEqual([]);
  });
  it('reuses T1 issuance in the server-only process rather than duplicating signing', () => {
    expect(source('e2e/helpers/session-token-command.ts')).toContain(
      "import { createSessionToken } from '../../src/lib/auth/session-token'",
    );
    expect(source('e2e/helpers/session-token-factory.ts')).toContain('--conditions=react-server');
    for (const file of files) {
      expect(source(file), file).not.toMatch(/\bcreateHmac\b|function signCookieValue\b/);
    }
  });
  it('has no fabricated-owner success fallback or admin-flag authorization fixture', () => {
    for (const file of [
      'e2e/global-setup.ts',
      'e2e/fixtures/auth-fixtures-helpers.ts',
      'e2e/fixtures/auth-fixtures.ts',
    ]) {
      expect(source(file), file).not.toMatch(
        /admin-test-session-|admin-session|Fallback: generate IDs/,
      );
    }
    expect(source('e2e/global-setup.ts')).toContain('await issueTestSession(prisma, testUserId)');
    expect(source('e2e/fixtures/auth-fixtures-helpers.ts')).toContain("role: 'ADMIN'");
  });
  it('never activates legacy grace as a fixture side effect', () => {
    for (const file of files) {
      expect(source(file), file).not.toMatch(/sessionActivatedAt|activateSessions|activateSession/);
    }
  });
  it('keeps production smoke externally provisioned and server-verified, never issuing there', () => {
    const fixture = source('e2e/production-smoke/fixtures.ts');
    expect(fixture).toContain('requireNativeFixtureCookie(PROD_TEST_USER_COOKIE_VALUE)');
    expect(fixture).toContain("api.get('/api/user'");
    expect(fixture).not.toContain('issueTestSession');
  });
});
