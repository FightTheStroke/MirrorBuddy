import { CheckResult, fileExists, fileSize, fileContains } from './types';

const CAT = 'Document Content';

export async function runDocumentContentChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  function add(name: string, status: CheckResult['status'], message: string): void {
    results.push({ name, status, message, category: CAT });
  }

  // --- DPIA ---
  const dpiaPath = 'docs/compliance/DPIA.md';
  if (!fileExists(dpiaPath)) {
    add('DPIA', 'FAIL', `Missing: ${dpiaPath}`);
  } else {
    const requiredSections = ['Legal Basis', 'Risk Assessment', 'Data Processing'];
    const missing = requiredSections.filter((s) => !fileContains(dpiaPath, s));
    if (missing.length > 0) {
      add('DPIA sections', 'FAIL', `DPIA missing sections: ${missing.join(', ')}`);
    } else {
      add('DPIA sections', 'PASS', 'DPIA contains all required sections');
    }
  }

  // --- AI Policy ---
  const aiPolicyPath = 'docs/compliance/AI-POLICY.md';
  if (!fileExists(aiPolicyPath)) {
    add('AI Policy', 'FAIL', `Missing: ${aiPolicyPath}`);
  } else {
    const refs = ['2024/1689', 'GDPR', '132/2025'];
    const missing = refs.filter((r) => !fileContains(aiPolicyPath, r));
    if (missing.length > 0) {
      add('AI Policy refs', 'FAIL', `AI Policy missing references: ${missing.join(', ')}`);
    } else {
      add('AI Policy refs', 'PASS', 'AI Policy references all required regulations');
    }
  }

  // --- Model Card ---
  const modelCardPath = 'docs/compliance/MODEL-CARD.md';
  if (!fileExists(modelCardPath)) {
    add('Model Card', 'FAIL', `Missing: ${modelCardPath}`);
  } else {
    const sections = ['Model Details', 'Intended Use', 'Limitation'];
    const missing = sections.filter((s) => !fileContains(modelCardPath, s));
    if (missing.length > 0) {
      add('Model Card sections', 'FAIL', `Model Card missing: ${missing.join(', ')}`);
    } else {
      add('Model Card sections', 'PASS', 'Model Card contains all required sections');
    }
  }

  // --- Bias Audit Report ---
  const biasPath = 'docs/compliance/BIAS-AUDIT-REPORT.md';
  if (!fileExists(biasPath)) {
    add('Bias Audit', 'FAIL', `Missing: ${biasPath}`);
  } else if (fileSize(biasPath) < 500) {
    add('Bias Audit', 'WARN', 'Bias Audit Report appears to be a stub (< 500 bytes)');
  } else {
    add('Bias Audit', 'PASS', 'Bias Audit Report has substantive content');
  }

  // --- AI Risk Management ---
  const riskMgmtPath = 'docs/compliance/AI-RISK-MANAGEMENT.md';
  if (!fileExists(riskMgmtPath)) {
    add('Risk Management', 'FAIL', `Missing: ${riskMgmtPath}`);
  } else {
    const hasMatrix = fileContains(riskMgmtPath, 'risk') && fileContains(riskMgmtPath, '|');
    if (!hasMatrix) {
      add('Risk Management matrix', 'WARN', 'AI Risk Management may lack a risk matrix');
    } else {
      add('Risk Management matrix', 'PASS', 'AI Risk Management contains risk matrix');
    }
  }

  // --- Minimum size check for all compliance docs ---
  const criticalDocs = [
    'docs/compliance/DPIA.md',
    'docs/compliance/AI-POLICY.md',
    'docs/compliance/MODEL-CARD.md',
    'docs/compliance/AI-RISK-MANAGEMENT.md',
    'docs/compliance/POST-MARKET-MONITORING-PLAN.md',
  ];
  for (const doc of criticalDocs) {
    if (fileExists(doc) && fileSize(doc) < 500) {
      const name = doc.split('/').pop()!;
      add(`${name} size`, 'WARN', `${name} is < 500 bytes (possible stub)`);
    }
  }

  return results;
}
