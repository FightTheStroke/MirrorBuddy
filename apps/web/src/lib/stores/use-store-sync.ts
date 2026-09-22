// ============================================================================
// STORE SYNC HOOK - Initialize and auto-sync stores with server
// ============================================================================

import { useSettingsStore } from './settings-store';
import { useProgressStore } from './progress-store';
import { useConversationStore } from './conversation-store';
import { useLearningsStore } from './learnings-store';
import { useAccessibilityStore } from '@/lib/accessibility';
import { getClientIdentity, getUserIdFromCookie } from '@/lib/auth/client-auth';
import { logger } from '@/lib/logger';

/**
 * Initialize all stores by loading data from server
 * Call this once on app startup
 */
export async function initializeStores() {
  // A signed-out visitor has nothing to hydrate. Asking anyway earns a 401 that
  // the browser prints as a failed request, so every guest opened the site to a
  // console full of errors that were not errors.
  if (getUserIdFromCookie() === null) {
    return;
  }

  // Still handled: the cookie can be present but stale (expired session).
  const res = await fetch('/api/user');

  // A refused session is not a malfunction — the cookie outlived the session it
  // belonged to, and signing in again is the app's normal answer. Treating it as
  // a failure put a warning in the production error feed for every stale tab.
  if (res.status === 401 || res.status === 403) {
    logger.debug('Store hydration skipped: the session is no longer valid');
    return;
  }

  if (!res.ok) {
    throw new Error(`Store hydration failed (${res.status})`);
  }

  // Authenticated user — load data from server
  await Promise.all([
    useSettingsStore.getState().loadFromServer(),
    useProgressStore.getState().loadFromServer(),
    useConversationStore.getState().loadFromServer(),
    useLearningsStore.getState().loadFromServer(),
    useAccessibilityStore.getState().loadFromDatabase(),
  ]);
}

/**
 * Setup auto-sync interval for stores with pending changes
 * Returns interval ID that can be cleared
 */
export function setupAutoSync(intervalMs = 30000) {
  let syncing = false;
  return setInterval(async () => {
    const identity = getClientIdentity();
    if (syncing || identity.status !== 'authenticated') return;
    const settings = useSettingsStore.getState();
    const progress = useProgressStore.getState();
    syncing = true;

    try {
      if (settings.pendingSync) await settings.syncToServer();
      if (progress.pendingSync) await progress.syncToServer();
      if (getClientIdentity() !== identity || getClientIdentity().status !== 'authenticated')
        return;
      const current = useProgressStore.getState();
      if (current.needsHydration && !current.pendingSync) await current.loadFromServer();
    } catch {
      logger.warn('Store sync failed; pending changes retained');
    } finally {
      syncing = false;
    }
  }, intervalMs);
}
