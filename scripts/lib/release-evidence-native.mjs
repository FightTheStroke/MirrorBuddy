import coverageLibrary from 'istanbul-lib-coverage';

const count = (value) => Number.isSafeInteger(value) && value >= 0;
const reject = (message) => {
  throw new Error(message);
};

export function validateUnit(unit) {
  if (
    unit?.success !== true ||
    unit.numFailedTests !== 0 ||
    unit.numFailedTestSuites !== 0 ||
    !count(unit.numPassedTests) ||
    !count(unit.numPendingTests) ||
    !count(unit.numTotalTests) ||
    unit.numPassedTests === 0 ||
    unit.numPassedTests + unit.numPendingTests !== unit.numTotalTests ||
    !Array.isArray(unit.testResults) ||
    unit.testResults.length === 0
  ) {
    reject('Missing, failed, or incomplete native unit report');
  }
  const assertions = [];
  const files = new Set();
  for (const suite of unit.testResults) {
    if (
      typeof suite?.name !== 'string' ||
      files.has(suite.name) ||
      !['passed', 'pending', 'skipped'].includes(suite.status) ||
      !Array.isArray(suite.assertionResults)
    )
      reject('Invalid native unit suite');
    files.add(suite.name);
    assertions.push(...suite.assertionResults);
  }
  if (
    assertions.length !== unit.numTotalTests ||
    assertions.some((test) => !['passed', 'pending', 'skipped', 'todo'].includes(test?.status)) ||
    assertions.filter((test) => test.status === 'passed').length !== unit.numPassedTests
  ) {
    reject('Native unit assertion inventory is partial or unsuccessful');
  }
  return { total: unit.numTotalTests, passed: unit.numPassedTests, skipped: unit.numPendingTests };
}

export function validateCoverage(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).length === 0
  )
    reject('Missing native coverage');
  let map;
  let metrics;
  try {
    map = coverageLibrary.createCoverageMap(input);
    metrics = map.getCoverageSummary().data;
  } catch {
    reject('Invalid native coverage object');
  }
  for (const name of ['statements', 'branches', 'functions', 'lines']) {
    const metric = metrics[name];
    if (
      !count(metric?.total) ||
      metric.total === 0 ||
      !count(metric.covered) ||
      metric.covered > metric.total ||
      (metric.covered * 100) / metric.total < 80
    ) {
      reject(`Native ${name} coverage is missing or below 80%`);
    }
  }
  return { files: map.files().length, metrics };
}

export function validateBrowser(report) {
  const stats = report?.stats;
  if (
    !stats ||
    !['expected', 'unexpected', 'flaky', 'skipped'].every((key) => count(stats[key])) ||
    stats.unexpected !== 0 ||
    stats.expected + stats.flaky === 0 ||
    !Array.isArray(report.errors) ||
    report.errors.length !== 0 ||
    !Array.isArray(report.suites)
  ) {
    reject('Missing or unsuccessful native browser report');
  }
  const tests = [];
  const identities = new Set();
  function visit(suites) {
    for (const suite of suites) {
      if (!suite || typeof suite !== 'object') reject('Invalid browser suite');
      for (const spec of suite.specs ?? []) {
        if (typeof spec?.id !== 'string' || !Array.isArray(spec.tests))
          reject('Invalid browser spec');
        for (const test of spec.tests) {
          const id = `${spec.id}:${test?.projectId}`;
          if (typeof test?.projectId !== 'string' || identities.has(id))
            reject('Duplicate browser test');
          identities.add(id);
          tests.push(test);
        }
      }
      if (suite.suites !== undefined && !Array.isArray(suite.suites))
        reject('Invalid nested suite');
      visit(suite.suites ?? []);
    }
  }
  visit(report.suites);
  for (const status of ['expected', 'flaky', 'skipped']) {
    if (tests.filter((test) => test.status === status).length !== stats[status]) {
      reject('Native browser inventory is partial');
    }
  }
  if (tests.length !== stats.expected + stats.flaky + stats.skipped)
    reject('Unexpected browser outcome');
  for (const test of tests) {
    if (!Array.isArray(test.results)) reject('Missing browser execution results');
    if (
      test.status !== 'skipped' &&
      (!['passed', 'failed'].includes(test.expectedStatus) ||
        test.results.at(-1)?.status !== test.expectedStatus)
    )
      reject('Unsuccessful browser execution');
  }
  return {
    passed: stats.expected,
    flaky: stats.flaky,
    skipped: stats.skipped,
    total: tests.length,
  };
}

export function validateAudit(audit) {
  const vulnerabilities = audit?.metadata?.vulnerabilities;
  if (
    audit?.error ||
    !vulnerabilities ||
    !['info', 'low', 'moderate', 'high', 'critical'].every((key) => count(vulnerabilities[key])) ||
    vulnerabilities.high !== 0 ||
    vulnerabilities.critical !== 0
  ) {
    reject('Missing, failed, or high-severity dependency audit');
  }
  return vulnerabilities;
}

export function validateNativeEvidence(evidence) {
  if (!evidence || typeof evidence !== 'object') reject('Native release evidence is missing');
  return {
    unit: validateUnit(evidence.unit),
    coverage: validateCoverage(evidence.coverage),
    e2e: validateBrowser(evidence.e2e),
    audit: validateAudit(evidence.audit),
  };
}
