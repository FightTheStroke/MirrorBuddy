// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const page = readFileSync('apps/web/src/app/admin/users/page.tsx', 'utf8');
const api = readFileSync('apps/web/src/app/api/admin/users/route.ts', 'utf8');
const trash = readFileSync('apps/web/src/app/api/admin/users/trash/route.ts', 'utf8');
const service = readFileSync('apps/web/src/lib/admin/user-list-service.ts', 'utf8');
const mutations = [
  readFileSync('apps/web/src/app/api/admin/users/[id]/route.ts', 'utf8'),
  readFileSync('apps/web/src/app/api/admin/users/trash/[id]/restore/route.ts', 'utf8'),
  readFileSync('apps/web/src/app/api/admin/users/[id]/tier/route.ts', 'utf8'),
];

describe('actual users query seams stay bounded (source contract, not ORM proof)', () => {
  it('has no SSR findMany bypass and uses the same query service for bounded read APIs', () => {
    expect(page).not.toContain('prisma.user.findMany');
    expect(page).toContain('getUserList(params)');
    expect(page).toContain('validateAdminReadOnlyAuth');
    expect(api).toContain('withAdminReadOnly');
    expect(api).toContain('getUserList(');
    expect(trash).toContain('getUserList(');
  });

  it('requires an explicit take and select on every real user/trash findMany call', () => {
    const file = ts.createSourceFile(
      'service.ts',
      service,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    let found = 0;
    const visit = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'findMany'
      ) {
        const args = node.arguments[0];
        expect(args && ts.isObjectLiteralExpression(args)).toBe(true);
        if (args && ts.isObjectLiteralExpression(args)) {
          const names = args.properties.flatMap((property) =>
            property.name && ts.isIdentifier(property.name) ? [property.name.text] : [],
          );
          expect(names).toContain('take');
          expect(names).toContain('select');
          expect(names).toContain('orderBy');
        }
        found++;
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    expect(found).toBe(6);
  });

  it('retains owner-only mutations with CSRF before the admin guard', () => {
    for (const code of mutations) {
      const file = ts.createSourceFile('route.ts', code, ts.ScriptTarget.Latest, true);
      let checked = 0;
      const visit = (node: ts.Node) => {
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'pipe'
        ) {
          const csrf = node.arguments.findIndex(
            (arg) => ts.isIdentifier(arg) && arg.text === 'withCSRF',
          );
          const admin = node.arguments.findIndex(
            (arg) => ts.isIdentifier(arg) && arg.text === 'withAdmin',
          );
          expect(csrf).toBeGreaterThanOrEqual(0);
          expect(admin).toBeGreaterThan(csrf);
          checked++;
        }
        ts.forEachChild(node, visit);
      };
      visit(file);
      expect(checked).toBeGreaterThan(0);
    }
  });
});
