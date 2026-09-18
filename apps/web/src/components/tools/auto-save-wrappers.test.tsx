import { act, cleanup, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCSRFToken, setClientIdentity } from '@/lib/auth';
import toast from '@/components/ui/toast';
import type { QuizRequest, SummaryData } from '@/types';
import { AutoSaveQuiz, AutoSaveSummary } from './auto-save-wrappers';
import {
  AutoSaveQuiz as ResultAutoSaveQuiz,
  AutoSaveSummary as ResultAutoSaveSummary,
} from './tool-result-display/auto-save-wrappers';

vi.unmock('next-intl');
const summaryComponent = vi.hoisted(() =>
  vi.fn<
    (props: {
      data: SummaryData;
      onConvertToMindmap: (data: SummaryData) => void;
      onGenerateFlashcards: (data: SummaryData) => void;
    }) => null
  >(() => null),
);

vi.mock('./quiz-tool', () => ({ QuizTool: () => null }));
vi.mock('./flashcard-tool', () => ({ FlashcardTool: () => null }));
vi.mock('./summary-tool', () => ({ SummaryTool: summaryComponent }));
vi.mock('./demo-sandbox', () => ({ DemoSandbox: () => null }));
vi.mock('./live-mindmap', () => ({ LiveMindmap: () => null }));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

const post = vi.fn<typeof fetch>();
const request: QuizRequest = { title: 'Fractions', subject: 'mathematics', questions: [] };
const messages = {
  errors: { saveFailed: 'Save failed', retry: 'Retry' },
  tools: { summary: { saved: 'Saved' } },
};
let sequence = 0;
let toolId: string;

function authenticate(userId = 'material-owner') {
  setClientIdentity({
    status: 'authenticated',
    userId,
    role: 'USER',
    legacyOrigin: false,
    needsLegacyUpgrade: false,
  });
}

describe.each([
  ['conversation', AutoSaveQuiz, AutoSaveSummary],
  ['result panel', ResultAutoSaveQuiz, ResultAutoSaveSummary],
] as const)('%s material saves', (_, Wrapper, SummaryWrapper) => {
  function display(data = request, id: string | undefined = toolId) {
    return (
      <StrictMode>
        <NextIntlClientProvider locale="en" messages={messages}>
          <Wrapper request={data} toolId={id} />
        </NextIntlClientProvider>
      </StrictMode>
    );
  }

  beforeEach(() => {
    vi.useFakeTimers();
    toolId = `wrapper-${++sequence}`;
    authenticate();
    clearCSRFToken();
    post.mockReset().mockImplementation(async () => Response.json({ material: { toolId } }));
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockImplementation(async (url, init) => {
        if (url === '/api/session') return Response.json({ csrfToken: 'test-csrf' });
        return post(url, init);
      }),
    );
    vi.spyOn(toast, 'error');
    vi.spyOn(toast, 'success');
  });

  afterEach(async () => {
    cleanup();
    await vi.runAllTimersAsync();
    toast.dismissAll();
    clearCSRFToken();
    setClientIdentity({ status: 'pending' });
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('waits for identity readiness instead of permanently skipping the save', async () => {
    setClientIdentity({ status: 'pending' });
    render(display());
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(post).not.toHaveBeenCalled();
    act(() => authenticate());
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('offers an immediate retry after the actual request fails', async () => {
    post.mockResolvedValueOnce(Response.json({ error: 'Rejected' }, { status: 500 }));
    render(display());
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(toast.error).toHaveBeenCalledWith(
      'Save failed',
      undefined,
      expect.objectContaining({
        duration: 0,
        action: expect.objectContaining({ label: 'Retry' }),
      }),
    );
    const retry = vi.mocked(toast.error).mock.calls[0]?.[2]?.action?.onClick;
    expect(retry).toBeTypeOf('function');
    await act(async () => {
      retry?.();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(post).toHaveBeenCalledTimes(2);
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('persists changed content without duplicating an unchanged rerender', async () => {
    const view = render(display());
    await act(() => vi.advanceTimersByTimeAsync(2000));
    view.rerender(display({ ...request }));
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(post).toHaveBeenCalledTimes(1);
    view.rerender(display({ ...request, title: 'Equivalent fractions' }));
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(post).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(post.mock.calls[1][1]?.body)).title).toBe('Equivalent fractions');
    view.rerender(display(request, `${toolId}-next`));
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(post).toHaveBeenCalledTimes(3);
    expect(JSON.parse(String(post.mock.calls[2][1]?.body)).toolId).toBe(`${toolId}-next`);
  });

  it('flushes pending work on navigation without waiting for debounce', async () => {
    const view = render(display());
    view.unmount();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('does not resubmit the previous account material after identity changes', async () => {
    render(display());
    act(() => authenticate('another-owner'));
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(post).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does not conflate two different materials without an explicit tool ID', async () => {
    render(display(request, ''));
    render(display({ ...request, title: 'Geometry' }, ''));
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(post).toHaveBeenCalledTimes(2);
    const ids = post.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).toolId);
    expect(new Set(ids).size).toBe(2);
  });

  it('never lets an old retry overwrite a newer material revision', async () => {
    post.mockResolvedValueOnce(Response.json({ error: 'Rejected' }, { status: 500 }));
    const view = render(display());
    await act(() => vi.advanceTimersByTimeAsync(2000));
    const staleRetry = vi.mocked(toast.error).mock.calls[0]?.[2]?.action?.onClick;
    expect(staleRetry).toBeTypeOf('function');
    view.rerender(display({ ...request, title: 'Latest revision' }));
    await act(() => vi.advanceTimersByTimeAsync(2000));
    await act(async () => {
      staleRetry?.();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(post).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(post.mock.calls[1][1]?.body)).title).toBe('Latest revision');
  });

  it.each(['onConvertToMindmap', 'onGenerateFlashcards'] as const)(
    '%s announces success only after a successful response, including retries',
    async (action) => {
      const data: SummaryData = {
        topic: 'Fractions',
        sections: [{ title: 'Basics', content: 'A fraction expresses a part of a whole.' }],
      };
      render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <SummaryWrapper request={data} toolId={toolId} />
        </NextIntlClientProvider>,
      );
      await act(() => vi.advanceTimersByTimeAsync(2000));
      const response = Promise.withResolvers<Response>();
      post.mockReturnValueOnce(response.promise);
      const props = summaryComponent.mock.lastCall?.[0];
      expect(props).toBeDefined();
      act(() => props?.[action](data));
      await act(() => vi.advanceTimersByTimeAsync(0));
      expect(toast.success).not.toHaveBeenCalled();
      await act(async () => {
        response.resolve(Response.json({ error: 'Rejected' }, { status: 500 }));
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledTimes(1);
      await act(async () => {
        vi.mocked(toast.error).mock.calls[0]?.[2]?.action?.onClick();
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(toast.success).toHaveBeenCalledExactlyOnceWith('Saved');
    },
  );
});
