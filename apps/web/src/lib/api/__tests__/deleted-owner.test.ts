import { describe, it, expect } from 'vitest';
import { isDeletedOwnerError, deletedOwnerResponse } from '../deleted-owner';

describe('deleted owner detection', () => {
  it('recognises the foreign key violation a deleted user leaves behind', () => {
    expect(isDeletedOwnerError({ code: 'P2003' })).toBe(true);
  });

  it('leaves every other failure to the caller', () => {
    for (const error of [null, undefined, new Error('boom'), { code: 'P2002' }, 'P2003'])
      expect(isDeletedOwnerError(error)).toBe(false);
  });

  it('answers unauthenticated rather than failing, because the identity is gone', async () => {
    const response = deletedOwnerResponse();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: 'Authentication required',
      code: 'AUTH_OWNER_DELETED',
    });
  });
});
