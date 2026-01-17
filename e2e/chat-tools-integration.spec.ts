/**
 * E2E Tests: Chat Tools Integration
 *
 * Verifies that all educational tools work correctly when triggered
 * during a chat conversation with a Maestro.
 *
 * Tools tested:
 * - create_mindmap: Mind maps with hierarchical structure
 * - create_quiz: Multiple choice quizzes
 * - create_flashcards: Spaced repetition cards
 * - create_summary: Structured summaries
 * - create_diagram: Mermaid diagrams
 * - create_timeline: Historical timelines
 *
 * IMPORTANT: These tests require AI provider (Azure OpenAI or Ollama)
 * Run with: npm run test -- e2e/chat-tools-integration.spec.ts
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const AI_TIMEOUT = 60000;

interface MindmapNode {
  id: string;
  label: string;
  parentId?: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface FlashCard {
  front: string;
  back: string;
}

interface SummarySection {
  title: string;
  content: string;
  keyPoints?: string[];
}

interface TimelineEvent {
  date: string;
  title: string;
  description?: string;
}

interface ToolCallResult {
  content?: string;
  toolCalls?: Array<{
    id: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  hasTools?: boolean;
  error?: string;
  blocked?: boolean;
}

async function chatWithTools(
  request: APIRequestContext,
  maestroId: string,
  userMessage: string,
  requestedTool?: string
): Promise<ToolCallResult> {
  const maestriResponse = await request.get('/api/maestri');
  const maestri = await maestriResponse.json();
  const maestro = maestri.find((m: { id: string }) => m.id === maestroId);

  if (!maestro) {
    throw new Error(`Maestro ${maestroId} not found`);
  }

  const response = await request.post('/api/chat', {
    data: {
      messages: [{ role: 'user', content: userMessage }],
      systemPrompt: maestro.systemPrompt,
      maestroId,
      enableTools: true,
      enableMemory: false,
      requestedTool,
    },
    timeout: AI_TIMEOUT,
  });

  if (!response.ok()) {
    const errorData = await response.json();
    return { error: errorData.error || 'Request failed' };
  }

  return response.json();
}

function parseToolArgs<T>(toolCall: { function: { arguments: string } }): T {
  return JSON.parse(toolCall.function.arguments);
}

test.describe('Chat Tools: Mindmap @slow', () => {
  test('creates hierarchical mindmap on explicit request', async ({ request }) => {
    const result = await chatWithTools(
      request,
      'euclide-matematica',
      'Crea una mappa mentale sul teorema di Pitagora',
      'mindmap'
    );

    if (result.error?.includes('No AI provider')) {
      test.skip();
      return;
    }

    expect(result.hasTools || result.toolCalls?.length).toBeTruthy();

    if (result.toolCalls?.length) {
      const mindmapCall = result.toolCalls.find(
        tc => tc.function.name === 'create_mindmap'
      );
      expect(mindmapCall).toBeDefined();

      if (mindmapCall) {
        const args = parseToolArgs<{ title: string; nodes: MindmapNode[] }>(mindmapCall);
        expect(args.title).toBeTruthy();
        expect(args.nodes.length).toBeGreaterThan(0);
        const hasHierarchy = args.nodes.some(n => n.parentId);
        expect(hasHierarchy).toBeTruthy();
      }
    }
  });
});

test.describe('Chat Tools: Quiz @slow', () => {
  test('creates quiz with valid structure', async ({ request }) => {
    const result = await chatWithTools(
      request,
      'erodoto-storia',
      'Fammi un quiz sulla Rivoluzione Francese',
      'quiz'
    );

    if (result.error?.includes('No AI provider')) {
      test.skip();
      return;
    }

    expect(result.hasTools || result.toolCalls?.length).toBeTruthy();

    if (result.toolCalls?.length) {
      const quizCall = result.toolCalls.find(
        tc => tc.function.name === 'create_quiz'
      );
      expect(quizCall).toBeDefined();

      if (quizCall) {
        const args = parseToolArgs<{ topic: string; questions: QuizQuestion[] }>(quizCall);
        expect(args.topic).toBeTruthy();
        expect(args.questions.length).toBeGreaterThan(0);

        args.questions.forEach(q => {
          expect(q.question).toBeTruthy();
          expect(q.options.length).toBe(4);
          expect(q.correctIndex).toBeGreaterThanOrEqual(0);
          expect(q.correctIndex).toBeLessThan(4);
        });
      }
    }
  });
});

test.describe('Chat Tools: Flashcards @slow', () => {
  test('creates flashcards with front and back', async ({ request }) => {
    const result = await chatWithTools(
      request,
      'shakespeare-inglese',
      'Crea delle flashcard sui verbi irregolari inglesi',
      'flashcards'
    );

    if (result.error?.includes('No AI provider')) {
      test.skip();
      return;
    }

    expect(result.hasTools || result.toolCalls?.length).toBeTruthy();

    if (result.toolCalls?.length) {
      const flashcardCall = result.toolCalls.find(
        tc => tc.function.name === 'create_flashcards'
      );
      expect(flashcardCall).toBeDefined();

      if (flashcardCall) {
        const args = parseToolArgs<{ topic: string; cards: FlashCard[] }>(flashcardCall);
        expect(args.topic).toBeTruthy();
        expect(args.cards.length).toBeGreaterThan(0);

        args.cards.forEach(card => {
          expect(card.front).toBeTruthy();
          expect(card.back).toBeTruthy();
        });
      }
    }
  });
});

test.describe('Chat Tools: Summary @slow', () => {
  test('creates structured summary with sections', async ({ request }) => {
    const result = await chatWithTools(
      request,
      'manzoni-italiano',
      'Fammi un riassunto dei Promessi Sposi',
      'summary'
    );

    if (result.error?.includes('No AI provider')) {
      test.skip();
      return;
    }

    expect(result.hasTools || result.toolCalls?.length).toBeTruthy();

    if (result.toolCalls?.length) {
      const summaryCall = result.toolCalls.find(
        tc => tc.function.name === 'create_summary'
      );
      expect(summaryCall).toBeDefined();

      if (summaryCall) {
        const args = parseToolArgs<{ topic: string; sections: SummarySection[] }>(summaryCall);
        expect(args.topic).toBeTruthy();
        expect(args.sections.length).toBeGreaterThan(0);

        args.sections.forEach(section => {
          expect(section.title).toBeTruthy();
          expect(section.content).toBeTruthy();
        });
      }
    }
  });
});

test.describe('Chat Tools: Diagram @slow', () => {
  test('creates valid Mermaid diagram', async ({ request }) => {
    const result = await chatWithTools(
      request,
      'lovelace-informatica',
      'Crea un diagramma di flusso per un algoritmo di ordinamento',
      'diagram'
    );

    if (result.error?.includes('No AI provider')) {
      test.skip();
      return;
    }

    expect(result.hasTools || result.toolCalls?.length).toBeTruthy();

    if (result.toolCalls?.length) {
      const diagramCall = result.toolCalls.find(
        tc => tc.function.name === 'create_diagram'
      );
      expect(diagramCall).toBeDefined();

      if (diagramCall) {
        const args = parseToolArgs<{
          topic: string;
          diagramType: string;
          mermaidCode: string;
        }>(diagramCall);

        expect(args.topic).toBeTruthy();
        expect(['flowchart', 'sequence', 'class', 'er']).toContain(args.diagramType);
        expect(args.mermaidCode).toBeTruthy();
      }
    }
  });
});

test.describe('Chat Tools: Timeline @slow', () => {
  test('creates timeline with chronological events', async ({ request }) => {
    const result = await chatWithTools(
      request,
      'erodoto-storia',
      'Crea una linea del tempo della Seconda Guerra Mondiale',
      'timeline'
    );

    if (result.error?.includes('No AI provider')) {
      test.skip();
      return;
    }

    expect(result.hasTools || result.toolCalls?.length).toBeTruthy();

    if (result.toolCalls?.length) {
      const timelineCall = result.toolCalls.find(
        tc => tc.function.name === 'create_timeline'
      );
      expect(timelineCall).toBeDefined();

      if (timelineCall) {
        const args = parseToolArgs<{
          topic: string;
          period?: string;
          events: TimelineEvent[];
        }>(timelineCall);

        expect(args.topic).toBeTruthy();
        expect(args.events.length).toBeGreaterThan(0);

        args.events.forEach(event => {
          expect(event.date).toBeTruthy();
          expect(event.title).toBeTruthy();
        });
      }
    }
  });
});

test.describe('Chat Tools: Error Handling', () => {
  test('handles missing AI provider gracefully', async ({ request }) => {
    const result = await chatWithTools(
      request,
      'euclide-matematica',
      'Test message'
    );

    expect(result.content || result.error || result.toolCalls).toBeTruthy();
  });
});
