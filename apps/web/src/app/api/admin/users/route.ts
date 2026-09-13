import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdminReadOnly } from '@/lib/api/middlewares';
import { getUserList } from '@/lib/admin/user-list-service';
import { UserListQueryError } from '@/lib/admin/user-list-query';
import { getUserCollection } from '@/lib/admin/user-list-collection-service';
import { UserCollectionChangedError } from '@/lib/admin/user-list-collection';

export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/admin/users'),
  withAdminReadOnly,
)(async (ctx) => {
  try {
    const params = new URL(ctx.req.url).searchParams;
    return NextResponse.json(
      params.has('collection') ? await getUserCollection(params) : await getUserList(params),
    );
  } catch (error) {
    if (error instanceof UserCollectionChangedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof UserListQueryError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
});
