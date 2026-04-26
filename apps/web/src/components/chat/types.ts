import type { Maestro, ChatMessage, ToolCall } from '@/types';

export interface ChatSessionProps {
  maestro: Maestro;
  onClose: () => void;
  onSwitchToVoice?: () => void;
}

export type { ChatMessage, ToolCall, Maestro };
