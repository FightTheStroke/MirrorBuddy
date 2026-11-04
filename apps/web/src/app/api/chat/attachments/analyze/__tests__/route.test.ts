import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/middlewares', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/api/middlewares');
  return {
    ...actual,
    pipe:
      (..._mw: unknown[]) =>
      (handler: (ctx: unknown) => Promise<Response>) =>
      async (req: NextRequest) =>
        handler({ req }),
  };
});
vi.mock('@/app/api/chat/auth-handler', () => ({ extractUserIdWithCoppaCheck: vi.fn() }));
vi.mock('@/app/api/chat/trial-handler', () => ({ checkAndIncrementTrialToolUsage: vi.fn() }));
vi.mock('@/lib/ai/server', () => ({ getActiveProvider: vi.fn() }));
vi.mock('@/lib/conversation/attachments/server', () => ({ canUseAttachmentTool: vi.fn() }));
vi.mock('@/lib/rate-limit', async (orig) => ({
  ...(await orig<object>()),
  checkRateLimit: vi.fn().mockReturnValue({ success: true }),
}));
vi.mock('@/lib/trial/trial-request', () => ({
  findOwnedTrialSession: vi.fn(),
  hasTrialConsent: vi.fn(),
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'x' }) }),
}));

import { extractUserIdWithCoppaCheck } from '@/app/api/chat/auth-handler';
import { checkRateLimit } from '@/lib/rate-limit';
import { getActiveProvider } from '@/lib/ai/server';
import { canUseAttachmentTool } from '@/lib/conversation/attachments/server';
import { hasTrialConsent } from '@/lib/trial/trial-request';
import { POST } from '../route';

const PNG = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]).toString('base64')}`;
const provider = { provider: 'azure', endpoint: 'https://x.test', apiKey: 'k', model: 'm' };
const req = (body: unknown) =>
  new NextRequest('http://localhost/api/chat/attachments/analyze', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const fetchMock = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(extractUserIdWithCoppaCheck).mockResolvedValue({ allowed: true, userId: 'u1' });
  vi.mocked(canUseAttachmentTool).mockResolvedValue(true);
  vi.mocked(checkRateLimit).mockReturnValue({ success: true } as never);
  vi.mocked(getActiveProvider).mockReturnValue(provider as never);
  vi.stubGlobal('fetch', fetchMock);
});

describe('POST /api/chat/attachments/analyze', () => {
  it('fails closed for COPPA-blocked users', async () => {
    vi.mocked(extractUserIdWithCoppaCheck).mockResolvedValue({ allowed: false, userId: 'u1' });
    expect((await POST(req({ image: PNG, source: 'image', pageNumber: 1 }))).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects wrong magic bytes, external URLs and bad input without calling AI', async () => {
    const fake = `data:image/png;base64,${Buffer.from('not an image').toString('base64')}`;
    expect((await POST(req({ image: fake, source: 'image', pageNumber: 1 }))).status).toBe(400);
    expect(
      (await POST(req({ image: 'https://evil.test/a.png', source: 'image', pageNumber: 1 })))
        .status,
    ).toBe(400);
    expect((await POST(req({ image: PNG, source: 'image', pageNumber: 0 }))).status).toBe(400);
    expect((await POST(req('{bad'))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('gates scans on pdf and photos on webcam independently', async () => {
    vi.mocked(canUseAttachmentTool).mockImplementation(async (_u, kind) => kind === 'pdf');
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'scan' } }] })),
    );
    const scan = await POST(req({ image: PNG, source: 'pdf', pageNumber: 1 }));
    expect(await scan.json()).toEqual({ text: 'scan' });
    expect(canUseAttachmentTool).toHaveBeenLastCalledWith('u1', 'pdf');
    const photo = await POST(req({ image: PNG, source: 'image', pageNumber: 1 }));
    expect(photo.status).toBe(403);
    expect(canUseAttachmentTool).toHaveBeenLastCalledWith('u1', 'webcam');
  });

  it('rejects a missing or unknown source with 400 before any tier check', async () => {
    expect((await POST(req({ image: PNG, pageNumber: 1 }))).status).toBe(400);
    expect((await POST(req({ image: PNG, source: 'video', pageNumber: 1 }))).status).toBe(400);
    expect(canUseAttachmentTool).not.toHaveBeenCalled();
  });

  it('denies when the tier lacks the tool', async () => {
    vi.mocked(canUseAttachmentTool).mockResolvedValue(false);
    expect((await POST(req({ image: PNG, source: 'image', pageNumber: 1 }))).status).toBe(403);
  });

  it('requires trial consent for anonymous visitors', async () => {
    vi.mocked(extractUserIdWithCoppaCheck).mockResolvedValue({ allowed: true });
    vi.mocked(hasTrialConsent).mockReturnValue(false);
    expect((await POST(req({ image: PNG, source: 'image', pageNumber: 1 }))).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns extracted text from the mocked vision transport', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: ' hello ' } }] })),
    );
    const res = await POST(req({ image: PNG, source: 'image', pageNumber: 1 }));
    expect(await res.json()).toEqual({ text: 'hello' });
  });

  it('returns 422 when vision is unavailable', async () => {
    vi.mocked(getActiveProvider).mockReturnValue({ ...provider, provider: 'ollama' } as never);
    expect((await POST(req({ image: PNG, source: 'image', pageNumber: 1 }))).status).toBe(422);
  });
});
