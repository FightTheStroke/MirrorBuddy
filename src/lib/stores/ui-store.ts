// ============================================================================
// UI STORE - Application UI state and focus mode
// ============================================================================

import { create } from 'zustand';
import type { ToolState, ToolType } from '@/types/tools';

// === STORE ===

interface UIState {
  sidebarOpen: boolean;
  settingsOpen: boolean;
  currentView: 'maestri' | 'chat' | 'voice' | 'quiz' | 'flashcards' | 'homework' | 'progress';
  // Focus Mode - fullscreen tool view
  focusMode: boolean;
  focusTool: ToolState | null;
  focusToolType: ToolType | null;
  focusMaestroId: string | null;
  focusInteractionMode: 'voice' | 'chat';
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSettings: () => void;
  setCurrentView: (view: UIState['currentView']) => void;
  // Focus Mode Actions
  enterFocusMode: (toolType: ToolType, maestroId?: string, interactionMode?: 'voice' | 'chat') => void;
  setFocusTool: (tool: ToolState | null) => void;
  exitFocusMode: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  settingsOpen: false,
  currentView: 'maestri',
  focusMode: false,
  focusTool: null,
  focusToolType: null,
  focusMaestroId: null,
  focusInteractionMode: 'chat',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),
  setCurrentView: (currentView) => set({ currentView }),
  enterFocusMode: (toolType, maestroId, interactionMode = 'chat') => set({
    focusMode: true,
    focusToolType: toolType,
    focusMaestroId: maestroId || null,
    focusInteractionMode: interactionMode,
    focusTool: null, // Will be set when tool is created
  }),
  setFocusTool: (tool) => set({ focusTool: tool }),
  exitFocusMode: () => set({
    focusMode: false,
    focusTool: null,
    focusToolType: null,
    focusMaestroId: null,
    focusInteractionMode: 'chat',
  }),
}));
