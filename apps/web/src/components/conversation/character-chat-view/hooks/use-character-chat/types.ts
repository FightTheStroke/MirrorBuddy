/**
 * Types for use-character-chat hook
 */

import type { ToolType, ToolState } from '@/types/tools';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
  /**
   * Raw internal safety-filter category when this message is a safety block
   * (F-06). Drives the SafetyBlockExplanation shown to the student.
   */
  safetyCategory?: string;
}

export interface ChatState {
  messages: Message[];
  input: string;
  isLoading: boolean;
  isVoiceActive: boolean;
  isConnected: boolean;
  connectionState: string;
  configError: string | null;
  activeTool: ToolState | null;
}

export interface ChatActions {
  setInput: (input: string) => void;
  setActiveTool: (tool: ToolState | null) => void;
  handleSend: () => Promise<void>;
  handleToolRequest: (toolType: ToolType) => Promise<void>;
  handleVoiceCall: () => void;
}
