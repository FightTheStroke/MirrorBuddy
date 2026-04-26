/**
 * Tests for Conversation Flow Store Helpers
 */

import { describe, it, expect } from 'vitest';
import {
  saveCurrentConversation,
  loadConversationMessages,
} from '../helpers';
import type { ConversationFlowState, FlowMessage, CharacterConversation } from '../types';

describe('conversation-flow-store helpers', () => {
  describe('saveCurrentConversation', () => {
    it('returns existing conversations when no active character', () => {
      const state = {
        activeCharacter: null,
        messages: [],
        conversationsByCharacter: { existing: {} as CharacterConversation },
      } as unknown as ConversationFlowState;

      const result = saveCurrentConversation(state);

      expect(result).toEqual({ existing: {} });
    });

    it('returns existing conversations when no messages', () => {
      const state: ConversationFlowState = {
        activeCharacter: {
          id: 'euclide',
          type: 'maestro',
          name: 'Euclide',
        },
        messages: [],
        conversationsByCharacter: {},
      } as unknown as ConversationFlowState;

      const result = saveCurrentConversation(state);

      expect(result).toEqual({});
    });

    it('saves messages to character bucket', () => {
      const messages: FlowMessage[] = [
        { id: 'm1', role: 'user', content: 'Hello', timestamp: new Date() },
        { id: 'm2', role: 'assistant', content: 'Hi!', timestamp: new Date() },
      ];

      const state: ConversationFlowState = {
        activeCharacter: {
          id: 'euclide',
          type: 'maestro',
          name: 'Euclide',
        },
        messages,
        conversationsByCharacter: {},
      } as unknown as ConversationFlowState;

      const result = saveCurrentConversation(state);

      expect(result.euclide).toBeDefined();
      expect(result.euclide.characterId).toBe('euclide');
      expect(result.euclide.characterType).toBe('maestro');
      expect(result.euclide.characterName).toBe('Euclide');
      expect(result.euclide.messages).toEqual(messages);
      expect(result.euclide.lastMessageAt).toBeInstanceOf(Date);
    });

    it('preserves existing conversation ID', () => {
      const existingConvo: CharacterConversation = {
        characterId: 'euclide',
        characterType: 'maestro',
        characterName: 'Euclide',
        messages: [],
        lastMessageAt: new Date(),
        conversationId: 'conv-123',
      };

      const state: ConversationFlowState = {
        activeCharacter: {
          id: 'euclide',
          type: 'maestro',
          name: 'Euclide',
        },
        messages: [{ id: 'm1', role: 'user', content: 'New msg', timestamp: new Date() }],
        conversationsByCharacter: { euclide: existingConvo },
      } as unknown as ConversationFlowState;

      const result = saveCurrentConversation(state);

      expect(result.euclide.conversationId).toBe('conv-123');
    });

    it('preserves other character conversations', () => {
      const otherConvo: CharacterConversation = {
        characterId: 'feynman',
        characterType: 'maestro',
        characterName: 'Feynman',
        messages: [{ id: 'f1', role: 'user', content: 'Physics', timestamp: new Date() }],
        lastMessageAt: new Date(),
      };

      const state: ConversationFlowState = {
        activeCharacter: {
          id: 'euclide',
          type: 'maestro',
          name: 'Euclide',
        },
        messages: [{ id: 'm1', role: 'user', content: 'Math', timestamp: new Date() }],
        conversationsByCharacter: { feynman: otherConvo },
      } as unknown as ConversationFlowState;

      const result = saveCurrentConversation(state);

      expect(result.feynman).toBeDefined();
      expect(result.feynman.characterId).toBe('feynman');
      expect(result.euclide).toBeDefined();
      expect(result.euclide.characterId).toBe('euclide');
    });
  });

  describe('loadConversationMessages', () => {
    it('returns messages for existing character', () => {
      const messages: FlowMessage[] = [
        { id: 'm1', role: 'user', content: 'Hello', timestamp: new Date() },
      ];

      const conversations: Record<string, CharacterConversation> = {
        euclide: {
          characterId: 'euclide',
          characterType: 'maestro',
          characterName: 'Euclide',
          messages,
          lastMessageAt: new Date(),
        },
      };

      const result = loadConversationMessages(conversations, 'euclide');

      expect(result).toEqual(messages);
    });

    it('returns empty array for non-existent character', () => {
      const conversations: Record<string, CharacterConversation> = {};

      const result = loadConversationMessages(conversations, 'unknown');

      expect(result).toEqual([]);
    });

    it('returns empty array when conversation has no messages', () => {
      const conversations: Record<string, CharacterConversation> = {
        euclide: {
          characterId: 'euclide',
          characterType: 'maestro',
          characterName: 'Euclide',
          messages: [],
          lastMessageAt: new Date(),
        },
      };

      const result = loadConversationMessages(conversations, 'euclide');

      expect(result).toEqual([]);
    });

    it('returns correct messages for multiple characters', () => {
      const euclideMessages: FlowMessage[] = [
        { id: 'm1', role: 'user', content: 'Math', timestamp: new Date() },
      ];
      const feynmanMessages: FlowMessage[] = [
        { id: 'm2', role: 'user', content: 'Physics', timestamp: new Date() },
      ];

      const conversations: Record<string, CharacterConversation> = {
        euclide: {
          characterId: 'euclide',
          characterType: 'maestro',
          characterName: 'Euclide',
          messages: euclideMessages,
          lastMessageAt: new Date(),
        },
        feynman: {
          characterId: 'feynman',
          characterType: 'maestro',
          characterName: 'Feynman',
          messages: feynmanMessages,
          lastMessageAt: new Date(),
        },
      };

      expect(loadConversationMessages(conversations, 'euclide')).toEqual(euclideMessages);
      expect(loadConversationMessages(conversations, 'feynman')).toEqual(feynmanMessages);
    });
  });
});
