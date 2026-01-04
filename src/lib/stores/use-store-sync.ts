// ============================================================================
// STORE SYNC HOOK - Initialize and auto-sync stores with server
// ============================================================================

import { useSettingsStore } from './settings-store';
import { useProgressStore } from './progress-store';
import { useConversationStore } from './conversation-store';
import { useLearningsStore } from './learnings-store';

/**
 * Initialize all stores by loading data from server
 * Call this once on app startup
 */
export async function initializeStores() {
  // Ensure user exists (creates cookie if needed)
  await fetch('/api/user');

  // Load data from server
  await Promise.all([
    useSettingsStore.getState().loadFromServer(),
    useProgressStore.getState().loadFromServer(),
    useConversationStore.getState().loadFromServer(),
    useLearningsStore.getState().loadFromServer(),
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
