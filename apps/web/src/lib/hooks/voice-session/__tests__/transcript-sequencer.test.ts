import { afterEach, describe, expect, it, vi } from 'vitest';
import { clientLogger } from '@/lib/logger/client';
import { createTranscriptSequencer, MAX_TRANSCRIPT_RESPONSES } from '../transcript-sequencer';
const created = (id = 'response-1') => ({ type: 'response.created', response: { id } });
const text = (part = 0, output = 0, response = 'response-1') => ({
  type: 'response.output_audio_transcript.done',
  response_id: response,
  item_id: `item-${output}`,
  output_index: output,
  content_index: part,
  transcript: `Output ${output} part ${part}`,
});
const complete = (output = 0) => ({
  type: 'response.output_item.done',
  response_id: 'response-1',
  output_index: output,
  item: { id: `item-${output}`, type: 'message' },
});
afterEach(() => vi.restoreAllMocks());
describe('bounded provider-item sequencing', () => {
  it('skips a completed non-caption tool item without blocking subsequent subtitles', () => {
    const seq = createTranscriptSequencer();
    seq.accept(created(), 1);
    expect(seq.accept(text(0, 1), 1)).toEqual([]);
    expect(seq.accept({ ...complete(), item: { id: 'item-0', type: 'function_call' } }, 1)).toEqual(
      [text(0, 1)],
    );
  });
  it('flushes received content in order at terminal cancellation despite content gaps', () => {
    const seq = createTranscriptSequencer();
    seq.accept(created(), 1);
    seq.accept(text(2, 1), 1);
    seq.accept(text(1, 1), 1);
    expect(
      seq.accept({ type: 'response.done', response: { id: 'response-1', status: 'cancelled' } }, 1),
    ).toEqual([text(1, 1), text(2, 1)]);
    expect(seq.accept(text(), 1)).toEqual([]);
  });
  it.each([null, undefined, -1, 256, 1.5, '0'])(
    'rejects malformed part index %s without poisoning retries',
    (part) => {
      const warn = vi.spyOn(clientLogger, 'warn');
      const seq = createTranscriptSequencer();
      seq.accept(created(), 1);
      expect(seq.accept({ ...text(), content_index: part }, 1)).toEqual([]);
      expect(warn).toHaveBeenCalledWith('[VoiceSession] Invalid transcript item identity');
      expect(seq.accept(text(), 1)).toEqual([text()]);
    },
  );
  it('does not let conflicting item IDs replace buffered content', () => {
    const seq = createTranscriptSequencer();
    seq.accept(created(), 1);
    seq.accept(text(1), 1);
    expect(seq.accept({ ...text(), item_id: 'another-item' }, 1)).toEqual([]);
    expect(seq.accept(text(), 1)).toEqual([text(), text(1)]);
  });
  it('retains the historical ID-less callback without inventing correlation fields', () => {
    const seq = createTranscriptSequencer();
    const legacy = { type: 'response.audio_transcript.done', transcript: 'An older envelope.' };
    expect(seq.accept(legacy, 1)).toEqual([legacy]);
  });
  it('bounds response history and cannot rebind evicted events to a current response', () => {
    const warn = vi.spyOn(clientLogger, 'warn');
    const seq = createTranscriptSequencer();
    for (let n = 0; n <= MAX_TRANSCRIPT_RESPONSES; n++) {
      seq.accept(created(`response-${n}`), 1);
      seq.accept({ type: 'response.done', response: { id: `response-${n}` } }, 1);
    }
    expect(seq.accept(text(0, 0, 'response-0'), 1)).toEqual([]);
    expect(warn).toHaveBeenCalledWith('[VoiceSession] Transcript response history limit reached');
    expect(warn).toHaveBeenCalledWith('[VoiceSession] Transcript response context missing');
  });
  it('bounds pending parts but allows the missing leading part to drain a saturated queue', () => {
    const warn = vi.spyOn(clientLogger, 'warn');
    const seq = createTranscriptSequencer();
    seq.accept(created(), 1);
    for (let n = 1; n <= 255; n++) seq.accept(text(n), 1);
    seq.accept(text(0, 1), 1);
    expect(seq.accept(text(1, 1), 1)).toEqual([]);
    expect(warn).toHaveBeenCalledWith('[VoiceSession] Pending transcript limit reached');
    expect(seq.accept(text(), 1)).toHaveLength(256);
    expect(seq.accept(complete(), 1)).toEqual([text(0, 1)]);
    expect(seq.accept(text(1, 1), 1)).toEqual([text(1, 1)]);
  });
  it('handles null event envelopes without crashing', () => {
    const seq = createTranscriptSequencer();
    expect(seq.accept(null, 1)).toEqual([]);
    expect(seq.accept(undefined, 1)).toEqual([]);
  });
});
