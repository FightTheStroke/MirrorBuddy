import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { useMaterialContent } from '../use-material-content';
import type { ToolCall } from '@/types/tools';

function tool(type: ToolCall['type'], data: Record<string, unknown>): ToolCall {
  return {
    id: 'tool-1',
    type,
    name: `create_${type}`,
    arguments: data,
    status: 'completed',
    result: { success: true, data },
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('material titles at the rendering and auto-save boundary', () => {
  it.each([
    { type: 'flashcard' as const, key: 'name', content: { cards: [{ front: '2+2', back: '4' }] } },
    { type: 'quiz' as const, key: 'title', content: { questions: [] } },
  ])(
    'uses the generated $type topic instead of omitting the save title',
    async ({ type, key, content }) => {
      const input = tool(type, { topic: 'Fractions', ...content });
      const { result } = renderHook(() => useMaterialContent(input));

      await waitFor(() => expect(result.current.data?.[key]).toBe('Fractions'));
      const payload = JSON.parse(
        JSON.stringify({
          toolId: input.id,
          toolType: type,
          title: result.current.data?.[key],
          content,
        }),
      );
      expect(payload).toHaveProperty('title', 'Fractions');
      expect(result.current.data?.topic).toBe('Fractions');
      expect(input.result?.data).not.toHaveProperty(key);
    },
  );

  it('preserves an explicit title instead of replacing it with the topic', async () => {
    const input = tool('quiz', { topic: 'Fractions', title: 'Practice', questions: [] });
    const { result } = renderHook(() => useMaterialContent(input));
    await waitFor(() => expect(result.current.data?.title).toBe('Practice'));
  });

  it('restores the saved material title when content contains only cards', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            material: { title: 'Saved fractions', subject: 'mathematics', content: { cards: [] } },
          }),
        ),
      ),
    );
    const input = {
      id: 'tool-1',
      type: 'flashcard' as const,
      name: 'create_flashcards',
      status: 'completed' as const,
    };
    const { result } = renderHook(() => useMaterialContent(input));
    await waitFor(() => expect(result.current.data?.name).toBe('Saved fractions'));
    expect(result.current.data?.subject).toBe('mathematics');
  });

  it('does not fabricate a title when no original title exists', async () => {
    const input = tool('flashcard', { cards: [] });
    const { result } = renderHook(() => useMaterialContent(input));
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data).not.toHaveProperty('name');
  });
});
