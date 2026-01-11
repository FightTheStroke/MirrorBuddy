/**
 * @file types.ts
 * @brief Types for conversation drawer components
 */

export interface ConversationSummary {
  id: string;
  title: string | null;
  createdAt: Date;
  lastMessageAt: Date | null;
  messageCount: number;
  preview?: string;
}

export interface ConversationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characterId: string;
  characterType: 'maestro' | 'coach' | 'buddy';
  characterColor?: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
}

export type DateGroup = 'oggi' | 'ieri' | 'settimana' | 'mese' | 'vecchie';
