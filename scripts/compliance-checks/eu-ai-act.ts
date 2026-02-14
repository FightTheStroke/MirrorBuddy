import { CheckResult, fileExists, fileSize, fileContains, dirExists } from './types';

const CAT = 'EU AI Act';

export async function runEuAiActChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  function add(name: string, status: CheckResult['status'], message: string): void {
    results.push({ name, status, message, category: CAT });
  }

  // --- AI transparency page ---
  if (!dirExists('src/app/ai-transparency')) {
    add('AI transparency page', 'FAIL', 'Missing: src/app/ai-transparency/');
  } else {
    add('AI transparency page', 'PASS', 'AI transparency page exists');
  }

  // --- Conformity assessment ---
  const confPath = 'docs/compliance/AI-ACT-CONFORMITY-ASSESSMENT.md';
  if (!fileExists(confPath)) {
    add('Conformity assessment', 'FAIL', `Missing: ${confPath}`);
  } else {
    const hasRisk =
      fileContains(confPath, 'Annex') ||
      fileContains(confPath, 'high-risk') ||
      fileContains(confPath, 'high risk');
    if (!hasRisk) {
      add('Conformity risk class', 'WARN', 'Conformity assessment may lack risk classification');
    } else {
      add('Conformity risk class', 'PASS', 'Conformity assessment references risk classification');
    }
  }

  // --- Human oversight (admin safety endpoints) ---
  if (!dirExists('src/app/api/admin/safety')) {
    add('Human oversight', 'FAIL', 'Missing: src/app/api/admin/safety/');
  } else {
    const endpoints = [
      'src/app/api/admin/safety/block-user/route.ts',
      'src/app/api/admin/safety/stop-session/route.ts',
    ];
    const missing = endpoints.filter((e) => !fileExists(e));
    if (missing.length > 0) {
      add('Human oversight endpoints', 'WARN', `Missing oversight actions: ${missing.length}`);
    } else {
      add('Human oversight endpoints', 'PASS', 'Human oversight endpoints present');
    }
  }

  // --- AI literacy document ---
  const litPath = 'docs/compliance/AI-LITERACY.md';
  if (!fileExists(litPath)) {
    add('AI literacy', 'FAIL', `Missing: ${litPath}`);
  } else if (fileSize(litPath) < 500) {
    add('AI literacy', 'WARN', 'AI Literacy document is < 500 bytes (possible stub)');
  } else {
    add('AI literacy', 'PASS', 'AI Literacy document has substantive content');
  }

  // --- Risk register ---
  const riskRegPath = 'docs/compliance/AI-RISK-REGISTER.md';
  const riskApiExists = fileExists('src/app/api/admin/safety/route.ts');
  if (!fileExists(riskRegPath) && !riskApiExists) {
    add('Risk register', 'FAIL', 'No risk register document or admin endpoint found');
  } else {
    add('Risk register', 'PASS', 'Risk register present');
  }

  // --- Post-market monitoring ---
  const pmmPath = 'docs/compliance/POST-MARKET-MONITORING-PLAN.md';
  if (!fileExists(pmmPath)) {
    add('Post-market monitoring', 'FAIL', `Missing: ${pmmPath}`);
  } else if (fileSize(pmmPath) < 500) {
    add('Post-market monitoring', 'WARN', 'Post-market monitoring plan is < 500 bytes');
  } else {
    add('Post-market monitoring', 'PASS', 'Post-market monitoring plan exists');
  }

  // --- Risk classification ---
  const riskClassPath = 'docs/compliance/AI-RISK-CLASSIFICATION.md';
  if (!fileExists(riskClassPath)) {
    add('Risk classification', 'WARN', `Missing: ${riskClassPath}`);
  } else {
    add('Risk classification', 'PASS', 'AI risk classification document exists');
  }

  return results;
}
