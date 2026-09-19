import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  RealtimeConversationItemAssistantMessage,
  ResponseAudioTranscriptDeltaEvent,
  ResponseAudioTranscriptDoneEvent,
  ResponseOutputItemAddedEvent,
  ResponseOutputItemDoneEvent,
} from 'openai/resources/realtime/realtime';
import { useHandleServerEvent } from '../event-handlers';
import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';
import { created, done, makeDeps } from './usage-event-fixture';
vi.mock('@/lib/auth', () => ({ csrfFetch: vi.fn() }));
import { csrfFetch } from '@/lib/auth';

// Microsoft Learn realtime-2: phase belongs to each output item, not a channel.
type PhasedItem = RealtimeConversationItemAssistantMessage & {
  phase: 'commentary' | 'final_answer';
};
const item = (index: number): PhasedItem => ({
  id: `item-${index}`,
  type: 'message',
  role: 'assistant',
  content: [],
  phase: index === 0 ? 'commentary' : 'final_answer',
});
function output(index: number, complete = false, response = 'resp-output', texts: string[] = []) {
  return {
    type: complete ? 'response.output_item.done' : 'response.output_item.added',
    event_id: `event-item-${index}-${complete}`,
    response_id: response,
    output_index: index,
    item: {
      ...item(index),
      status: complete ? 'completed' : 'in_progress',
      content: texts.map((transcript) => ({ type: 'output_audio' as const, transcript })),
    },
  } satisfies ResponseOutputItemAddedEvent | ResponseOutputItemDoneEvent;
}
function transcript(index: number, text: string, content = 0, response = 'resp-output') {
  return {
    type: 'response.output_audio_transcript.done',
    event_id: `event-${index}-${content}`,
    response_id: response,
    item_id: `item-${index}`,
    output_index: index,
    content_index: content,
    transcript: text,
  } satisfies ResponseAudioTranscriptDoneEvent;
}
beforeEach(() => {
  vi.resetAllMocks();
  useVoiceSessionStore.getState().clearTranscript();
  vi.mocked(csrfFetch).mockImplementation(async () => new Response('{"success":true}'));
});

describe('real handler multi-output subtitle contract', () => {
  it('preserves the GA item contract without an optional 2.x phase field', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useHandleServerEvent(deps));
    const ga = {
      type: 'response.output_item.added',
      event_id: 'event-ga',
      response_id: 'resp-output',
      output_index: 0,
      item: { id: 'item-0', type: 'message', role: 'assistant', content: [] },
    } satisfies ResponseOutputItemAddedEvent;
    result.current(created('resp-output'));
    result.current(ga);
    result.current(transcript(0, 'A GA explanation.'));
    result.current(done('resp-output'));
    expect(vi.mocked(deps.addTranscript).mock.calls).toEqual([['assistant', 'A GA explanation.']]);
    expect(csrfFetch).toHaveBeenCalledTimes(1);
  });
  it('keeps commentary and final items separate, ordered under interleaving, with one usage', async () => {
    const deps = makeDeps();
    vi.mocked(deps.addTranscript).mockImplementation(useVoiceSessionStore.getState().addTranscript);
    const { result } = renderHook(() => useHandleServerEvent(deps));
    result.current(created('resp-output'));
    result.current(output(0));
    result.current(output(1));
    for (const index of [1, 0])
      result.current({
        type: 'response.output_audio_transcript.delta',
        response_id: 'resp-output',
        item_id: `item-${index}`,
        output_index: index,
        content_index: 0,
        event_id: `delta-${index}`,
        delta: index === 0 ? 'Let us' : 'The final',
      } satisfies ResponseAudioTranscriptDeltaEvent);
    expect(deps.addTranscript).not.toHaveBeenCalled();
    expect(csrfFetch).not.toHaveBeenCalled();
    result.current(transcript(1, 'The final explanation.'));
    result.current(output(1, true, 'resp-output', ['The final explanation.']));
    expect(deps.addTranscript).not.toHaveBeenCalled();
    result.current(transcript(0, 'Let us consider the question.'));
    result.current(output(0, true, 'resp-output', ['Let us consider the question.']));
    result.current({
      ...done('resp-output'),
      response: {
        ...done('resp-output').response,
        status: 'completed',
        output: [
          output(0, true, 'resp-output', ['Let us consider the question.']).item,
          output(1, true, 'resp-output', ['The final explanation.']).item,
        ],
      },
    });
    await act(async () => {});
    expect(vi.mocked(deps.addTranscript).mock.calls).toEqual([
      ['assistant', 'Let us consider the question.'],
      ['assistant', 'The final explanation.'],
    ]);
    expect(vi.mocked(deps.options.onTranscript!).mock.calls).toEqual(
      vi.mocked(deps.addTranscript).mock.calls,
    );
    expect(useVoiceSessionStore.getState().transcript.map((entry) => entry.content)).toEqual([
      'Let us consider the question.',
      'The final explanation.',
    ]);
    expect(csrfFetch).toHaveBeenCalledTimes(1);
  });
  it('orders multiple content parts inside an item and emits a final transcript once', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useHandleServerEvent(deps));
    result.current(created('resp-output'));
    result.current(output(0));
    result.current(transcript(0, 'Second part.', 1));
    result.current(transcript(0, 'First part.'));
    result.current(transcript(0, 'Second part.', 1));
    result.current(output(0, true, 'resp-output', ['First part.', 'Second part.']));
    expect(vi.mocked(deps.addTranscript).mock.calls).toEqual([
      ['assistant', 'First part.'],
      ['assistant', 'Second part.'],
    ]);
  });
  it('does not duplicate a final subtitle from a late event after response.done', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useHandleServerEvent(deps));
    result.current(created('resp-output'));
    result.current(output(0));
    result.current(transcript(0, 'An explanation.'));
    result.current(output(0, true, 'resp-output', ['An explanation.']));
    result.current(done('resp-output'));
    result.current(created('resp-new'));
    result.current(transcript(0, 'An explanation.'));
    result.current(done('resp-output'));
    expect(deps.addTranscript).toHaveBeenCalledTimes(1);
    expect(deps.hasActiveResponseRef.current).toBe(true);
    expect(csrfFetch).toHaveBeenCalledTimes(1);
  });
  it('preserves interrupted speech but rejects late output after a cancelled terminal response', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useHandleServerEvent(deps));
    result.current(created('resp-output'));
    result.current(output(0));
    result.current(transcript(0, 'Let us consider this.'));
    result.current({
      ...done('resp-output'),
      response: { ...done('resp-output').response, status: 'cancelled' },
    });
    result.current(transcript(1, 'A late answer.'));
    expect(vi.mocked(deps.addTranscript).mock.calls).toEqual([
      ['assistant', 'Let us consider this.'],
    ]);
    expect(csrfFetch).toHaveBeenCalledTimes(1);
  });
  it('retains equal wording in distinct phase items, but coalesces GA/preview duplicate events', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useHandleServerEvent(deps));
    result.current(created('resp-output'));
    for (const index of [0, 1]) {
      result.current(output(index));
      result.current(transcript(index, 'A useful explanation.'));
      result.current({
        ...transcript(index, 'A useful explanation.'),
        type: 'response.audio_transcript.done',
      });
      result.current(output(index, true, 'resp-output', ['A useful explanation.']));
    }
    expect(vi.mocked(deps.addTranscript).mock.calls).toEqual([
      ['assistant', 'A useful explanation.'],
      ['assistant', 'A useful explanation.'],
    ]);
  });
  it('does not attach old subtitles to a reconnected session', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useHandleServerEvent(deps));
    result.current(created('resp-output'));
    deps.sessionIdRef.current = 'voice-reconnected';
    result.current(created('resp-new'));
    result.current(transcript(0, 'Old session text.'));
    result.current(output(0, false, 'resp-new'));
    result.current(transcript(0, 'Current session text.', 0, 'resp-new'));
    expect(vi.mocked(deps.addTranscript).mock.calls).toEqual([
      ['assistant', 'Current session text.'],
    ]);
  });
});
