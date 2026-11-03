import { z } from 'zod';
import { fetchSentryAlerts } from './sources';

const credentials = z.object({
  org: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  project: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  token: z.string().trim().min(1),
});
const RECENT_WINDOW_MS = 20 * 60 * 1000;

export async function checkRecentSentry(
  fetchImpl: typeof fetch,
  input: unknown,
  now = Date.now(),
): Promise<{ recent: number; lines: string[] }> {
  const parsed = credentials.safeParse(input);
  if (!parsed.success) throw new Error('Sentry monitoring credentials missing or invalid');
  const alerts = await fetchSentryAlerts(fetchImpl, { ...parsed.data, allUnresolved: true }, now);
  const lines: string[] = [];
  for (const alert of alerts) {
    if (!/^sentry:[A-Z0-9_-]+$/.test(alert.key)) {
      throw new Error('Invalid Sentry issue identifier');
    }
    if (Date.parse(alert.lastSeen) < now - RECENT_WINDOW_MS) continue;
    lines.push(
      `${alert.key} | lifetime occurrences=${alert.occurrences} | lastSeen=${alert.lastSeen}`,
    );
  }
  return { recent: lines.length, lines };
}
