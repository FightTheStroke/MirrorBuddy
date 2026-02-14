import { config } from 'dotenv';
import { CheckResult } from './compliance-checks/types';
import { runDocumentContentChecks } from './compliance-checks/document-content';
import { runSafetySystemsChecks } from './compliance-checks/safety-systems';
import { runSecurityPatternsChecks } from './compliance-checks/security-patterns';
import { runGdprPrivacyChecks } from './compliance-checks/gdpr-privacy';
import { runEuAiActChecks } from './compliance-checks/eu-ai-act';
import { runApiRouteAuditChecks } from './compliance-checks/api-route-audit';
import { runEnvironmentSecurityChecks } from './compliance-checks/environment-security';
import { runCharacterPromptsChecks } from './compliance-checks/character-prompts';

// Load .env file
config();

const failOnly = process.argv.includes('--fail-only');
const categoryFlag = process.argv.indexOf('--category');
const categoryFilter = categoryFlag !== -1 ? process.argv[categoryFlag + 1]?.toLowerCase() : null;

interface CheckModule {
  key: string;
  label: string;
  run: () => Promise<CheckResult[]>;
}

const CHECK_MODULES: CheckModule[] = [
  { key: 'documents', label: 'Document Content', run: runDocumentContentChecks },
  { key: 'safety', label: 'Safety Systems', run: runSafetySystemsChecks },
  { key: 'security', label: 'Security Patterns', run: runSecurityPatternsChecks },
  { key: 'gdpr', label: 'GDPR & Privacy', run: runGdprPrivacyChecks },
  { key: 'ai-act', label: 'EU AI Act', run: runEuAiActChecks },
  { key: 'api', label: 'API Route Audit', run: runApiRouteAuditChecks },
  { key: 'env', label: 'Environment Security', run: runEnvironmentSecurityChecks },
  { key: 'characters', label: 'Character Prompts', run: runCharacterPromptsChecks },
];

function printResults(results: CheckResult[]): void {
  console.log('\n=== MirrorBuddy Deep Compliance Check ===\n');

  // Group by category
  const grouped = new Map<string, CheckResult[]>();
  for (const r of results) {
    const cat = r.category || 'General';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(r);
  }

  for (const [category, checks] of grouped) {
    const visible = failOnly ? checks.filter((c) => c.status !== 'PASS') : checks;
    if (visible.length === 0) continue;

    console.log(`--- ${category} ---`);
    for (const r of visible) {
      const icon = r.status === 'PASS' ? '[PASS]' : r.status === 'WARN' ? '[WARN]' : '[FAIL]';
      console.log(`  ${icon} ${r.message}`);
    }
    console.log('');
  }

  const passCount = results.filter((r) => r.status === 'PASS').length;
  const warnCount = results.filter((r) => r.status === 'WARN').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;

  console.log('='.repeat(55));
  console.log(
    `Summary: ${passCount}/${results.length} passed, ${warnCount} warning(s), ${failCount} failure(s)`,
  );
  console.log('='.repeat(55) + '\n');
}

async function runChecks(): Promise<void> {
  if (!failOnly && !categoryFilter) {
    console.log('Starting MirrorBuddy Deep Compliance Check...');
  }

  const modulesToRun = categoryFilter
    ? CHECK_MODULES.filter((m) => m.key === categoryFilter)
    : CHECK_MODULES;

  if (categoryFilter && modulesToRun.length === 0) {
    const keys = CHECK_MODULES.map((m) => m.key).join(', ');
    console.error(`Unknown category: "${categoryFilter}". Available: ${keys}`);
    process.exit(1);
  }

  const allResults: CheckResult[] = [];
  for (const mod of modulesToRun) {
    if (!failOnly && !categoryFilter) {
      console.log(`  Checking ${mod.label}...`);
    }
    const results = await mod.run();
    allResults.push(...results);
  }

  printResults(allResults);

  const failCount = allResults.filter((r) => r.status === 'FAIL').length;
  process.exit(failCount > 0 ? 1 : 0);
}

runChecks().catch((error) => {
  console.error('Error running compliance checks:', error);
  process.exit(1);
});
