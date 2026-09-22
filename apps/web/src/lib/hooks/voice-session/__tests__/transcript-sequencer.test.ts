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
    seq.accept(created(), 'session');
    expect(seq.accept(text(0, 1), 'session')).toEqual([]);
    expect(
      seq.accept({ ...complete(), item: { id: 'item-0', type: 'function_call' } }, 'session'),
    ).toEqual([text(0, 1)]);
  });
  it('flushes received content in order at terminal cancellation despite content gaps', () => {
    const seq = createTranscriptSequencer();
    seq.accept(created(), 'session');
    seq.accept(text(2, 1), 'session');
    seq.accept(text(1, 1), 'session');
    expect(
      seq.accept(
        { type: 'response.done', response: { id: 'response-1', status: 'cancelled' } },
        'session',
      ),
    ).toEqual([text(1, 1), text(2, 1)]);
    expect(seq.accept(text(), 'session')).toEqual([]);
  });
  it.each([null, undefined, -1, 256, 1.5, '0'])(
    'rejects malformed part index %s without poisoning retries',
    (part) => {
      const warn = vi.spyOn(clientLogger, 'warn');
      const seq = createTranscriptSequencer();
      seq.accept(created(), 'session');
      expect(seq.accept({ ...text(), content_index: part }, 'session')).toEqual([]);
      expect(warn).toHaveBeenCalledWith('[VoiceSession] Invalid transcript item identity');
      expect(seq.accept(text(), 'session')).toEqual([text()]);
    },
  );
  it('does not let conflicting item IDs replace buffered content', () => {
    const seq = createTranscriptSequencer();
    seq.accept(created(), 'session');
    seq.accept(text(1), 'session');
    expect(seq.accept({ ...text(), item_id: 'another-item' }, 'session')).toEqual([]);
    expect(seq.accept(text(), 'session')).toEqual([text(), text(1)]);
  });
  it('retains the historical ID-less callback without inventing correlation fields', () => {
    const seq = createTranscriptSequencer();
    const legacy = { type: 'response.audio_transcript.done', transcript: 'An older envelope.' };
    expect(seq.accept(legacy, 'session')).toEqual([legacy]);
  });
  it('bounds response history and cannot rebind evicted events to a current response', () => {
    const warn = vi.spyOn(clientLogger, 'warn');
    const seq = createTranscriptSequencer();
    for (let n = 0; n <= MAX_TRANSCRIPT_RESPONSES; n++) {
      seq.accept(created(`response-${n}`), 'session');
      seq.accept({ type: 'response.done', response: { id: `response-${n}` } }, 'session');
    }
    expect(seq.accept(text(0, 0, 'response-0'), 'session')).toEqual([]);
    expect(warn).toHaveBeenCalledWith('[VoiceSession] Transcript response history limit reached');
    expect(warn).toHaveBeenCalledWith('[VoiceSession] Transcript response context missing');
  });
  it('bounds pending parts but allows the missing leading part to drain a saturated queue', () => {
    const warn = vi.spyOn(clientLogger, 'warn');
    const seq = createTranscriptSequencer();
    seq.accept(created(), 'session');
    for (let n = 1; n <= 255; n++) seq.accept(text(n), 'session');
    seq.accept(text(0, 1), 'session');
    expect(seq.accept(text(1, 1), 'session')).toEqual([]);
    expect(warn).toHaveBeenCalledWith('[VoiceSession] Pending transcript limit reached');
    expect(seq.accept(text(), 'session')).toHaveLength(256);
    expect(seq.accept(complete(), 'session')).toEqual([text(0, 1)]);
    expect(seq.accept(text(1, 1), 'session')).toEqual([text(1, 1)]);
  });
  it('handles null event envelopes without crashing', () => {
    const seq = createTranscriptSequencer();
    expect(seq.accept(null, 'session')).toEqual([]);
    expect(seq.accept(undefined, 'session')).toEqual([]);
  });
});
