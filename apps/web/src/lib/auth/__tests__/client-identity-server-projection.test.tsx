// @vitest-environment node
import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { getClientIdentity } from '../client-auth';
import { IdentityProvider, useClientIdentity } from '../identity-provider';
import type { ClientIdentity } from '../identity-types';

function Subject() {
  const identity = useClientIdentity();
  return <span>{identity.status === 'authenticated' ? identity.userId : identity.status}</span>;
}
it('server rendering uses request-local projections without changing the client singleton', () => {
  const initial = getClientIdentity();
  const account: ClientIdentity = {
    status: 'authenticated',
    userId: 'request-a',
    role: 'USER',
    legacyOrigin: false,
    needsLegacyUpgrade: false,
  };
  expect(
    renderToString(
      <IdentityProvider initialIdentity={account}>
        <Subject />
      </IdentityProvider>,
    ),
  ).toContain('request-a');
  expect(
    renderToString(
      <IdentityProvider initialIdentity={{ ...account, userId: 'request-b' }}>
        <Subject />
      </IdentityProvider>,
    ),
  ).toContain('request-b');
  expect(getClientIdentity()).toBe(initial);
});
