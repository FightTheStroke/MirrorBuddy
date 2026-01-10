// ============================================================================
// CONVERSATION STORE - Chat history and message management
// ============================================================================

import { create } from 'zustand';
import { logger } from '@/lib/logger';
import type { Conversation, ChatMessage } from '@/types';

// === STORE ===

interface ConversationState {
  conversations: Conversation[];
  currentConversationId: string | null;
  // Sync state
  lastSyncedAt: Date | null;
  pendingSync: boolean;
  // Actions
  createConversation: (maestroId?: string) => Promise<string>;
  addMessage: (conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<void>;
  setCurrentConversation: (id: string | null) => void;
  deleteConversation: (id: string) => Promise<void>;
  clearConversations: () => void;
  // Sync actions
  syncToServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
}

export const useConversationStore = create<ConversationState>()(
  (set) => ({
      conversations: [],
      currentConversationId: null,
      lastSyncedAt: null,
      pendingSync: false,

      createConversation: async (maestroId) => {
        const tempId = crypto.randomUUID();
        const conversation: Conversation = {
          id: tempId,
          title: 'New Conversation',
          messages: [],
          maestroId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Optimistic update
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          currentConversationId: tempId,
        }));

        // Sync to server
        try {
          const response = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ maestroId }),
          });

          if (response.ok) {
            const serverConv = await response.json();
            // Update with server ID
            set((state) => ({
              conversations: state.conversations.map((c) =>
                c.id === tempId ? { ...c, id: serverConv.id } : c
              ),
              currentConversationId:
                state.currentConversationId === tempId
                  ? serverConv.id
                  : state.currentConversationId,
            }));
            return serverConv.id;
          }
        } catch (error) {
          logger.error('Failed to create conversation on server', { error: String(error) });
        }

        return tempId;
      },

      addMessage: async (conversationId, message) => {
        const messageWithId = {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        };

        // Optimistic update
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, messageWithId],
                  updatedAt: new Date(),
                  title:
                    conv.messages.length === 0 && message.role === 'user'
                      ? message.content.slice(0, 50)
                      : conv.title,
                }
              : conv
          ),
          pendingSync: true,
        }));

        // Sync to server
        try {
          await fetch(`/api/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: message.role,
              content: message.content,
              toolCalls: (message as { toolCalls?: unknown }).toolCalls,
            }),
          });
        } catch (error) {
          logger.error('Failed to add message to server', { error: String(error) });
        }
      },

      setCurrentConversation: (id) => set({ currentConversationId: id }),

      deleteConversation: async (id) => {
        // Optimistic update
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          currentConversationId:
            state.currentConversationId === id
              ? null
              : state.currentConversationId,
        }));

        // Sync to server
        try {
          await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
        } catch (error) {
          logger.error('Failed to delete conversation on server', { error: String(error) });
        }
      },

      clearConversations: () =>
        set({ conversations: [], currentConversationId: null }),

      syncToServer: async () => {
        // Conversations are synced immediately on each action
        set({ lastSyncedAt: new Date(), pendingSync: false });
      },

      loadFromServer: async () => {
        try {
          const response = await fetch('/api/conversations?limit=50');

          // No user cookie yet (pre-onboarding), not an error
          if (response.status === 401) {
            return;
          }

          if (response.ok) {
            const data = await response.json();
            const items = data.items || [];
            set({
              conversations: items.map((c: {
                id: string;
                title: string;
                maestroId: string;
                createdAt: string;
                updatedAt: string;
                lastMessage?: string;
              }) => ({
                ...c,
                messages: [], // Messages are loaded on-demand
                createdAt: new Date(c.createdAt),
                updatedAt: new Date(c.updatedAt),
              })),
              lastSyncedAt: new Date(),
              pendingSync: false,
            });
          }
        } catch (error) {
          logger.error('Conversations load failed', { error: String(error) });
        }
      },
    })
);
