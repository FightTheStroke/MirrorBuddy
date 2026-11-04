import { NextResponse } from 'next/server';
import { pipe, withSentry, withAuth, withCSRF } from '@/lib/api/middlewares';
import {
  AttachmentError,
  deleteConversationAttachment,
} from '@/lib/conversation/attachments/server';

export const revalidate = 0;

export const DELETE = pipe(
  withSentry('/api/conversations/[id]/attachments/[attachmentId]'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const { id, attachmentId } = await ctx.params;
  try {
    await deleteConversationAttachment(ctx.userId!, id, attachmentId);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof AttachmentError) {
      return NextResponse.json({ error: error.code, code: error.code }, { status: error.status });
    }
    throw error;
  }
});
