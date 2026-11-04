import { NextResponse } from 'next/server';
import { pipe, withSentry, withAuth, withCSRF } from '@/lib/api/middlewares';
import {
  AttachmentError,
  createConversationAttachment,
  listConversationAttachments,
} from '@/lib/conversation/attachments/server';

export const revalidate = 0;

function errorResponse(error: unknown): Response {
  if (error instanceof AttachmentError) {
    return NextResponse.json({ error: error.code, code: error.code }, { status: error.status });
  }
  throw error;
}

export const GET = pipe(
  withSentry('/api/conversations/[id]/attachments'),
  withAuth,
)(async (ctx) => {
  const { id } = await ctx.params;
  try {
    const attachments = await listConversationAttachments(ctx.userId!, id);
    return NextResponse.json({ attachments });
  } catch (error) {
    return errorResponse(error);
  }
});

export const POST = pipe(
  withSentry('/api/conversations/[id]/attachments'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const { id } = await ctx.params;
  let body: unknown = null;
  try {
    body = await ctx.req.json();
  } catch {
    return NextResponse.json(
      { error: 'attachment_invalid', code: 'attachment_invalid' },
      { status: 400 },
    );
  }
  try {
    const attachment = await createConversationAttachment(ctx.userId!, id, body);
    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
