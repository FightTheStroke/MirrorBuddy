import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToolCall } from '@/types';
import { ToolContent } from '../tool-content-renderers';

const { quiz, flashcard } = vi.hoisted(() => ({
  quiz: vi.fn((_props: { request: Record<string, unknown>; toolId: string }) => null),
  flashcard: vi.fn((_props: { request: Record<string, unknown>; toolId: string }) => null),
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('../diagram-renderer', () => ({ DiagramRenderer: () => null }));
vi.mock('../formula-renderer', () => ({ FormulaRenderer: () => null }));
vi.mock('../calculator-renderer', () => ({ CalculatorRenderer: () => null }));
vi.mock('../auto-save-wrappers', () => ({
  AutoSaveQuiz: quiz,
  AutoSaveFlashcard: flashcard,
  AutoSaveMindmap: () => null,
  AutoSaveSummary: () => null,
  AutoSaveDemo: () => null,
}));

describe('generated material titles in the public tool renderer', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it.each(
    [
      { type: 'quiz' as const, key: 'title', content: { questions: [] } },
      {
        type: 'flashcard' as const,
        key: 'name',
        content: { cards: [{ front: '2+2', back: '4' }] },
      },
    ].flatMap((tool) => [undefined, '', ' \t\n '].map((title) => ({ ...tool, title }))),
  )('uses the $type topic when its title is $title', ({ type, key, content, title }) => {
    const toolCall: ToolCall = {
      id: `generated-${type}`,
      name: `create_${type}`,
      type,
      status: 'completed',
      arguments: {},
      result: { success: true, data: { topic: 'Fractions', [key]: title, ...content } },
    };

    render(<ToolContent toolCall={toolCall} />);

    const props = (type === 'quiz' ? quiz : flashcard).mock.calls[0][0];
    expect(props.request[key]).toBe('Fractions');
    expect(props.request).toMatchObject(content);
    expect(props.toolId).toBe(toolCall.id);
    expect(
      JSON.parse(
        JSON.stringify({
          toolId: props.toolId,
          toolType: type,
          title: props.request[key],
          content,
        }),
      ),
    ).toHaveProperty('title', 'Fractions');
  });

  it('preserves an explicit quiz title rather than replacing it with the topic', () => {
    render(
      <ToolContent
        toolCall={{
          id: 'named-quiz',
          name: 'create_quiz',
          type: 'quiz',
          status: 'completed',
          arguments: {},
          result: {
            success: true,
            data: { title: 'Revision', topic: 'Fractions', questions: [] },
          },
        }}
      />,
    );

    expect(quiz.mock.calls[0][0].request.title).toBe('Revision');
  });
});
