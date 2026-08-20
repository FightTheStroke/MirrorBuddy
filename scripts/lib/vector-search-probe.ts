/**
 * Probe for the pgvector search function and its index.
 *
 * A migration recorded in `_prisma_migrations` is a statement about what was
 * run, not evidence of what exists. Production carried
 * `20260117183800_pgvector` as applied since 20 Jan 2026 while
 * `search_similar_embeddings` was absent from the database: every call to
 * `searchSimilar` raised 42883, caught it, and degraded to an unordered
 * in-memory scan capped at 1000 rows. Retrieval kept answering, so nothing
 * looked broken (finding G-12).
 *
 * The probe therefore *calls* the function instead of reading `pg_proc`: a
 * catalog lookup would also pass against a stale body with the wrong argument
 * list, which is the failure mode the 20 Aug 2026 signature change introduced.
 */

export type ProbeExecutor = (sql: string, params: unknown[]) => Promise<unknown[]>;

export type FunctionProbeOutcome =
  | { status: 'ok' }
  | { status: 'missing' }
  | { status: 'error'; message: string };

export type IndexProbeOutcome = { status: 'present' } | { status: 'absent' };

const UNDEFINED_FUNCTION = '42883';

/**
 * A zero vector would make cosine distance undefined, so the probe uses a unit
 * vector. The similarity floor is above 1 so the call can never match a row:
 * the probe asserts that the function runs, and must not depend on the data a
 * particular database happens to hold.
 */
const PROBE_VECTOR = `[${['1', ...Array<string>(1535).fill('0')].join(',')}]`;

const PROBE_SQL = `
  SELECT id
  FROM search_similar_embeddings(
    $1::text,
    $2::vector(1536),
    $3::integer,
    $4::float,
    $5::text,
    $6::text,
    $7::text
  )
`;

const HNSW_INDEX_SQL = `
  SELECT indexdef
  FROM pg_indexes
  WHERE tablename = 'ContentEmbedding'
    AND indexdef ILIKE '%USING hnsw%'
`;

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Calls `search_similar_embeddings` with the full seven-argument signature.
 * Passing the seventh argument is the point: a database still holding the old
 * six-argument body answers 42883 here, exactly as a missing function does,
 * and both are equally fatal for callers that now pass a source id.
 */
export async function probeVectorSearchFunction(
  executor: ProbeExecutor,
): Promise<FunctionProbeOutcome> {
  try {
    await executor(PROBE_SQL, [
      '__pre_deploy_probe__',
      PROBE_VECTOR,
      1,
      1.1,
      '__pre_deploy_probe__',
      null,
      '__pre_deploy_probe__',
    ]);
    return { status: 'ok' };
  } catch (error) {
    if (errorCode(error) === UNDEFINED_FUNCTION) {
      return { status: 'missing' };
    }
    return { status: 'error', message: errorMessage(error) };
  }
}

export async function probeHnswIndex(executor: ProbeExecutor): Promise<IndexProbeOutcome> {
  const rows = await executor(HNSW_INDEX_SQL, []);
  return rows.length > 0 ? { status: 'present' } : { status: 'absent' };
}
