// ============================================================================
// STORE SYNC HOOK - Initialize and auto-sync stores with server
// ============================================================================

import { useSettingsStore } from './settings-store';
import { useProgressStore } from './progress-store';
import { useConversationStore } from './conversation-store';
import { useLearningsStore } from './learnings-store';
import { useAccessibilityStore } from '@/lib/accessibility';

/**
 * Initialize all stores by loading data from server
 * Call this once on app startup
 */
export async function initializeStores() {
  // Check if user is authenticated (in production, 401 = guest/trial mode)
  const res = await fetch('/api/user');

  if (!res.ok) {
    // Guest/trial mode — stores use defaults, no server sync needed
    return;
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
  // Auto-sync every 30 seconds if there are pending changes
  return setInterval(async () => {
    const settings = useSettingsStore.getState();
    const progress = useProgressStore.getState();

    if (settings.pendingSync) {
      await settings.syncToServer();
    }
    if (progress.pendingSync) {
      await progress.syncToServer();
    }
  }, intervalMs);
}
