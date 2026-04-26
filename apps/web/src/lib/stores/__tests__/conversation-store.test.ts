import { describe, expect, it } from 'vitest';
import { useConversationStore } from '../conversation-store';

describe('conversation-store', () => {
  it('starts with empty state', () => {
    const state = useConversationStore.getState();
    expect(state.conversations).toEqual([]);
    expect(state.currentConversationId).toBeNull();
  });
});
