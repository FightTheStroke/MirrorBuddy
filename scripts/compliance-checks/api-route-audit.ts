import fs from 'fs';
import path from 'path';
import { CheckResult, findFiles, resolve } from './types';

const CAT = 'API Route Audit';

// Endpoints that are allowed to skip CSRF (public or webhook/cron)
const CSRF_EXEMPT_PATTERNS = [
  '/api/auth/',
  '/api/webhook',
  '/api/cron/',
  '/api/tos',
  '/api/health',
  '/api/monitoring',
  '/api/compliance/audit-log',
];

// HTTP methods that require CSRF protection
const MUTATING_METHODS = /export\s+const\s+(POST|PUT|PATCH|DELETE)\b/;

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

  for (const fullPath of routeFiles) {
    const relPath = fullPath.replace(resolve('') + path.sep, '');
    const content = fs.readFileSync(fullPath, 'utf-8');

    // Skip non-mutating routes
    if (!MUTATING_METHODS.test(content)) continue;

    const isExempt = CSRF_EXEMPT_PATTERNS.some((p) => relPath.includes(p));
    const isAdmin = relPath.includes('/api/admin/');

    // Check CSRF on mutating endpoints
    // Respect explicit eslint-disable for require-csrf-mutating-routes (deliberate exemption)
    const hasExplicitExemption = content.includes('require-csrf-mutating-routes');
    if (
      !isExempt &&
      !hasExplicitExemption &&
      !content.includes('withCSRF') &&
      !content.includes('withCron')
    ) {
      missingCsrf++;
      if (csrfWarnings.length < 5) {
        csrfWarnings.push(relPath);
      }
    }

    // Check admin middleware on admin routes
    if (isAdmin && !content.includes('withAdmin')) {
      missingAdmin++;
      if (adminWarnings.length < 5) {
        adminWarnings.push(relPath);
      }
    }

    // Check CSRF before auth in pipe chain
    if (isAdmin && content.includes('withCSRF') && content.includes('withAdmin')) {
      const csrfIdx = content.indexOf('withCSRF');
      const adminIdx = content.indexOf('withAdmin');
      if (csrfIdx > adminIdx) {
        csrfOrderIssues++;
        if (orderWarnings.length < 3) {
          orderWarnings.push(relPath);
        }
      }
    }
  }

  // Report CSRF findings
  if (missingCsrf > 0) {
    add(
      'CSRF on mutating routes',
      'WARN',
      `${missingCsrf} mutating route(s) lack withCSRF: ${csrfWarnings.join(', ')}${missingCsrf > 5 ? '...' : ''}`,
    );
  } else {
    add('CSRF on mutating routes', 'PASS', 'All mutating routes have CSRF protection');
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
      `${csrfOrderIssues} route(s) have withCSRF after withAdmin: ${orderWarnings.join(', ')}`,
    );
  } else {
    add('CSRF before auth order', 'PASS', 'withCSRF appears before withAdmin in all pipe chains');
  }

  return results;
}
