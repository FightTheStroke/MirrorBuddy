import { useEffect, useRef } from 'react';
import { isSameAccount, type ClientIdentity } from '@/lib/auth';
import { useClientIdentity } from '@/lib/auth/identity-provider';

/** Runs `onChange` when the settled account changes (switch or sign-out), never on first settle. */
export function useIdentityReset(onChange: () => void): void {
  const identity = useClientIdentity();
  const previous = useRef<ClientIdentity | null>(null);
  const callback = useRef(onChange);

  useEffect(() => {
    callback.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (identity.status !== 'authenticated' && identity.status !== 'anonymous') return;
    const before = previous.current;
    previous.current = identity;
    if (before && !isSameAccount(before, identity)) callback.current();
  }, [identity]);
}
