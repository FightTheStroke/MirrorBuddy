import { NextResponse } from 'next/server';

/** Prisma's code for a foreign key constraint violation. */
const FOREIGN_KEY_VIOLATION = 'P2003';

/**
 * A signed session can name a user row that no longer exists. Writing the
 * user's own data then violates the owner foreign key. That is not a server
 * fault: the credential is simply stale, and the caller has to be told so
 * rather than shown a 500.
 */
export function isDeletedOwnerError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === FOREIGN_KEY_VIOLATION
  );
}

export function deletedOwnerResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Authentication required', code: 'AUTH_OWNER_DELETED' },
    { status: 401 },
  );
}
