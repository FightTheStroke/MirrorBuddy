import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(process.cwd(), 'apps/web/src');
function productionFiles(directory: string, testSupportDirectory = join(root, 'test')): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '__tests__') return [];
    const path = join(directory, entry.name);
    if (path === testSupportDirectory) return [];
    if (entry.isDirectory()) return productionFiles(path, testSupportDirectory);
    return /\.tsx?$/.test(path) && !/\.(test|spec)\.tsx?$/.test(path) ? [path] : [];
  });
}
const source = (path: string) => readFileSync(join(root, path), 'utf8');

describe('whole-surface authentication callsites', () => {
  it('excludes canonical test support without hiding production routes named test', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'mirrorbuddy-callsite-'));
    const paths = [
      'lib/unexpected.ts',
      'app/test/route.ts',
      'test/fixtures/session-credentials.ts',
      'lib/__tests__/helper.ts',
      'lib/helper.test.ts',
      'lib/helper.spec.ts',
    ];
    try {
      for (const path of paths) {
        const file = join(fixtureRoot, path);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, 'verifyCookieValue(input);');
      }
      const consumers = productionFiles(fixtureRoot, join(fixtureRoot, 'test'))
        .filter((file) => /\bverifyCookieValue(?:Async)?\s*\(/.test(readFileSync(file, 'utf8')))
        .map((file) => relative(fixtureRoot, file));
      expect(consumers.sort()).toEqual(['app/test/route.ts', 'lib/unexpected.ts']);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
  it('confines generic signing verification calls to the generic primitive and approved typed codecs', () => {
    const consumers = productionFiles(root)
      .filter((file) => /\bverifyCookieValue(?:Async)?\s*\(/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(root, file));
    expect(consumers.sort()).toEqual([
      'lib/auth/cookie-signing.ts',
      'lib/auth/readonly-smoke-receipt.ts',
      'lib/auth/session-token.ts',
    ]);
  });
  it.each([
    ['app/api/auth/login/route.ts', 'issuePasswordSession'],
    ['app/api/onboarding/handlers.ts', 'createGuestSession'],
    ['app/api/user/route.ts', 'createGuestSession'],
    ['app/api/auth/logout/route.ts', 'revokeSession'],
    ['app/api/auth/change-password/route.ts', 'changeSessionPassword'],
    ['app/api/auth/reset-password/route.ts', 'consumePasswordReset'],
    ['app/api/auth/session/upgrade/route.ts', 'upgradeLegacySession'],
  ])('%s uses the shared durable operation %s', (file, operation) => {
    expect(source(file)).toContain(operation);
    expect(source(file)).not.toMatch(/\bsignCookieValue\s*\(/);
  });
  it('both authentication readers share the resolver and never auto-provision identities', () => {
    expect(source('lib/auth/session-auth.ts')).toContain('resolveSessionToken(token)');
    expect(source('lib/auth/session-auth.ts')).not.toMatch(/\.user\.(create|upsert)\(/);
    expect(source('lib/api/middlewares/validate-auth-streaming.ts')).toContain(
      'await validateAuth()',
    );
  });
  it('server navigation forwards the actual credential instead of fabricating a userId cookie', () => {
    const page = source('app/[locale]/parent-dashboard/page.tsx');
    expect(page).toContain("(await headers()).get('cookie')");
    expect(page).not.toContain('mirrorbuddy-user-id=${userId}');
  });
  it('activation has no request/provider/boot caller and SSO remains provisioning-only', () => {
    for (const directory of ['app', 'components']) {
      for (const file of productionFiles(join(root, directory))) {
        expect(readFileSync(file, 'utf8')).not.toMatch(/\bactivateSessionLifecycle\s*\(/);
      }
    }
    for (const provider of ['google', 'microsoft']) {
      expect(source(`app/api/auth/sso/${provider}/callback/route.ts`)).not.toMatch(
        /issuePasswordSession|insertSession|setSessionCookies/,
      );
    }
  });
});
