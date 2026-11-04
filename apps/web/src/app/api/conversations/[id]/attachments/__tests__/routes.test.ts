import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/middlewares', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/api/middlewares');
  return {
    ...actual,
    pipe:
      (..._mw: unknown[]) =>
      (handler: (ctx: unknown) => Promise<Response>) =>
      async (req: NextRequest, context: { params: Promise<Record<string, string>> }) =>
        handler({ req, params: context?.params, userId: 'u1' }),
  };
});
vi.mock('@/lib/conversation/attachments/server', async (orig) => ({
  ...(await orig<object>()),
  listConversationAttachments: vi.fn(),
  createConversationAttachment: vi.fn(),
  deleteConversationAttachment: vi.fn(),
}));

import * as server from '@/lib/conversation/attachments/server';
import { GET, POST } from '../route';
import { DELETE } from '../[attachmentId]/route';

const params = (p: Record<string, string>) => ({ params: Promise.resolve(p) });
const doc = {
  id: 'a1',
  name: 'n.pdf',
  mimeType: 'application/pdf',
  size: 1,
  pages: [{ pageNumber: 1, text: 't' }],
};
const post = (body: string) =>
  new NextRequest('http://localhost/api/conversations/c1/attachments', { method: 'POST', body });
const del = () => new NextRequest('http://localhost/x', { method: 'DELETE' });

beforeEach(() => vi.resetAllMocks());

describe('conversation attachment routes', () => {
  it('GET returns { attachments }', async () => {
    vi.mocked(server.listConversationAttachments).mockResolvedValue([doc as never]);
    const res = await GET(new NextRequest('http://localhost/x'), params({ id: 'c1' }));
    expect(await res.json()).toEqual({ attachments: [doc] });
    expect(server.listConversationAttachments).toHaveBeenCalledWith('u1', 'c1');
  });

  it('POST returns 201 { attachment }', async () => {
    vi.mocked(server.createConversationAttachment).mockResolvedValue(doc as never);
    const res = await POST(post('{}'), params({ id: 'c1' }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ attachment: doc });
  });

  it('POST maps malformed JSON to 400 and AttachmentError to its status/code', async () => {
    expect((await POST(post('{nope'), params({ id: 'c1' }))).status).toBe(400);
    vi.mocked(server.createConversationAttachment).mockRejectedValue(
      new server.AttachmentError(404, 'conversation_not_found'),
    );
    const res = await POST(post('{}'), params({ id: 'c1' }));
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe('conversation_not_found');
  });

  it('DELETE returns 204, and 404 for unknown', async () => {
    vi.mocked(server.deleteConversationAttachment).mockResolvedValueOnce();
    expect((await DELETE(del(), params({ id: 'c1', attachmentId: 'a1' }))).status).toBe(204);
    vi.mocked(server.deleteConversationAttachment).mockRejectedValueOnce(
      new server.AttachmentError(404, 'attachment_not_found'),
    );
    expect((await DELETE(del(), params({ id: 'c1', attachmentId: 'zz' }))).status).toBe(404);
  });
});
