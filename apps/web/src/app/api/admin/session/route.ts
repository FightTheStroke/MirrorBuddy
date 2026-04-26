import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdminReadOnly } from '@/lib/api/middlewares';

export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/admin/session'),
  withAdminReadOnly,
)(async (ctx) => {
  return NextResponse.json({ userId: ctx.userId });
});
