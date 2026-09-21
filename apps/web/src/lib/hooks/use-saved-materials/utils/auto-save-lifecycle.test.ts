import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCSRFToken, setClientIdentity } from '@/lib/auth';
import { autoSaveMaterial, forceSaveMaterial } from './auto-save';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

const post = vi.fn<typeof fetch>();
const content = { questions: [] };
const successfulResponse = () => Response.json({ material: { toolId: 'saved-material' } });
let sequence = 0;
let toolId: string;

function authenticate(userId: string) {
  setClientIdentity({
    status: 'authenticated',
    userId,
    role: 'USER',
    legacyOrigin: false,
    needsLegacyUpgrade: false,
  });
}

describe('auto-save completion and ordering', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toolId = `save-lifecycle-${++sequence}`;
    authenticate('original-material-owner');
    clearCSRFToken();
    post.mockReset().mockImplementation(async () => successfulResponse());
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockImplementation(async (input, options) => {
        if (input === '/api/session') {
          return Response.json({ csrfToken: 'test-csrf-token' });
        }
        return post(input, options);
      }),
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    clearCSRFToken();
    setClientIdentity({ status: 'pending' });
    vi.unstubAllGlobals();
  });

  it('settles every debounced caller with the result of the latest payload', async () => {
    const firstResult = vi.fn();
    void autoSaveMaterial('quiz', 'First title', content, { toolId }).then(firstResult);
    await vi.advanceTimersByTimeAsync(500);
    const latest = autoSaveMaterial('quiz', 'Latest title', content, { toolId });

    await vi.advanceTimersByTimeAsync(1000);

    expect(await latest).toBe(true);
    expect(firstResult).toHaveBeenCalledExactlyOnceWith(true);
    expect(post).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(post.mock.calls[0][1]?.body)).title).toBe('Latest title');
    expect(new Headers(post.mock.calls[0][1]?.headers).get('X-CSRF-Token')).toBe('test-csrf-token');
  });

  it('does not report success while an identical save is still in flight', async () => {
    const response = Promise.withResolvers<Response>();
    post.mockReturnValueOnce(response.promise);
    const original = autoSaveMaterial('quiz', 'Pending title', content, { toolId });
    await vi.advanceTimersByTimeAsync(1000);
    const duplicateResult = vi.fn();
    const duplicate = autoSaveMaterial('quiz', 'Pending title', content, { toolId });
    void duplicate.then(duplicateResult);
    await vi.advanceTimersByTimeAsync(0);

    expect(duplicateResult).not.toHaveBeenCalled();
    response.resolve(Response.json({ error: 'Save rejected' }, { status: 500 }));
    expect(await original).toBe(false);
    expect(await duplicate).toBe(false);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('saves a changed payload after the in-flight payload completes', async () => {
    const response = Promise.withResolvers<Response>();
    post.mockReturnValueOnce(response.promise);
    const first = autoSaveMaterial('quiz', 'First version', content, { toolId });
    await vi.advanceTimersByTimeAsync(1000);
    const latest = autoSaveMaterial('quiz', 'Edited version', content, { toolId });
    await vi.advanceTimersByTimeAsync(1000);
    expect(post).toHaveBeenCalledTimes(1);

    response.resolve(successfulResponse());
    await first;
    await vi.advanceTimersByTimeAsync(1000);

    expect(await latest).toBe(true);
    expect(post).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(post.mock.calls[1][1]?.body)).title).toBe('Edited version');
  });

  it('settles the pending automatic caller when an explicit save flushes it', async () => {
    const automaticResult = vi.fn();
    void autoSaveMaterial('quiz', 'Automatic title', content, { toolId }).then(automaticResult);
    const immediate = await forceSaveMaterial('quiz', 'Explicit title', content, { toolId });
    await vi.advanceTimersByTimeAsync(0);

    expect(immediate).toBe(true);
    expect(automaticResult).toHaveBeenCalledExactlyOnceWith(true);
    expect(post).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(post.mock.calls[0][1]?.body)).title).toBe('Explicit title');
  });

  it('waits for actual completion before an explicit changed save, not a fixed delay', async () => {
    const response = Promise.withResolvers<Response>();
    post.mockReturnValueOnce(response.promise);
    const first = autoSaveMaterial('quiz', 'Slow save', content, { toolId });
    await vi.advanceTimersByTimeAsync(1000);
    const immediate = forceSaveMaterial('quiz', 'Explicit edit', content, { toolId });
    await vi.advanceTimersByTimeAsync(500);

    expect(post).toHaveBeenCalledTimes(1);
    response.resolve(successfulResponse());
    await first;
    expect(await immediate).toBe(true);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('allows another attempt after an actual save failure', async () => {
    post.mockResolvedValueOnce(Response.json({ error: 'Save rejected' }, { status: 500 }));
    const first = autoSaveMaterial('quiz', 'Retry title', content, { toolId });
    await vi.advanceTimersByTimeAsync(1000);
    expect(await first).toBe(false);

    const retry = autoSaveMaterial('quiz', 'Retry title', content, { toolId });
    await vi.advanceTimersByTimeAsync(1000);
    expect(await retry).toBe(true);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('never saves queued content as a different user after an identity change', async () => {
    const original = autoSaveMaterial('quiz', 'Private material', content, { toolId });
    authenticate('different-material-owner');
    await vi.advanceTimersByTimeAsync(1000);

    expect(await original).toBe(false);
    expect(post).not.toHaveBeenCalled();
  });

  it('warns before leaving with pending work and removes the warning after saving', async () => {
    const pending = autoSaveMaterial('quiz', 'Pending navigation', content, { toolId });
    const leaving = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(leaving);
    expect(leaving.defaultPrevented).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(await pending).toBe(true);
    const saved = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(saved);
    expect(saved.defaultPrevented).toBe(false);
  });

  it('does not extend the debounce for unchanged concurrent renders', async () => {
    const first = autoSaveMaterial('quiz', 'Unchanged', content, { toolId });
    await vi.advanceTimersByTimeAsync(900);
    const repeated = autoSaveMaterial('quiz', 'Unchanged', content, { toolId });
    await vi.advanceTimersByTimeAsync(100);
    expect(post).toHaveBeenCalledTimes(1);
    expect(await first).toBe(true);
    expect(await repeated).toBe(true);
  });
});
