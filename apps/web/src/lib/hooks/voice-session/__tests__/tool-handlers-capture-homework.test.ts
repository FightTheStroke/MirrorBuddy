import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleToolCall, type ToolHandlerParams } from '../tool-handlers';

vi.mock('@/lib/logger/client', () => ({
  clientLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// capture_homework is short-circuited before these run, but the module imports
// them at the top so they must resolve.
vi.mock('@/lib/voice', () => ({
  executeVoiceTool: vi.fn(),
  isToolCreationCommand: vi.fn(() => false),
  isOnboardingCommand: vi.fn(() => false),
  getToolTypeFromName: vi.fn(() => null),
}));

vi.mock('@/lib/stores/method-progress-store', () => ({
  useMethodProgressStore: { getState: () => ({ recordToolCreation: vi.fn() }) },
}));

function makeParams(
  overrides: Partial<ToolHandlerParams> & {
    dataChannelSends?: Array<Record<string, unknown>>;
  } = {},
): ToolHandlerParams {
  const sends = overrides.dataChannelSends ?? [];
  const dataChannel = {
    readyState: 'open',
    send: vi.fn((msg: string) => sends.push(JSON.parse(msg))),
  } as unknown as RTCDataChannel;

  return {
    event: {
      name: 'capture_homework',
      arguments: JSON.stringify({ purpose: 'homework' }),
      call_id: 'call-123',
    },
    maestroRef: { current: null },
    sessionIdRef: { current: 'session-1' },
    webrtcDataChannelRef: { current: dataChannel },
    addToolCall: vi.fn(),
    updateToolCall: vi.fn(),
    options: {},
    ...overrides,
  } as ToolHandlerParams;
}

describe('handleToolCall — capture_homework', () => {
  beforeEach(() => vi.clearAllMocks());

  it('defers to the webcam handler when one is wired (no immediate tool result)', async () => {
    const sends: Array<Record<string, unknown>> = [];
    const onWebcamRequest = vi.fn();
    const params = makeParams({
      dataChannelSends: sends,
      options: { onWebcamRequest },
    });

    await handleToolCall(params);

    expect(onWebcamRequest).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'homework', callId: 'call-123' }),
    );
    // Result is sent later (via sendWebcamResult), not now.
    expect(sends).toHaveLength(0);
  });

  it('resolves the call immediately when no webcam handler is wired (prevents the model hanging)', async () => {
    const sends: Array<Record<string, unknown>> = [];
    const params = makeParams({ dataChannelSends: sends, options: {} });

    await handleToolCall(params);

    // Must emit a function_call_output AND a response.create so the realtime
    // model never waits forever for a tool result that never arrives.
    const output = sends.find((m) => m.type === 'conversation.item.create');
    expect(output).toBeDefined();
    expect((output?.item as Record<string, unknown>)?.type).toBe('function_call_output');
    expect((output?.item as Record<string, unknown>)?.call_id).toBe('call-123');
    expect(sends.some((m) => m.type === 'response.create')).toBe(true);
  });

  it('resolves the call when tool arguments are malformed JSON (catch-block recovery)', async () => {
    const sends: Array<Record<string, unknown>> = [];
    const params = makeParams({
      dataChannelSends: sends,
      event: { name: 'create_quiz', arguments: '{ not valid json', call_id: 'call-bad' },
    });

    await handleToolCall(params);

    const output = sends.find(
      (m) => (m.item as Record<string, unknown>)?.type === 'function_call_output',
    );
    expect(output).toBeDefined();
    expect((output?.item as Record<string, unknown>)?.call_id).toBe('call-bad');
    expect(JSON.parse(String((output?.item as Record<string, unknown>)?.output)).success).toBe(
      false,
    );
    expect(sends.some((m) => m.type === 'response.create')).toBe(true);
  });
});
