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
  if (!event || typeof event !== 'object') throw new Error('Invalid Sentry inventory event');
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
  return `category=${categories.get(alert.title) ?? 'unclassified'} | errorTypes=${[...names].sort().join(',') || 'unknown'} | httpStatuses=${[...statuses].sort().join(',') || 'unknown'}`;
}
