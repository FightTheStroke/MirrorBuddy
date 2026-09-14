import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { csrfFetch, setClientIdentity } from '@/lib/auth';
import { autoSaveMaterial, forceSaveMaterial } from './auto-save';
import { generateContentHash } from './api';

vi.mock('@/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth')>()),
  csrfFetch: vi.fn(),
}));
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

describe('auto-save request serialization', () => {
  const title = 'Practice quiz';
  const content = { questions: [] };

  beforeEach(() => {
    vi.useFakeTimers();
    setClientIdentity({
      status: 'authenticated',
      userId: 'materials-test-user',
      role: 'USER',
      legacyOrigin: false,
      needsLegacyUpgrade: false,
    });
    vi.mocked(csrfFetch).mockResolvedValue(
      new Response(JSON.stringify({ material: { toolId: 'saved-quiz' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    setClientIdentity({ status: 'pending' });
    vi.resetAllMocks();
  });

  it.each([undefined, ''])(
    'keeps the generated ID when wrapper options contain toolId=%s',
    async (toolId) => {
      const saved = autoSaveMaterial('quiz', title, content, {
        subject: 'mathematics',
        toolId,
      });
      await vi.advanceTimersByTimeAsync(1000);

      expect(await saved).toBe(true);
      expect(csrfFetch).toHaveBeenCalledExactlyOnceWith('/api/materials', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'materials-test-user',
          toolId: generateContentHash('quiz', title, content),
          toolType: 'quiz',
          title,
          content,
          subject: 'mathematics',
        }),
      });
    },
  );

  it('preserves an explicit ID for an immediate save', async () => {
    const saved = await forceSaveMaterial('quiz', title, content, {
      subject: 'mathematics',
      toolId: 'explicit-quiz',
    });

    expect(saved).toBe(true);
    expect(csrfFetch).toHaveBeenCalledExactlyOnceWith('/api/materials', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'materials-test-user',
        toolId: 'explicit-quiz',
        toolType: 'quiz',
        title,
        content,
        subject: 'mathematics',
      }),
    });
  });
});
