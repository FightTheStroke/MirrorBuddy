import { NextResponse } from 'next/server';
import { z } from 'zod';

import { pipe, withAuth, withCSRF, withSentry } from '@/lib/api/middlewares';
import { submitContribution } from '@/lib/community/community-service';
import { moderateContent } from '@/lib/community/moderation';

const SubmitContributionSchema = z.object({
  type: z.enum(['feedback', 'tip', 'resource', 'question']),
  title: z.string().trim().min(1, 'title is required'),
  content: z.string().trim().min(1, 'content is required'),
});

export const revalidate = 0;

export const POST = pipe(
  withSentry('/api/community/submit'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const body = await ctx.req.json();
  const validation = SubmitContributionSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid request',
        details: validation.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  const { type, title, content } = validation.data;
  const moderation = moderateContent(`${title}\n\n${content}`);

  if (!moderation.safe) {
    return NextResponse.json({ flags: moderation.flags }, { status: 422 });
  }

  const contribution = await submitContribution(ctx.userId!, {
    type,
    title,
    content,
  });

  return NextResponse.json({ id: contribution.id }, { status: 201 });
});
