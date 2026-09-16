// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseLegacyCreatedTools } from '../lib/legacy-created-tools';

const tool = {
  id: 'legacy-1',
  userId: 'user-1',
  type: 'quiz',
  title: 'Fractions',
  content: '{"questions":[]}',
  topic: null,
  maestroId: null,
  conversationId: null,
  sessionId: null,
  userRating: null,
  isBookmarked: false,
  viewCount: 0,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
};

describe('legacy CreatedTool database contract', () => {
  it('preserves legacy nullable columns, dates and serialized content', () => {
    expect(parseLegacyCreatedTools([tool])).toEqual([tool]);
    expect(parseLegacyCreatedTools([])).toEqual([]);
  });

  it.each([null, undefined, {}, [null], [{ ...tool, userId: null }], [{ ...tool, content: {} }]])(
    'rejects malformed rows before material writes without exposing contents',
    (input) => {
      expect(() => parseLegacyCreatedTools(input)).toThrow('Invalid legacy CreatedTool records');
    },
  );
});
