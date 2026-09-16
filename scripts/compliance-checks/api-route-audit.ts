import fs from 'fs';
import path from 'path';
import { CheckResult, findFiles, resolve } from './types';
import { inspectMutationRoutes } from './api-route-policy';
import { createApiModuleLoader } from './api-module-loader';
import { isReviewedCsrfException } from './csrf-exceptions';

const CAT = 'API Route Audit';

export async function runApiRouteAuditChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  function add(name: string, status: CheckResult['status'], message: string): void {
    results.push({ name, status, message, category: CAT });
  }

  const routeFiles = findFiles('src/app/api', /route\.ts$/);

  if (routeFiles.length === 0) {
    add('API routes found', 'WARN', 'No route.ts files found in src/app/api/');
    return results;
  }

  add('API routes found', 'PASS', `Found ${routeFiles.length} API route files`);

  let missingCsrf = 0;
  let missingAdmin = 0;
  let csrfOrderIssues = 0;
  const csrfWarnings: string[] = [];
  const adminWarnings: string[] = [];
  const orderWarnings: string[] = [];
  const loadModule = createApiModuleLoader(resolve('src'));

  for (const fullPath of routeFiles) {
    const relPath = fullPath.replace(resolve('') + path.sep, '');
    const content = fs.readFileSync(fullPath, 'utf-8');

    const route =
      '/' +
      path
        .relative(resolve('src/app'), fullPath)
        .replace(/\\/g, '/')
        .replace(/\/route\.ts$/, '');
    const isAdmin = relPath.includes('/api/admin/');

    for (const mutation of inspectMutationRoutes(content, loadModule, fullPath)) {
      const label = `${mutation.method} ${route}${mutation.unresolved ? ' (unresolved export)' : ''}`;
      if (
        mutation.unresolved ||
        (!mutation.protected && !isReviewedCsrfException(route, mutation.method, content))
      ) {
        missingCsrf++;
        csrfWarnings.push(label);
      }
      if (isAdmin && !mutation.admin) {
        missingAdmin++;
        adminWarnings.push(label);
      }
      if (mutation.orderIssue) {
        csrfOrderIssues++;
        orderWarnings.push(label);
      }
    }
  }

  // Report CSRF findings
  if (missingCsrf > 0) {
    add(
      'CSRF on mutating routes',
      'WARN',
      `${missingCsrf} mutation(s) lack CSRF protection or a current reviewed exception: ${csrfWarnings.join(', ')}`,
    );
  } else {
    add(
      'CSRF on mutating routes',
      'PASS',
      'All mutations have executed CSRF/cron protection or an exact reviewed exception',
    );
  }

  // Report admin middleware findings
  if (missingAdmin > 0) {
    add(
      'Admin auth on admin routes',
      'WARN',
      `${missingAdmin} admin route(s) lack withAdmin: ${adminWarnings.join(', ')}${missingAdmin > 5 ? '...' : ''}`,
    );
  } else {
    add('Admin auth on admin routes', 'PASS', 'All admin routes have withAdmin middleware');
  }

  // Report CSRF order findings
  if (csrfOrderIssues > 0) {
    add(
      'CSRF before auth order',
      'WARN',
      `${csrfOrderIssues} mutation(s) have CSRF after auth: ${orderWarnings.join(', ')}`,
    );
  } else {
    add(
      'CSRF before auth order',
      'PASS',
      'CSRF precedes auth in all inspected mutation pipe chains',
    );
  }

  return results;
}
