import { clientLogger as logger } from '@/lib/logger/client';
import { isVoiceUsageId } from '@/lib/metrics/voice-usage-validation';

type Event = Record<string, unknown>;
type Item = { id: string; parts: Map<number, Event>; nextPart: number; complete: boolean };
type Response = { items: Map<number, Item>; nextItem: number; pending: number; closed: boolean };
export const MAX_TRANSCRIPT_RESPONSES = 64;
const MAX_INDEX = 255;
export const isAssistantTranscript = (event: Event) =>
  event.type === 'response.output_audio_transcript.done' ||
  event.type === 'response.audio_transcript.done';
const index = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_INDEX;
const record = (value: unknown): Event | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Event) : null;

// Output-item identity preserves commentary/final separation without inventing a channel.
export function createTranscriptSequencer() {
  const responses = new Map<string, Response>();
  let generation: number | null = null;
  function drain(response: Response, terminal = false): Event[] {
    const ready: Event[] = [];
    if (terminal) {
      for (const [, item] of [...response.items].sort(([a], [b]) => a - b))
        for (const [, part] of [...item.parts].sort(([a], [b]) => a - b)) ready.push(part);
      response.items.clear();
      response.pending = 0;
      response.closed = true;
      return ready;
    }
    let item = response.items.get(response.nextItem);
    while (item) {
      while (item.parts.has(item.nextPart)) {
        ready.push(item.parts.get(item.nextPart)!);
        item.parts.delete(item.nextPart++);
        response.pending--;
      }
      if (!item.complete) break;
      // Non-audio content can occupy preceding content indices.
      for (const [, part] of [...item.parts].sort(([a], [b]) => a - b)) ready.push(part);
      response.pending -= item.parts.size;
      response.items.delete(response.nextItem++);
      item = response.items.get(response.nextItem);
    }
    return ready;
  }
  return {
    accept(event: Event | null | undefined, connectionGeneration: number | null): Event[] {
      if (!event) {
        logger.warn('[VoiceSession] Missing transcript event');
        return [];
      }
      if (generation !== connectionGeneration) {
        responses.clear();
        generation = connectionGeneration;
      }
      const envelope = record(event.response);
      if (event.type === 'response.created') {
        const id = envelope?.id;
        if (isVoiceUsageId(id) && !responses.has(id)) {
          if (responses.size >= MAX_TRANSCRIPT_RESPONSES) {
            responses.delete(responses.keys().next().value!);
            logger.warn('[VoiceSession] Transcript response history limit reached');
          }
          responses.set(id, { items: new Map(), nextItem: 0, pending: 0, closed: false });
        }
        return [];
      }
      const transcript = isAssistantTranscript(event);
      if (transcript && (typeof event.transcript !== 'string' || !event.transcript)) return [event];
      if (event.type === 'conversation.item.input_audio_transcription.completed') return [event];
      const terminal = event.type === 'response.done' || event.type === 'response.cancelled';
      const output =
        event.type === 'response.output_item.added' || event.type === 'response.output_item.done';
      if (!transcript && !terminal && !output) return [];
      // Preserve older ID-less transcript callbacks without fabricating an identity.
      if (
        transcript &&
        event.response_id === undefined &&
        event.item_id === undefined &&
        event.output_index === undefined &&
        event.content_index === undefined
      )
        return [event];
      const id = terminal ? (envelope?.id ?? event.response_id) : event.response_id;
      if (!isVoiceUsageId(id) || !responses.has(id)) {
        if (transcript) logger.warn('[VoiceSession] Transcript response context missing');
        return [];
      }
      const response = responses.get(id)!;
      if (response.closed) return [];
      if (terminal) return drain(response, true);
      const outputIndex = event.output_index;
      const itemId = output ? record(event.item)?.id : event.item_id;
      if (
        !index(outputIndex) ||
        !isVoiceUsageId(itemId) ||
        (transcript && !index(event.content_index))
      ) {
        logger.warn('[VoiceSession] Invalid transcript item identity');
        return [];
      }
      if (outputIndex < response.nextItem) return [];
      let item = response.items.get(outputIndex);
      if (item && item.id !== itemId) {
        logger.warn('[VoiceSession] Conflicting transcript item identity');
        return [];
      }
      if (!item) {
        item = { id: itemId, parts: new Map(), nextPart: 0, complete: false };
        response.items.set(outputIndex, item);
      }
      if (
        transcript &&
        index(event.content_index) &&
        event.content_index >= item.nextPart &&
        !item.parts.has(event.content_index)
      ) {
        const canDrain = outputIndex === response.nextItem && event.content_index === item.nextPart;
        if (response.pending >= MAX_INDEX + 1 && !canDrain) {
          logger.warn('[VoiceSession] Pending transcript limit reached');
          return [];
        }
        item.parts.set(event.content_index, event);
        response.pending++;
      }
      if (event.type === 'response.output_item.done') item.complete = true;
      return drain(response);
    },
  };
}
