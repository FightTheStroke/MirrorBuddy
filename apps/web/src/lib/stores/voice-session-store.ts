// ============================================================================
// VOICE SESSION STORE - Real-time voice interaction state
// ============================================================================

import { create } from 'zustand';
import type { Maestro, ToolCall } from '@/types';

// === TYPES ===

interface VoiceSessionState {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  currentMaestro: Maestro | null;
  transcript: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>;
  toolCalls: ToolCall[];
  inputLevel: number;
  outputLevel: number;
  safetyWarning: string | null;
  // Actions
  setConnected: (connected: boolean) => void;
  setListening: (listening: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  setMuted: (muted: boolean) => void;
  setCurrentMaestro: (maestro: Maestro | null) => void;
  addTranscript: (role: 'user' | 'assistant', content: string) => void;
  clearTranscript: () => void;
  addToolCall: (toolCall: ToolCall) => void;
  updateToolCall: (id: string, updates: Partial<ToolCall>) => void;
  clearToolCalls: () => void;
  setInputLevel: (level: number) => void;
  setOutputLevel: (level: number) => void;
  /** Set safety warning with optional auto-clear timeout (default 5000ms) */
  setSafetyWarning: (message: string, timeoutMs?: number) => void;
  /** Clear safety warning immediately */
  clearSafetyWarning: () => void;
  /** Switch character: update maestro, clear transcript/tools, keep connection */
  switchCharacter: (maestro: Maestro) => void;
  reset: () => void;
}

// === STORE ===

// Timeout ref for auto-clearing safety warnings
let safetyWarningTimeout: NodeJS.Timeout | null = null;

export const useVoiceSessionStore = create<VoiceSessionState>((set) => ({
  isConnected: false,
  isListening: false,
  isSpeaking: false,
  isMuted: false,
  currentMaestro: null,
  transcript: [],
  toolCalls: [],
  inputLevel: 0,
  outputLevel: 0,
  safetyWarning: null,

  setConnected: (isConnected) => set({ isConnected }),
  setListening: (isListening) => set({ isListening }),
  setSpeaking: (isSpeaking) => set({ isSpeaking }),
  setMuted: (isMuted) => set({ isMuted }),
  setCurrentMaestro: (currentMaestro) => set({ currentMaestro }),
  addTranscript: (role, content) =>
    set((state) => ({
      // Cap at 100 entries to prevent unbounded memory growth
      transcript: [...state.transcript, { role, content, timestamp: new Date() }].slice(-100),
    })),
  clearTranscript: () => set({ transcript: [] }),
  addToolCall: (toolCall) =>
    set((state) => ({
      // Cap at 50 tool calls to prevent unbounded memory growth
      toolCalls: [...state.toolCalls, toolCall].slice(-50),
    })),
  updateToolCall: (id, updates) =>
    set((state) => ({
      toolCalls: state.toolCalls.map((tc) => (tc.id === id ? { ...tc, ...updates } : tc)),
    })),
  clearToolCalls: () => set({ toolCalls: [] }),
  setInputLevel: (inputLevel) => set({ inputLevel }),
  setOutputLevel: (outputLevel) => set({ outputLevel }),
  setSafetyWarning: (message, timeoutMs = 5000) => {
    // Clear any existing timeout to prevent memory leaks
    if (safetyWarningTimeout) {
      clearTimeout(safetyWarningTimeout);
      safetyWarningTimeout = null;
    }
    // Set the warning
    set({ safetyWarning: message });
    // Auto-clear after timeout
    safetyWarningTimeout = setTimeout(() => {
      set({ safetyWarning: null });
      safetyWarningTimeout = null;
    }, timeoutMs);
  },
  clearSafetyWarning: () => {
    // Clear timeout if exists
    if (safetyWarningTimeout) {
      clearTimeout(safetyWarningTimeout);
      safetyWarningTimeout = null;
    }
    set({ safetyWarning: null });
  },
  switchCharacter: (maestro) =>
    set({
      currentMaestro: maestro,
      transcript: [],
      toolCalls: [],
      isSpeaking: false,
      isListening: false,
      safetyWarning: null,
    }),
  reset: () => {
    // Clear timeout on reset
    if (safetyWarningTimeout) {
      clearTimeout(safetyWarningTimeout);
      safetyWarningTimeout = null;
    }
    set({
      isConnected: false,
      isListening: false,
      isSpeaking: false,
      isMuted: false,
      currentMaestro: null,
      transcript: [],
      toolCalls: [],
      inputLevel: 0,
      outputLevel: 0,
      safetyWarning: null,
    });
  },
}));
