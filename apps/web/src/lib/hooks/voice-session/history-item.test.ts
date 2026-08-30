import { describe, expect, it } from 'vitest';
import { contentTypeForRole, historyItemEvent } from './history-item';

describe('replaying an earlier exchange into a voice session', () => {
  it("labels the child's words as input", () => {
    expect(contentTypeForRole('user')).toBe('input_text');
  });

  it("labels the Maestro's words as output", () => {
    expect(contentTypeForRole('assistant')).toBe('output_text');
  });

  it('rebuilds a question the child asked', () => {
    expect(historyItemEvent({ role: 'user', content: 'Quanto fa sette per otto?' })).toEqual({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'Quanto fa sette per otto?' }],
      },
    });
  });

  it('rebuilds an answer the Maestro gave, so the session is not rejected', () => {
    expect(historyItemEvent({ role: 'assistant', content: 'Cinquantasei.' })).toEqual({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: 'Cinquantasei.' }],
      },
    });
  });
});
