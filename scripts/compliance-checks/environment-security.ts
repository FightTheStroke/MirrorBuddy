import { CheckResult, fileExists, fileContains, findFiles, readFile } from './types';

const CAT = 'Environment Security';

// Patterns that indicate hardcoded secrets in source code
const SECRET_PATTERNS = [
  /sk_live_[a-zA-Z0-9]{20,}/,
  /sk_test_[a-zA-Z0-9]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /ghp_[a-zA-Z0-9]{36}/,
  /gho_[a-zA-Z0-9]{36}/,
  /xoxb-[0-9]{10,}-[a-zA-Z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
];

// Variable names that may indicate PII logging
const PII_LOG_PATTERNS = [
  /console\.log\([^)]*password/i,
  /console\.log\([^)]*email[^T]/i,
  /console\.log\([^)]*token[^s]/i,
  /console\.log\([^)]*secret/i,
  /console\.log\([^)]*creditCard/i,
  /console\.log\([^)]*ssn\b/i,
];

export async function runEnvironmentSecurityChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  function add(name: string, status: CheckResult['status'], message: string): void {
    results.push({ name, status, message, category: CAT });
  }

  // --- .env.example exists ---
  if (!fileExists('.env.example')) {
    add('.env.example', 'FAIL', 'Missing .env.example file');
  } else {
    const requiredVars = ['DATABASE_URL', 'SESSION_SECRET', 'CRON_SECRET'];
    const missing = requiredVars.filter((v) => !fileContains('.env.example', v));
    if (missing.length > 0) {
      add('.env.example vars', 'WARN', `.env.example missing patterns: ${missing.join(', ')}`);
    } else {
      add('.env.example vars', 'PASS', '.env.example contains all required variable patterns');
    }
  }

  // --- .gitignore exclusions ---
  if (!fileExists('.gitignore')) {
    add('.gitignore', 'FAIL', 'Missing .gitignore file');
  } else {
    const exclusions = ['.env', '.env.local', '.env.production'];
    const missing = exclusions.filter((e) => !fileContains('.gitignore', e));
    if (missing.length > 0) {
      add('.gitignore env', 'WARN', `.gitignore missing exclusions: ${missing.join(', ')}`);
    } else {
      add('.gitignore env', 'PASS', '.gitignore excludes all env files');
    }
  }

  // --- No hardcoded API keys in source ---
  const srcFiles = findFiles('src', /\.(ts|tsx)$/);
  const secretFiles: string[] = [];
  for (const file of srcFiles) {
    const relPath = file.replace(process.cwd() + '/', '');
    // Skip test files and type definitions
    if (relPath.includes('__tests__') || relPath.includes('.test.') || relPath.includes('.d.ts')) {
      continue;
    }
    const content = readFile(relPath);
    if (!content) continue;

    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        secretFiles.push(relPath);
        break;
      }
    }
  }

  if (secretFiles.length > 0) {
    add(
      'No hardcoded secrets',
      'FAIL',
      `Possible hardcoded secrets in ${secretFiles.length} file(s): ${secretFiles.slice(0, 3).join(', ')}`,
    );
  } else {
    add('No hardcoded secrets', 'PASS', 'No hardcoded API keys detected in source');
  }

  // --- No PII in console.log in API routes ---
  const apiFiles = findFiles('src/app/api', /\.(ts|tsx)$/);
  const piiLogFiles: string[] = [];
  for (const file of apiFiles) {
    const relPath = file.replace(process.cwd() + '/', '');
    if (relPath.includes('__tests__') || relPath.includes('.test.')) continue;
    const content = readFile(relPath);
    if (!content) continue;

    for (const pattern of PII_LOG_PATTERNS) {
      if (pattern.test(content)) {
        piiLogFiles.push(relPath);
        break;
      }
    }
  }

  if (piiLogFiles.length > 0) {
    add(
      'No PII logging',
      'WARN',
      `Possible PII in console.log in ${piiLogFiles.length} file(s): ${piiLogFiles.slice(0, 3).join(', ')}`,
    );
  } else {
    add('No PII logging', 'PASS', 'No obvious PII logging in API routes');
  }

  return results;
}
