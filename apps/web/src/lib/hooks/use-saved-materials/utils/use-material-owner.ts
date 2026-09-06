import { useClientIdentity } from '@/lib/auth/identity-provider';
import { getClientIdentity, type ClientIdentity } from '@/lib/auth/client-auth';

export const isCurrentOwner = (identity: ClientIdentity) => getClientIdentity() === identity;

export function useMaterialOwner() {
  const identity = useClientIdentity();
  return {
    userId: identity.status === 'authenticated' ? identity.userId : null,
    identity,
    identityError: identity.status === 'unavailable' ? identity.reason : null,
  };
}
