import { isSupabaseUrl } from '@mirrorbuddy/utils';

/** Keep shared runtime database safeguards from silently retargeting an operator mutation. */
export function assertAuthScriptTarget(env: NodeJS.ProcessEnv = process.env): void {
  if (!env || typeof env !== 'object') throw new Error('Script environment is required');
  if (env.E2E_TESTS === '1') {
    throw new Error('Credential scripts cannot run with the E2E database override');
  }
  if (
    env.DATABASE_URL &&
    isSupabaseUrl(env.DATABASE_URL) &&
    env.NODE_ENV !== 'production' &&
    env.VERCEL !== '1'
  ) {
    throw new Error('Explicit NODE_ENV=production is required for Supabase credential scripts');
  }
}
