import { clientLogger as logger } from '@/lib/logger/client';
import { isVoiceUsageId } from '@/lib/metrics/voice-usage-validation';
import {
  modelFromResponseDone,
  responseIdFromEvent,
  sendVoiceUsage,
  usageFromResponseDone,
  type VoiceUsageReport,
} from './voice-usage-reporter';

type Context = Pick<VoiceUsageReport, 'sessionId' | 'maestroId'> & {
  connectionGeneration: number | null;
};
type Entry = Context & {
  responseId?: string;
  state: 'created' | 'pending' | 'reported' | 'retryable' | 'cancelled';
};
export const MAX_TRACKED_VOICE_RESPONSES = 256;

/** Bounded local coalescing; the server primary key is the durable authority. */
export function createVoiceUsageTracker() {
  const entries = new Map<string, Entry>();
  let active: Entry | null = null;
  let generation: number | null = null;
  const key = (context: Context, id: string) => JSON.stringify([context.connectionGeneration, id]);
  const remember = (entry: Entry, id: string) => {
    if (entries.size >= MAX_TRACKED_VOICE_RESPONSES) {
      const evictable = [...entries].find(
        ([, item]) => item !== active && (item.state === 'reported' || item.state === 'cancelled'),
      );
      const oldest = evictable ?? entries.entries().next().value;
      if (oldest) {
        if (!evictable)
          logger.warn('[VoiceUsage] Client history limit reached before acknowledgement');
        entries.delete(oldest[0]);
      }
    }
    entries.set(key(entry, id), entry);
  };
  return {
    get size() {
      return entries.size;
    },
    accept(event: Record<string, unknown>, context: Context): boolean {
      if (!['response.created', 'response.done', 'response.cancelled'].includes(String(event.type)))
        return true;
      if (context.connectionGeneration !== generation) {
        generation = context.connectionGeneration;
        active = null;
        for (const entry of entries.values()) {
          if (entry.state === 'created') entry.state = 'cancelled';
        }
      }
      const id = responseIdFromEvent(event);
      if (event.type === 'response.created') {
        if (id && entries.has(key(context, id))) return false;
        const entry: Entry = { ...context, responseId: id ?? undefined, state: 'created' };
        if (id) remember(entry, id);
        active = entry;
        return true;
      }
      let entry = id ? entries.get(key(context, id)) : active;
      if (!entry && id && [...entries.values()].some((old) => old.responseId === id)) return false;
      // Older created envelopes omitted the ID; bind only their first terminal ID.
      if (!entry && id && active && !active.responseId) {
        active.responseId = id;
        remember(active, id);
        entry = active;
      }
      if (event.type === 'response.cancelled') {
        if (!id && entry?.responseId) {
          logger.warn('[VoiceUsage] Cancellation identity missing; current response unchanged');
          return false;
        }
        if (!entry) return false;
        const current = entry === active;
        if (entry.state === 'created') entry.state = 'cancelled';
        if (current) active = null;
        return current;
      }
      if (!id || !entry || !isVoiceUsageId(entry.sessionId)) {
        logger.warn('[VoiceUsage] Response identity/context missing; usage not submitted');
        return false;
      }
      if (entry.state === 'reported' || entry.state === 'pending') return false;
      const current = entry === active;
      if (current) active = null;
      entry.state = 'pending';
      const owned = entry;
      void sendVoiceUsage({
        sessionId: owned.sessionId,
        maestroId: owned.maestroId,
        responseId: id,
        model: modelFromResponseDone(event),
        usage: usageFromResponseDone(event),
      }).then((recorded) => {
        owned.state = recorded ? 'reported' : 'retryable';
      });
      return current;
    },
  };
}
