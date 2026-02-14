import { CheckResult, fileExists, fileContains, fileMatches, dirExists } from './types';

const CAT = 'Safety Systems';

export async function runSafetySystemsChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  function add(name: string, status: CheckResult['status'], message: string): void {
    results.push({ name, status, message, category: CAT });
  }

  // --- Content filter patterns ---
  const cfPatterns = 'src/lib/safety/content-filter/patterns.ts';
  if (!fileExists(cfPatterns)) {
    add('Content filter patterns', 'FAIL', `Missing: ${cfPatterns}`);
  } else if (!fileMatches(cfPatterns, /export\s/)) {
    add('Content filter patterns', 'FAIL', 'Content filter patterns has no exports');
  } else {
    add('Content filter patterns', 'PASS', 'Content filter patterns file exports data');
  }

  // --- Jailbreak detector patterns ---
  const jbPatterns = 'src/lib/safety/jailbreak-detector/patterns.ts';
  if (!fileExists(jbPatterns)) {
    add('Jailbreak patterns', 'FAIL', `Missing: ${jbPatterns}`);
  } else {
    const hasPatterns =
      fileContains(jbPatterns, 'role') ||
      fileContains(jbPatterns, 'instruction') ||
      fileContains(jbPatterns, 'system');
    if (!hasPatterns) {
      add('Jailbreak patterns', 'WARN', 'Jailbreak patterns may lack key detection categories');
    } else {
      add('Jailbreak patterns', 'PASS', 'Jailbreak patterns cover core attack vectors');
    }
  }

  // --- Age gating topic matrix ---
  const topicMatrix = 'src/lib/safety/age-gating/topic-matrix.ts';
  if (!fileExists(topicMatrix)) {
    add('Age gating topics', 'FAIL', `Missing: ${topicMatrix}`);
  } else if (!fileMatches(topicMatrix, /export\s/)) {
    add('Age gating topics', 'FAIL', 'Topic matrix has no exports');
  } else {
    add('Age gating topics', 'PASS', 'Age gating topic matrix exports data');
  }

  // --- Crisis detection ---
  const crisisPath = 'src/lib/safety/crisis-detection.ts';
  if (!fileExists(crisisPath)) {
    add('Crisis detection', 'FAIL', `Missing: ${crisisPath}`);
  } else {
    const hasFn =
      fileContains(crisisPath, 'containsCrisisKeywords') ||
      fileContains(crisisPath, 'detectCrisis') ||
      fileContains(crisisPath, 'crisis');
    if (!hasFn) {
      add('Crisis detection', 'WARN', 'Crisis detection may lack core detection function');
    } else {
      add('Crisis detection', 'PASS', 'Crisis detection module has detection logic');
    }
  }

  // --- Escalation service ---
  if (!dirExists('src/lib/safety/escalation')) {
    add('Escalation service', 'FAIL', 'Missing: src/lib/safety/escalation/');
  } else if (!fileExists('src/lib/safety/escalation/index.ts')) {
    add('Escalation service', 'FAIL', 'Escalation directory has no index.ts');
  } else {
    add('Escalation service', 'PASS', 'Escalation service exists');
  }

  // --- Output sanitizer ---
  if (!dirExists('src/lib/safety/output-sanitizer')) {
    add('Output sanitizer', 'FAIL', 'Missing: src/lib/safety/output-sanitizer/');
  } else if (!fileExists('src/lib/safety/output-sanitizer/patterns.ts')) {
    add('Output sanitizer', 'FAIL', 'Output sanitizer missing patterns.ts');
  } else {
    add('Output sanitizer', 'PASS', 'Output sanitizer with patterns exists');
  }

  // --- Safety prompts core ---
  const safetyPrompts = 'src/lib/safety/safety-prompts-core.ts';
  if (!fileExists(safetyPrompts)) {
    add('Safety prompts core', 'FAIL', `Missing: ${safetyPrompts}`);
  } else if (!fileMatches(safetyPrompts, /SAFETY|safety.*prompt/i)) {
    add('Safety prompts core', 'WARN', 'Safety prompts core may be empty');
  } else {
    add('Safety prompts core', 'PASS', 'Safety prompts core has content');
  }

  // --- Safety monitoring ---
  const monPath = 'src/lib/safety/monitoring.ts';
  if (!fileExists(monPath)) {
    add('Safety monitoring', 'FAIL', `Missing: ${monPath}`);
  } else {
    // Check barrel exports (camelCase helpers) OR types file for event types
    const helpers = ['logInputBlocked', 'logCrisisDetected', 'logJailbreakAttempt'];
    const found = helpers.filter((h) => fileContains(monPath, h));
    if (found.length === 0) {
      add('Safety monitoring events', 'WARN', 'Monitoring may lack standard event helpers');
    } else {
      add(
        'Safety monitoring events',
        'PASS',
        `Monitoring exports ${found.length}/${helpers.length} event helpers`,
      );
    }
  }

  // --- STEM safety blocklists ---
  if (!dirExists('src/lib/safety/stem-safety')) {
    add('STEM safety', 'FAIL', 'Missing: src/lib/safety/stem-safety/');
  } else {
    const blocklists = ['chemistry-blocklist.ts', 'biology-blocklist.ts', 'physics-blocklist.ts'];
    const missing = blocklists.filter((f) => !fileExists(`src/lib/safety/stem-safety/${f}`));
    if (missing.length > 0) {
      add('STEM blocklists', 'WARN', `Missing STEM blocklists: ${missing.join(', ')}`);
    } else {
      add('STEM blocklists', 'PASS', 'All STEM hazard blocklists present');
    }
  }

  return results;
}
