// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFile, resolve } from '../compliance-checks/types';
import { inspectMutationRoutes } from '../compliance-checks/api-route-policy';
import { createApiModuleLoader } from '../compliance-checks/api-module-loader';
import { CSRF_EXCEPTIONS, isReviewedCsrfException } from '../compliance-checks/csrf-exceptions';

describe('method-scoped CSRF compliance', () => {
  const imports = `import { pipe, withCSRF, withAuth, withAdmin } from '@/lib/api/middlewares';`;
  it('does not mistake imports, comments or a protected GET for a mutation guard', () => {
    const source = `${imports}
      // withCSRF; eslint-disable require-csrf-mutating-routes
      export const GET = pipe(withCSRF, withAuth)(async () => {});
      export const POST = pipe(withAuth)(async () => {});`;
    expect(inspectMutationRoutes(source)).toEqual([
      expect.objectContaining({ method: 'POST', protected: false }),
    ]);
  });
  it('checks actual middleware order rather than import order', () => {
    expect(
      inspectMutationRoutes(`${imports}
      export const POST = pipe(withAdmin, withCSRF)(async () => {});`)[0],
    ).toMatchObject({ protected: true, orderIssue: true });
    expect(
      inspectMutationRoutes(`${imports}
      export const POST = pipe(withCSRF, withAuth)(async () => {});`)[0],
    ).toMatchObject({ protected: true, orderIssue: false });
  });
  it('checks every method, including exported functions', () => {
    expect(
      inspectMutationRoutes(`${imports}
      export const POST = pipe(withCSRF)(async () => {});
      export async function DELETE() { return null; }`),
    ).toEqual([
      expect.objectContaining({ method: 'POST', protected: true }),
      expect.objectContaining({ method: 'DELETE', protected: false }),
    ]);
  });
  it('does not trust a same-named local middleware', () => {
    expect(
      inspectMutationRoutes(`
      const withCSRF = () => {};
      export const POST = pipe(withCSRF)(async () => {});`)[0].protected,
    ).toBe(false);
  });
  it('resolves constant handler aliases and the public pipe export', () => {
    expect(
      inspectMutationRoutes(`
      import { pipe } from '@/lib/api/pipe';
      import { withCSRF } from '@/lib/api/middlewares';
      const handler = pipe(withCSRF)(async () => {});
      export const POST = handler;`)[0].protected,
    ).toBe(true);
  });
  it('audits reexported handlers and detects removal of their actual CSRF guard', () => {
    const route = `export { POST, PATCH } from './handlers';`;
    const load = () => ({
      filename: '/api/handlers.ts',
      content: `${imports}
        export const POST = pipe(withCSRF, withAuth)(async () => {});
        export const PATCH = pipe(withAuth)(async () => {});`,
    });
    expect(inspectMutationRoutes(route, load)).toEqual([
      expect.objectContaining({ method: 'POST', protected: true }),
      expect.objectContaining({ method: 'PATCH', protected: false }),
    ]);
    expect(
      inspectMutationRoutes(route, () => ({
        ...load(),
        content: load().content.replace('withCSRF, withAuth)(', 'withAuth)('),
      }))[0].protected,
    ).toBe(false);
  });
  it('does not silently accept missing, external or cyclic reexports', () => {
    expect(inspectMutationRoutes(`export { POST } from 'external';`)[0]).toMatchObject({
      method: 'POST',
      protected: false,
      unresolved: true,
    });
    expect(
      inspectMutationRoutes(`export * from './cycle';`, () => ({
        filename: '/cycle.ts',
        content: `export * from './cycle';`,
      }))[0],
    ).toMatchObject({ protected: false, unresolved: true });
  });
  it('resolves named local handler exports', () => {
    expect(
      inspectMutationRoutes(`${imports}
      const handler = pipe(withCSRF)(async () => {});
      export { handler as POST };`)[0],
    ).toMatchObject({ method: 'POST', protected: true });
  });
  it.each([
    ['notifications', 3],
    ['onboarding', 1],
  ] as const)(
    'finds all %s mutations and fails when the underlying guards are removed',
    (route, count) => {
      const filename = resolve(`src/app/api/${route}/route.ts`);
      const source = readFile(`src/app/api/${route}/route.ts`)!;
      const load = createApiModuleLoader(resolve('src'));
      const policies = inspectMutationRoutes(source, load, filename);
      expect(policies).toHaveLength(count);
      expect(policies.every((policy) => policy.protected && !policy.unresolved)).toBe(true);
      const damaged = inspectMutationRoutes(
        source,
        (specifier, from) => {
          const loaded = load(specifier, from);
          return (
            loaded && {
              ...loaded,
              content: loaded.content.replace(/^\s*withCSRF,\s*$/gm, ''),
            }
          );
        },
        filename,
      );
      expect(damaged).toHaveLength(count);
      expect(damaged.every((policy) => !policy.protected)).toBe(true);
    },
  );
  it('does not follow modules outside the app source or third-party packages', () => {
    const load = createApiModuleLoader(resolve('src'));
    const filename = resolve('src/app/api/onboarding/route.ts');
    expect(load('../../../../../../package.json', filename)).toBeNull();
    expect(load('typescript', filename)).toBeNull();
    expect(load('@/../../package.json', filename)).toBeNull();
  });
  it.each(Object.entries(CSRF_EXCEPTIONS))(
    'binds %s exception to reviewed method and source',
    (route, policy) => {
      const source = readFile(`src/app${route}/route.ts`)!;
      expect(isReviewedCsrfException(route, policy.method, source)).toBe(true);
      expect(isReviewedCsrfException(route, 'DELETE', source)).toBe(false);
      expect(isReviewedCsrfException(`${route}/other`, policy.method, source)).toBe(false);
      expect(isReviewedCsrfException(route, policy.method, `${source}\nvalidateAuth();`)).toBe(
        false,
      );
      expect(policy.authority.length).toBeGreaterThan(30);
    },
  );
  it('never exempts a new route merely because it is public, auth, monitoring or webhook-labelled', () => {
    for (const route of [
      '/api/auth/new',
      '/api/monitoring/mutate',
      '/api/webhooks/new',
      '/api/public',
    ]) {
      expect(isReviewedCsrfException(route, 'POST', '// public no csrf')).toBe(false);
    }
  });
});
