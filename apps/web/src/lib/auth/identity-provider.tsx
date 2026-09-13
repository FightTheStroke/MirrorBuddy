'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { logger } from '@/lib/logger';
import {
  getClientIdentity,
  PENDING_IDENTITY,
  refreshClientIdentity,
  setClientIdentity,
  subscribeClientIdentity,
  upgradeLegacyIdentity,
} from './client-auth';
import type { ClientIdentity } from './identity-types';

const ServerIdentity = createContext<ClientIdentity>(PENDING_IDENTITY);

export function useClientIdentity(): ClientIdentity {
  const initial = useContext(ServerIdentity);
  return useSyncExternalStore(subscribeClientIdentity, getClientIdentity, () => initial);
}

export function IdentityProvider({
  initialIdentity = PENDING_IDENTITY,
  children,
}: {
  initialIdentity?: ClientIdentity;
  children: React.ReactNode;
}) {
  const previousSeed = useRef(initialIdentity);
  const lastAccount = useRef(
    initialIdentity.status === 'authenticated'
      ? initialIdentity.userId
      : initialIdentity.status === 'anonymous'
        ? null
        : undefined,
  );
  useState(() => {
    // Never mutate the module singleton on the server: it is shared between requests.
    if (typeof window !== 'undefined') setClientIdentity(initialIdentity);
    return true;
  });
  useEffect(() => {
    if (previousSeed.current !== initialIdentity) {
      previousSeed.current = initialIdentity;
      setClientIdentity(initialIdentity);
      if (initialIdentity.status === 'authenticated' || initialIdentity.status === 'anonymous') {
        const account = initialIdentity.status === 'authenticated' ? initialIdentity.userId : null;
        const changed = lastAccount.current !== undefined && lastAccount.current !== account;
        lastAccount.current = account;
        if (changed) window.location.reload();
      }
    }
  }, [initialIdentity]);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void refreshClientIdentity()
        .then((next) => {
          if (!active || (next.status !== 'anonymous' && next.status !== 'authenticated')) return;
          const account = next.status === 'authenticated' ? next.userId : null;
          const changed = lastAccount.current !== undefined && lastAccount.current !== account;
          lastAccount.current = account;
          if (changed) window.location.reload();
        })
        .catch(() => logger.warn('Identity refresh navigation failed'));
    };
    // One attempt per provider mount, never a sliding native renewal.
    void (async () => {
      if (getClientIdentity().status === 'pending') await refreshClientIdentity();
      if (active) await upgradeLegacyIdentity();
    })().catch(() => {
      if (active) logger.warn('Legacy session upgrade failed; retry identity verification');
    });
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
    };
  }, []);
  return <ServerIdentity.Provider value={initialIdentity}>{children}</ServerIdentity.Provider>;
}
