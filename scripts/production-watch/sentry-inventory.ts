import type { ProductionAlert } from './sources';

const categories = new Map([
  ['Store hydration failed; retry when identity is refreshed', 'store-hydration'],
  ['Consent operation failed', 'consent-operation'],
  ['ConsentSyncError: Consent network', 'consent-network'],
  ['[Offline SW] Registration failed', 'service-worker-registration'],
  ['[Azure Chat] Deployment rejects a custom temperature; using its default', 'azure-temperature'],
]);
const errorNames = new Set([
  'Error',
  'TypeError',
  'NetworkError',
  'AbortError',
  'InvalidStateError',
  'SecurityError',
  'NotAllowedError',
  'NotSupportedError',
  'ConsentSyncError',
]);
const errorCodes = new Set([
  'network',
  'http',
  'storage',
  'identity',
  'invalid-response',
  'superseded',
]);
const endpoints = new Map([
  ['/api/auth/me', 'auth'],
  ['/api/user', 'user'],
  ['/api/user/settings', 'settings'],
  ['/api/user/profile', 'profile'],
  ['/api/user/accessibility', 'accessibility'],
  ['/api/progress', 'progress'],
  ['/api/progress/sessions', 'sessions'],
  ['/api/conversations', 'conversations'],
  ['/api/learnings', 'learnings'],
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function eventAttribution(event: Record<string, unknown>): string {
  const version = isRecord(event.release) ? event.release.version : event.release;
  const candidate =
    typeof version === 'string' && version.length <= 96 ? version.replace(/^mirrorbuddy@/, '') : '';
  const parts = candidate.split('+');
  const base = parts[0] ?? '';
  const suffix = parts[1];
  const release =
    parts.length <= 2 &&
    (/^[a-f0-9]{40}$/.test(base) || /^v?\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(base)) &&
    (suffix === undefined || /^[a-f0-9]{7,40}$/.test(suffix))
      ? candidate
      : undefined;
  const codes = new Set<string>();
  const inspectCodes = (value: unknown, depth = 0): void => {
    if (!isRecord(value) || depth > 6) return;
    for (const [key, item] of Object.entries(value)) {
      if (['code', 'errorCode'].includes(key) && typeof item === 'string' && errorCodes.has(item)) {
        codes.add(item);
      }
      inspectCodes(item, depth + 1);
    }
  };
  inspectCodes(event.extra);
  inspectCodes(event.context);
  const requests: string[] = [];
  for (const entry of Array.isArray(event.entries) ? event.entries : []) {
    if (!isRecord(entry) || entry.type !== 'breadcrumbs' || !isRecord(entry.data)) continue;
    for (const breadcrumb of Array.isArray(entry.data.values) ? entry.data.values : []) {
      if (!isRecord(breadcrumb) || !isRecord(breadcrumb.data)) continue;
      const { url, status_code: status } = breadcrumb.data;
      if (typeof url !== 'string' || typeof status !== 'number' || !Number.isInteger(status))
        continue;
      let parsed: URL;
      try {
        parsed = new URL(url, 'https://www.mirrorbuddy.org');
      } catch {
        continue;
      }
      if (
        !['www.mirrorbuddy.org', 'mirrorbuddy.org', 'mirrorbuddy.vercel.app'].includes(
          parsed.hostname,
        ) &&
        !(parsed.hostname.startsWith('mirrorbuddy-') && parsed.hostname.endsWith('.vercel.app'))
      )
        continue;
      const endpoint = endpoints.get(parsed.pathname);
      if (endpoint && status >= 100 && status <= 599) requests.push(`${endpoint}:${status}`);
    }
  }
  return `release=${release ?? 'unknown'} | contextCodes=${[...codes].sort().join(',') || 'unknown'} | requests=${requests.slice(-20).join(',') || 'unknown'}`;
}

/** Only fixed vocabulary and numeric HTTP statuses may reach public workflow logs. */
export async function sentryInventoryEvidence(
  fetchImpl: typeof fetch,
  alert: ProductionAlert,
  token: string,
): Promise<string> {
  const id = new URL(alert.url).pathname.match(/\/issues\/(\d+)\/?$/)?.[1];
  if (!id) throw new Error('Invalid Sentry issue permalink');
  const response = await fetchImpl(`https://sentry.io/api/0/issues/${id}/events/latest/`, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'error',
  });
  if (!response.ok) throw new Error('Sentry inventory event unavailable');
  const event: unknown = await response.json();
  if (!isRecord(event)) throw new Error('Invalid Sentry inventory event');
  const names = new Set<string>();
  const statuses = new Set<number>();
  function inspect(value: unknown, depth = 0): void {
    if (!value || typeof value !== 'object' || depth > 12) return;
    for (const [key, item] of Object.entries(value)) {
      if (
        ['type', 'name', 'errorName'].includes(key) &&
        typeof item === 'string' &&
        errorNames.has(item)
      ) {
        names.add(item);
      }
      if (
        ['status', 'statusCode', 'status_code'].includes(key) &&
        Number.isInteger(item) &&
        typeof item === 'number' &&
        item >= 100 &&
        item <= 599
      )
        statuses.add(item);
      inspect(item, depth + 1);
    }
  }
  inspect(event);
  return `category=${categories.get(alert.title) ?? 'unclassified'} | errorTypes=${[...names].sort().join(',') || 'unknown'} | httpStatuses=${[...statuses].sort().join(',') || 'unknown'} | ${eventAttribution(event)}`;
}
