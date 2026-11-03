import type { ProductionAlert } from './sources';

const categories = new Map([
  ['Store hydration failed; retry when identity is refreshed', 'store-hydration'],
  ['Consent operation failed', 'consent-operation'],
  ['ConsentSyncError: Consent network', 'consent-network'],
  ['[Offline SW] Registration failed', 'service-worker-registration'],
  ['[Azure Chat] Deployment rejects a custom temperature; using its default', 'azure-temperature'],
  ['Failed to load conversation summaries', 'conversation-summaries'],
  ['Tool orchestrator missing session context', 'tool-session-context'],
  ['N+1 Query', 'repeated-query'],
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
  const toolFlags = new Map([
    ['hasUserId', new Set<boolean>()],
    ['hasSessionId', new Set<boolean>()],
  ]);
  const vectorSpans = new Set<string>();
  const sqlTexts = new Set<string>();
  const parameterSets = new Set<string>();
  let vectorDurationMs = 0;

  function inspectSpan(span: Record<string, unknown>): void {
    if (
      typeof span.description !== 'string' ||
      !span.description.includes('search_similar_embeddings') ||
      typeof span.span_id !== 'string' ||
      vectorSpans.has(span.span_id)
    )
      return;
    vectorSpans.add(span.span_id);
    sqlTexts.add(span.description);
    if (
      typeof span.start_timestamp === 'number' &&
      typeof span.timestamp === 'number' &&
      Number.isFinite(span.start_timestamp) &&
      Number.isFinite(span.timestamp) &&
      span.timestamp >= span.start_timestamp
    )
      vectorDurationMs += (span.timestamp - span.start_timestamp) * 1000;
    if (span.data && typeof span.data === 'object') {
      for (const [key, parameters] of Object.entries(span.data)) {
        if (
          ['db.params', 'db.parameters', 'params', 'parameters'].includes(key) &&
          parameters != null
        ) {
          parameterSets.add(JSON.stringify(parameters));
          break;
        }
      }
    }
  }

  function inspect(value: unknown, depth = 0): void {
    if (!value || typeof value !== 'object' || depth > 12) return;
    if (!Array.isArray(value)) inspectSpan(value as Record<string, unknown>);
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'boolean') toolFlags.get(key)?.add(item);
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
  const flag = (key: string) => {
    const values = toolFlags.get(key);
    return values?.size === 1 ? String([...values][0]) : 'unknown';
  };
  return `category=${categories.get(alert.title) ?? 'unclassified'} | errorTypes=${[...names].sort().join(',') || 'unknown'} | httpStatuses=${[...statuses].sort().join(',') || 'unknown'} | toolContext=user:${flag('hasUserId')},session:${flag('hasSessionId')} | vectorSpans=${vectorSpans.size} | uniqueSqlText=${sqlTexts.size} | distinctParameterSets=${parameterSets.size || 'unknown'} | vectorDurationMs=${Math.round(vectorDurationMs)}`;
}
