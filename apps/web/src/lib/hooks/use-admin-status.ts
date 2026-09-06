'use client';

import { useClientIdentity } from '@/lib/auth/identity-provider';
import { refreshClientIdentity } from '@/lib/auth/client-auth';

export function useAdminStatus() {
  const identity = useClientIdentity();
  return {
    isAdmin: identity.status === 'authenticated' && identity.role === 'ADMIN',
    isLoading: identity.status === 'pending',
    userId: identity.status === 'authenticated' ? identity.userId : null,
    error: identity.status === 'unavailable' ? identity.reason : null,
    identityStatus: identity.status,
    refresh: refreshClientIdentity,
  };
}
