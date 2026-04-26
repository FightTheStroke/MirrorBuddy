import { create } from 'zustand';
import type { ToolType } from '@/types';

interface PendingToolRequest {
  tool: ToolType;
  maestroId: string;
}

interface PendingToolRequestState {
  pendingToolRequest: PendingToolRequest | null;
  setPendingToolRequest: (request: PendingToolRequest) => void;
  clearPendingToolRequest: () => void;
  hydrateLegacyPendingToolRequest: () => void;
}

export const usePendingToolRequestStore = create<PendingToolRequestState>((set) => ({
  pendingToolRequest: null,
  setPendingToolRequest: (request) => set({ pendingToolRequest: request }),
  clearPendingToolRequest: () => set({ pendingToolRequest: null }),
  hydrateLegacyPendingToolRequest: () => {
    if (typeof window === 'undefined') return;

    // Intentional compatibility shim: migrate pre-store session payload once, then clear it.
    const rawPendingRequest = window.sessionStorage.getItem('pendingToolRequest');
    if (!rawPendingRequest) return;

    try {
      const parsed = JSON.parse(rawPendingRequest);
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.tool === 'string' &&
        typeof parsed.maestroId === 'string'
      ) {
        set({
          pendingToolRequest: {
            tool: parsed.tool as ToolType,
            maestroId: parsed.maestroId,
          },
        });
      }
    } finally {
      window.sessionStorage.removeItem('pendingToolRequest');
    }
  },
}));
