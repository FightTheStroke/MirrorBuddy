import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';
import { pipe, withAuth, withCSRF, withSentry } from '@/lib/api/middlewares';
import { moderateContent } from '@/lib/community/moderation';
import { submitContribution } from '@/lib/community/community-service';

vi.mock('@/lib/api/middlewares', () => ({
  pipe: vi.fn((..._fns: unknown[]) => (handler: (ctx: { req: Request; userId: string }) => Promise<Response>) => {
    return async (req: Request) => handler({ req, userId: 'user-1' });
  }),
  withSentry: vi.fn((path: string) => `sentry:${path}`),
  withCSRF: 'csrf-mw',
  withAuth: 'auth-mw',
}));

vi.mock('@/lib/community/moderation', () => ({
  moderateContent: vi.fn(),
}));

vi.mock('@/lib/community/community-service', () => ({
  submitContribution: vi.fn(),
}));

describe('POST /api/community/submit', () => {
  beforeEach(() => {
    vi.mocked(moderateContent).mockReset();
    vi.mocked(submitContribution).mockReset();
  });

  it('composes with withSentry, withCSRF, and withAuth', () => {
    expect(withSentry).toHaveBeenCalledWith('/api/community/submit');
    expect(pipe).toHaveBeenCalledWith('sentry:/api/community/submit', withCSRF, withAuth);
  });

  it('returns 422 with flags when moderation fails', async () => {
    vi.mocked(moderateContent).mockReturnValue({
      safe: false,
      flags: ['content:unsafe'],
      details: {
        content: { safe: false, blocked: true, severity: 'medium', category: 'unsafe' },
        jailbreak: { detected: false, confidence: 0, categories: [] },
      },
    } as never);

    const response = await POST(
      new Request('http://localhost/api/community/submit', {
        method: 'POST',
        body: JSON.stringify({ type: 'tip', title: 'bad', content: 'unsafe' }),
      }) as never,
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ flags: ['content:unsafe'] });
    expect(moderateContent).toHaveBeenCalledWith('bad\n\nunsafe');
    expect(submitContribution).not.toHaveBeenCalled();
  });

  it('submits contribution and returns 201 with id when content is safe', async () => {
    vi.mocked(moderateContent).mockReturnValue({
      safe: true,
      flags: [],
      details: {
        content: { safe: true, blocked: false, severity: 'low', category: null },
        jailbreak: { detected: false, confidence: 0, categories: [] },
      },
    } as never);
    vi.mocked(submitContribution).mockResolvedValue({ id: 'contrib-1' } as never);

    const response = await POST(
      new Request('http://localhost/api/community/submit', {
        method: 'POST',
        body: JSON.stringify({ type: 'tip', title: 'Study tip', content: 'Use flashcards daily.' }),
      }) as never,
    );

    expect(submitContribution).toHaveBeenCalledWith('user-1', {
      type: 'tip',
      title: 'Study tip',
      content: 'Use flashcards daily.',
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: 'contrib-1' });
  });
});
