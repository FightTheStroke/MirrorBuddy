// ============================================================================
// UI STORE - Application UI state and focus mode
// ============================================================================

import { create } from 'zustand';
import type { ToolState, ToolType } from '@/types/tools';

// === TYPES ===

interface EnterFocusModeOptions {
  toolType: ToolType;
  maestroId?: string;
  interactionMode?: 'voice' | 'chat';
  /** Initial tool to display - prevents race condition when tool already exists */
  initialTool?: ToolState;
}

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
  enterFocusMode: (options: EnterFocusModeOptions) => void;
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
  enterFocusMode: ({ toolType, maestroId, interactionMode = 'chat', initialTool }) => set({
    focusMode: true,
    focusToolType: toolType,
    focusMaestroId: maestroId || null,
    focusInteractionMode: interactionMode,
    focusTool: initialTool || null, // Set tool atomically to prevent race condition
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
