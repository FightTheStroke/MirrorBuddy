export const recoveryFailureCodes = [
  'TARGET_NODE_VERSION',
  'TARGET_GITHUB_CONTEXT',
  'TARGET_E2E_TESTS',
  'TARGET_DATABASE_URL',
  'TARGET_DIRECT_URL',
  'TARGET_PRODUCTION_DB_ID',
  'TARGET_PROJECT_MISMATCH',
  'CONFIG_ADMIN_EMAIL',
  'CONFIG_ADMIN_PASSWORD',
  'CONFIG_ADMIN_READONLY_EMAIL',
  'ARGUMENTS_REJECTED',
  'OWNER_REJECTED',
  'ACCOUNT_REJECTED',
  'ACCOUNT_CHANGED',
  'DB_IMPORT_FAILED',
  'DB_OPERATION_FAILED',
  'DISCONNECT_FAILED',
  'FAILED',
] as const;

type RecoveryFailure = (typeof recoveryFailureCodes)[number];
const failures = new WeakMap<object, RecoveryFailure>();

export class RecoveryError extends Error {
  constructor(code: RecoveryFailure) {
    const safe = recoveryFailureCodes.includes(code) ? code : 'FAILED';
    super(safe);
    failures.set(this, safe);
  }
}

/** Do not inspect thrown objects: even getters, proxies and error messages are untrusted. */
export function recoveryFailure(
  error: unknown,
  fallback: RecoveryFailure = 'FAILED',
): RecoveryFailure {
  const known = typeof error === 'object' && error !== null ? failures.get(error) : undefined;
  return known ?? (recoveryFailureCodes.includes(fallback) ? fallback : 'FAILED');
}
