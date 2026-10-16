import { readFileSync } from 'node:fs';

export const approvedException = JSON.parse(
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- Fixed approval URL, never report-supplied input.
  readFileSync(new URL('../security/braces-exception.json', import.meta.url), 'utf8'),
);
const fail = (message) => {
  throw new Error(`Dependency audit rejected: ${message}`);
};
const count = (value) => Number.isSafeInteger(value) && value >= 0;
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
const productionFlag = (value) =>
  value?.prod === true ||
  value?.production === true ||
  value?.isProduction === true ||
  value?.dev === false ||
  value?.isDev === false;

function inventory(audit) {
  const counts = audit?.metadata?.vulnerabilities;
  if (
    audit?.error ||
    (audit?.muted !== undefined && (!Array.isArray(audit.muted) || audit.muted.length !== 0)) ||
    !object(counts) ||
    !object(audit?.advisories) ||
    !['info', 'low', 'moderate', 'high', 'critical'].every((key) => count(counts[key]))
  )
    fail('missing or invalid native metadata/advisories');
  const advisories = Object.values(audit.advisories);
  if (
    advisories.some(
      (item) =>
        !object(item) || !['info', 'low', 'moderate', 'high', 'critical'].includes(item.severity),
    )
  )
    fail('invalid advisory');
  for (const severity of ['high', 'critical']) {
    if (advisories.filter((item) => item.severity === severity).length !== counts[severity])
      fail('native severe advisory inventory does not match raw counts');
  }
  return counts;
}

function validateDevelopment(why, approval) {
  if (
    !Array.isArray(why) ||
    why.length !== 1 ||
    why[0]?.name !== approval.package ||
    why[0]?.version !== approval.version
  )
    fail('missing exact native dependency graph');
  const paths = [];
  function visit(node, chain) {
    if (!object(node) || typeof node.name !== 'string' || productionFlag(node))
      fail('invalid or production dependency');
    if (node.depField !== undefined) {
      if (node.depField !== 'devDependencies' || node.name !== 'mirrorbuddy')
        fail('dependency is not development-only');
      paths.push(`.>${[...chain].reverse().join('>')}`);
      return;
    }
    if (!Array.isArray(node.dependents) || node.dependents.length === 0)
      fail('incomplete native dependency chain');
    for (const parent of node.dependents) visit(parent, [...chain, node.name]);
  }
  visit(why[0], []);
  if (JSON.stringify(paths.sort()) !== JSON.stringify([...approval.paths].sort()))
    fail('dependency graph differs from the two approved development chains');
}

export function evaluateAudit(audit, context, now = Date.now()) {
  const counts = inventory(audit);
  if (counts.critical !== 0) fail('critical vulnerability');
  if (counts.high === 0) {
    if (context?.rawExitCode !== 0) fail('unsuccessful raw audit execution');
    return { ...counts, acceptedHigh: 0 };
  }
  const approval = context?.approval;
  if (!object(approval) || JSON.stringify(approval) !== JSON.stringify(approvedException))
    fail('missing or changed explicit approval');
  const expiry = Date.parse(approval.expiresAt);
  const start = Date.parse(`${approval.approvedOn}T00:00:00+02:00`);
  if (
    !Number.isFinite(now) ||
    !Number.isFinite(start) ||
    !Number.isFinite(expiry) ||
    now < start ||
    now >= expiry ||
    expiry > Date.parse('2026-10-24T00:00:00+02:00')
  )
    fail('approval expired, future-dated or unparseable');
  if (
    counts.high !== 1 ||
    context.rawExitCode !== 1 ||
    context.productionExitCode !== 0 ||
    context.whyExitCode !== 0
  )
    fail('unapproved severity or native exit code');
  const production = inventory(context.production);
  if (production.high !== 0 || production.critical !== 0) fail('production vulnerability');
  const entries = Object.entries(audit.advisories).filter(([, item]) => item.severity === 'high');
  const [key, advisory] = entries[0] ?? [];
  if (
    key !== String(approval.nativeAdvisoryId) ||
    advisory?.id !== approval.nativeAdvisoryId ||
    advisory.github_advisory_id !== approval.advisoryId ||
    advisory.module_name !== approval.package ||
    advisory.severity !== approval.severity ||
    productionFlag(advisory) ||
    !Array.isArray(advisory.findings) ||
    advisory.findings.length !== 1
  )
    fail('advisory is not the exact approved finding');
  const finding = advisory.findings[0];
  if (
    finding?.version !== approval.version ||
    productionFlag(finding) ||
    !Array.isArray(finding.paths) ||
    finding.paths.length === 0 ||
    new Set(finding.paths).size !== finding.paths.length ||
    finding.paths.some((path) => !approval.paths.includes(path))
  )
    fail('unapproved package version, path or production flag');
  validateDevelopment(context.why, approval);
  const runtime = context.runtime;
  if (
    !object(runtime) ||
    !/^[a-f0-9]{64}$/.test(runtime.build ?? '') ||
    !/^[a-f0-9]{64}$/.test(runtime.traceHash ?? '') ||
    !count(runtime.traces) ||
    runtime.traces === 0 ||
    !count(runtime.files) ||
    runtime.files === 0
  )
    fail('missing or unreadable runtime absence evidence');
  return {
    ...counts,
    acceptedHigh: 1,
    expiresAt: approval.expiresAt,
    advisoryId: approval.advisoryId,
  };
}

export function auditMessage(result) {
  return result.acceptedHigh
    ? `audit PASSED WITH APPROVED EXCEPTION (1 high accepted, 0 critical); ${result.advisoryId}; expiresAt ${result.expiresAt}; raw high ${result.high}`
    : `audit PASSED (0 high, 0 critical); exception not needed`;
}
