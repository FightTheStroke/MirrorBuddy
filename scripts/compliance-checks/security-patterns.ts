import { CheckResult, fileExists, fileContains, findFiles, readFile } from './types';

const CAT = 'Security Patterns';

export async function runSecurityPatternsChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  function add(name: string, status: CheckResult['status'], message: string): void {
    results.push({ name, status, message, category: CAT });
  }

  // --- Middleware exports ---
  const mwIndex = 'src/lib/api/middlewares/index.ts';
  if (!fileExists(mwIndex)) {
    add('Middleware index', 'FAIL', `Missing: ${mwIndex}`);
  } else {
    const required = ['withCSRF', 'withAuth', 'withAdmin', 'withSentry', 'withRateLimit'];
    const missing = required.filter((m) => !fileContains(mwIndex, m));
    if (missing.length > 0) {
      add('Middleware exports', 'FAIL', `Middleware index missing: ${missing.join(', ')}`);
    } else {
      add('Middleware exports', 'PASS', 'All required middlewares exported');
    }
  }

  // --- CSP in proxy ---
  const proxyPath = 'src/proxy.ts';
  if (!fileExists(proxyPath)) {
    add('CSP proxy', 'FAIL', `Missing: ${proxyPath}`);
  } else {
    const cspDirectives = ['script-src', 'style-src'];
    const missing = cspDirectives.filter((d) => !fileContains(proxyPath, d));
    if (missing.length > 0) {
      add('CSP directives', 'WARN', `Proxy may lack CSP directives: ${missing.join(', ')}`);
    } else {
      add('CSP directives', 'PASS', 'Proxy contains CSP directives');
    }
  }

  // --- CSRF module ---
  const csrfPath = 'src/lib/security/csrf.ts';
  if (!fileExists(csrfPath)) {
    add('CSRF module', 'FAIL', `Missing: ${csrfPath}`);
  } else {
    const hasFns =
      fileContains(csrfPath, 'generateCSRF') ||
      fileContains(csrfPath, 'validateCSRF') ||
      fileContains(csrfPath, 'csrfToken');
    if (!hasFns) {
      add('CSRF functions', 'WARN', 'CSRF module may lack generate/validate functions');
    } else {
      add('CSRF functions', 'PASS', 'CSRF module has token functions');
    }
  }

  // --- Cookie constants ---
  const cookiePath = 'src/lib/auth/cookie-constants.ts';
  if (!fileExists(cookiePath)) {
    add('Cookie constants', 'FAIL', `Missing: ${cookiePath}`);
  } else {
    const cookies = ['mirrorbuddy-user-id', 'mirrorbuddy-visitor-id', 'csrf-token'];
    const missing = cookies.filter((c) => !fileContains(cookiePath, c));
    if (missing.length > 0) {
      add('Cookie constants', 'WARN', `Cookie constants missing: ${missing.join(', ')}`);
    } else {
      add('Cookie constants', 'PASS', 'All required cookie names defined');
    }
  }

  // --- PII encryption ---
  const piiPath = 'src/lib/security/pii-encryption.ts';
  if (!fileExists(piiPath)) {
    add('PII encryption', 'FAIL', `Missing: ${piiPath}`);
  } else {
    const hasFns = fileContains(piiPath, 'encrypt') && fileContains(piiPath, 'decrypt');
    if (!hasFns) {
      add('PII encryption fns', 'WARN', 'PII encryption may lack encrypt/decrypt functions');
    } else {
      add('PII encryption fns', 'PASS', 'PII encryption has encrypt/decrypt');
    }
  }

  // --- No unsafe raw SQL in API routes ---
  // $queryRaw`...` (tagged template) is safe/parameterized.
  // $queryRawUnsafe / $executeRawUnsafe are the real risks.
  const routeFiles = findFiles('src/app/api', /route\.ts$/);
  const unsafeSqlFiles: string[] = [];
  for (const file of routeFiles) {
    const content = readFile(
      file.replace(process.cwd() + '/', '').replace(process.cwd() + '\\', ''),
    );
    if (content && /\$queryRawUnsafe|\$executeRawUnsafe/.test(content)) {
      unsafeSqlFiles.push(file.split('src/')[1] || file);
    }
  }
  if (unsafeSqlFiles.length > 0) {
    add(
      'No unsafe raw SQL',
      'FAIL',
      `Unsafe raw SQL in ${unsafeSqlFiles.length} route(s): ${unsafeSqlFiles.slice(0, 3).join(', ')}`,
    );
  } else {
    add('No unsafe raw SQL', 'PASS', 'No $queryRawUnsafe/$executeRawUnsafe in API routes');
  }

  return results;
}
