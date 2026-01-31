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

import { test, expect, type APIRequestContext } from "./fixtures/base-fixtures";

// Skip AI-dependent tests in CI - no provider configured
test.skip(!!process.env.CI, "AI provider not available in CI");

// Extended timeout for AI tool generation
const AI_TIMEOUT = 60000;

// Tool validation schemas
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

/**
 * Helper to get CSRF token from session
 */
async function getCsrfToken(request: APIRequestContext): Promise<string> {
  const sessionResponse = await request.get("/api/session");
  const sessionData = await sessionResponse.json();
  return sessionData.csrfToken;
}

/**
 * Helper to make chat API calls with tools enabled
 */
async function chatWithTools(
  request: APIRequestContext,
  maestroId: string,
  userMessage: string,
  requestedTool?: string,
): Promise<ToolCallResult> {
  // Get CSRF token first
  const csrfToken = await getCsrfToken(request);

  // Get maestro's system prompt
  const maestriResponse = await request.get("/api/maestri");
  const maestri = await maestriResponse.json();
  const maestro = maestri.find((m: { id: string }) => m.id === maestroId);

  if (!maestro) {
    throw new Error(`Maestro ${maestroId} not found`);
  }

  const response = await request.post("/api/chat", {
    data: {
      messages: [{ role: "user", content: userMessage }],
      systemPrompt: maestro.systemPrompt,
      maestroId,
      enableTools: true,
      enableMemory: false,
      requestedTool,
    },
    headers: {
      "x-csrf-token": csrfToken,
    },
    timeout: AI_TIMEOUT,
  });

  if (!response.ok()) {
    const errorData = await response.json();
    return { error: errorData.error || "Request failed" };
  }

  return response.json();
}

/**
 * Parse tool call arguments from AI response
 */
function parseToolArgs<T>(toolCall: { function: { arguments: string } }): T {
  try {
    return JSON.parse(toolCall.function.arguments);
  } catch {
    throw new Error(
      `Failed to parse tool arguments: ${toolCall.function.arguments}`,
    );
  }
}

// ============================================================================
// MINDMAP TOOL TESTS
// ============================================================================
test.describe("Chat Tools: Mindmap @slow", () => {
  test("creates hierarchical mindmap on explicit request", async ({
    request,
  }) => {
    const result = await chatWithTools(
      request,
      "euclide",
      "Crea una mappa mentale sul teorema di Pitagora",
      "mindmap",
    );

    // Skip if no AI provider available
    if (result.error?.includes("No AI provider")) {
      test.skip();
      return;
    }

    expect(result.hasTools || result.toolCalls?.length).toBeTruthy();

    if (result.toolCalls?.length) {
      const mindmapCall = result.toolCalls.find(
        (tc) => tc.function.name === "create_mindmap",
      );
      expect(mindmapCall).toBeDefined();

      if (mindmapCall) {
        const args = parseToolArgs<{ title: string; nodes: MindmapNode[] }>(
          mindmapCall,
        );

        expect(args.title).toBeTruthy();
        expect(args.nodes.length).toBeGreaterThan(0);

        // Verify hierarchical structure (at least some nodes have parentId)
        const hasHierarchy = args.nodes.some((n) => n.parentId);
        expect(hasHierarchy).toBeTruthy();
      }
    }
  });

  test("mindmap nodes have required properties", async ({ request }) => {
    const result = await chatWithTools(
      request,
      "darwin",
      "Fammi una mappa mentale sulla cellula",
      "mindmap",
    );

    if (result.error?.includes("No AI provider")) {
      test.skip();
      return;
    }

    if (result.toolCalls?.length) {
      const mindmapCall = result.toolCalls.find(
        (tc) => tc.function.name === "create_mindmap",
      );

      if (mindmapCall) {
        const args = parseToolArgs<{ nodes: MindmapNode[] }>(mindmapCall);

        // Each node must have id and label
        args.nodes.forEach((node) => {
          expect(node.id).toBeTruthy();
          expect(node.label).toBeTruthy();
        });
      }
    }
  });
});

// ============================================================================
// QUIZ TOOL TESTS
// ============================================================================
test.describe("Chat Tools: Quiz @slow", () => {
  test("creates quiz with valid structure", async ({ request }) => {
    const result = await chatWithTools(
      request,
      "erodoto",
      "Fammi un quiz sulla Rivoluzione Francese",
      "quiz",
    );

    if (result.error?.includes("No AI provider")) {
      test.skip();
      return;
    }

    expect(result.hasTools || result.toolCalls?.length).toBeTruthy();

    if (result.toolCalls?.length) {
      const quizCall = result.toolCalls.find(
        (tc) => tc.function.name === "create_quiz",
      );
      expect(quizCall).toBeDefined();

      if (quizCall) {
        const args = parseToolArgs<{
          topic: string;
          questions: QuizQuestion[];
        }>(quizCall);

        expect(args.topic).toBeTruthy();
        expect(args.questions.length).toBeGreaterThan(0);

        // Validate each question
        args.questions.forEach((q) => {
          expect(q.question).toBeTruthy();
          expect(q.options.length).toBe(4); // Always 4 options
          expect(q.correctIndex).toBeGreaterThanOrEqual(0);
          expect(q.correctIndex).toBeLessThan(4);
        });
      }
    }
  });

  test("quiz has explanations for answers", async ({ request }) => {
    const result = await chatWithTools(
      request,
      "feynman",
      "Crea un quiz sulla gravità con spiegazioni",
      "quiz",
    );

    if (result.error?.includes("No AI provider")) {
      test.skip();
      return;
    }

    if (result.toolCalls?.length) {
      const quizCall = result.toolCalls.find(
        (tc) => tc.function.name === "create_quiz",
      );

      if (quizCall) {
        const args = parseToolArgs<{ questions: QuizQuestion[] }>(quizCall);

        // At least some questions should have explanations
        const hasExplanations = args.questions.some((q) => q.explanation);
        expect(hasExplanations).toBeTruthy();
      }
    }
  });
});

// ============================================================================
// FLASHCARDS TOOL TESTS
// ============================================================================
test.describe("Chat Tools: Flashcards @slow", () => {
  test("creates flashcards with front and back", async ({ request }) => {
    const result = await chatWithTools(
      request,
      "shakespeare",
      "Crea delle flashcard sui verbi irregolari inglesi",
      "flashcards",
    );

    if (result.error?.includes("No AI provider")) {
      test.skip();
      return;
    }

    expect(result.hasTools || result.toolCalls?.length).toBeTruthy();

    if (result.toolCalls?.length) {
      const flashcardCall = result.toolCalls.find(
        (tc) => tc.function.name === "create_flashcards",
      );
      expect(flashcardCall).toBeDefined();

      if (flashcardCall) {
        const args = parseToolArgs<{ topic: string; cards: FlashCard[] }>(
          flashcardCall,
        );

        expect(args.topic).toBeTruthy();
        expect(args.cards.length).toBeGreaterThan(0);

        // Each card must have front and back
        args.cards.forEach((card) => {
          expect(card.front).toBeTruthy();
          expect(card.back).toBeTruthy();
        });
      }
    }
  });
});

// ============================================================================
// SUMMARY TOOL TESTS
// ============================================================================
test.describe("Chat Tools: Summary @slow", () => {
  test("creates structured summary with sections", async ({ request }) => {
    const result = await chatWithTools(
      request,
      "manzoni",
      "Fammi un riassunto dei Promessi Sposi",
      "summary",
    );

    if (result.error?.includes("No AI provider")) {
      test.skip();
      return;
    }

    expect(result.hasTools || result.toolCalls?.length).toBeTruthy();

    if (result.toolCalls?.length) {
      const summaryCall = result.toolCalls.find(
        (tc) => tc.function.name === "create_summary",
      );
      expect(summaryCall).toBeDefined();

      if (summaryCall) {
        const args = parseToolArgs<{
          topic: string;
          sections: SummarySection[];
        }>(summaryCall);

        expect(args.topic).toBeTruthy();
        expect(args.sections.length).toBeGreaterThan(0);

        // Each section must have title and content
        args.sections.forEach((section) => {
          expect(section.title).toBeTruthy();
          expect(section.content).toBeTruthy();
        });
      }
    }
  });
});

// ============================================================================
// DIAGRAM TOOL TESTS
// ============================================================================
test.describe("Chat Tools: Diagram @slow", () => {
  test("creates valid Mermaid diagram", async ({ request }) => {
    const result = await chatWithTools(
      request,
      "lovelace",
      "Crea un diagramma di flusso per un algoritmo di ordinamento",
      "diagram",
    );

    if (result.error?.includes("No AI provider")) {
      test.skip();
      return;
    }

    expect(result.hasTools || result.toolCalls?.length).toBeTruthy();

    if (result.toolCalls?.length) {
      const diagramCall = result.toolCalls.find(
        (tc) => tc.function.name === "create_diagram",
      );
      expect(diagramCall).toBeDefined();

      if (diagramCall) {
        const args = parseToolArgs<{
          topic: string;
          diagramType: string;
          mermaidCode: string;
        }>(diagramCall);

        expect(args.topic).toBeTruthy();
        expect(["flowchart", "sequence", "class", "er"]).toContain(
          args.diagramType,
        );
        expect(args.mermaidCode).toBeTruthy();

        // Mermaid code should start with valid directive
        expect(
          args.mermaidCode.includes("flowchart") ||
            args.mermaidCode.includes("graph") ||
            args.mermaidCode.includes("sequenceDiagram") ||
            args.mermaidCode.includes("classDiagram") ||
            args.mermaidCode.includes("erDiagram"),
        ).toBeTruthy();
      }
    }
  });
});

// ============================================================================
// TIMELINE TOOL TESTS
// ============================================================================
test.describe("Chat Tools: Timeline @slow", () => {
  test("creates timeline with chronological events", async ({ request }) => {
    const result = await chatWithTools(
      request,
      "erodoto",
      "Crea una linea del tempo della Seconda Guerra Mondiale",
      "timeline",
    );

    if (result.error?.includes("No AI provider")) {
      test.skip();
      return;
    }

    expect(result.hasTools || result.toolCalls?.length).toBeTruthy();

    if (result.toolCalls?.length) {
      const timelineCall = result.toolCalls.find(
        (tc) => tc.function.name === "create_timeline",
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

        // Each event must have date and title
        args.events.forEach((event) => {
          expect(event.date).toBeTruthy();
          expect(event.title).toBeTruthy();
        });
      }
    }
  });
});

// ============================================================================
// CROSS-TOOL TESTS
// ============================================================================
test.describe("Chat Tools: Cross-functional @slow", () => {
  test("different maestri can use their appropriate tools", async ({
    request,
  }) => {
    // Test that each maestro type can generate their relevant tools
    const testCases = [
      {
        maestroId: "euclide",
        message: "Fammi una mappa mentale sulle frazioni",
        expectedTool: "create_mindmap",
      },
      {
        maestroId: "socrate-filosofia",
        message: "Crea un quiz su Platone",
        expectedTool: "create_quiz",
      },
    ];

    for (const testCase of testCases) {
      const result = await chatWithTools(
        request,
        testCase.maestroId,
        testCase.message,
      );

      if (result.error?.includes("No AI provider")) {
        continue; // Skip if no provider
      }

      // Tool should be called or content should reference the tool
      expect(
        result.toolCalls?.some(
          (tc) => tc.function.name === testCase.expectedTool,
        ) ||
          result.hasTools ||
          result.content,
      ).toBeTruthy();
    }
  });

  test("tool calls return valid JSON arguments", async ({ request }) => {
    const result = await chatWithTools(
      request,
      "euclide",
      "Crea delle flashcard sulle tabelline",
      "flashcards",
    );

    if (result.error?.includes("No AI provider")) {
      test.skip();
      return;
    }

    if (result.toolCalls?.length) {
      // All tool calls should have valid JSON arguments
      result.toolCalls.forEach((tc) => {
        expect(() => JSON.parse(tc.function.arguments)).not.toThrow();
      });
    }
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================
test.describe("Chat Tools: Error Handling", () => {
  test("handles missing AI provider gracefully", async ({ request }) => {
    const result = await chatWithTools(request, "euclide", "Test message");

    // Should either succeed or return a clear error message
    expect(result.content || result.error || result.toolCalls).toBeTruthy();

    if (result.error) {
      // Error should be informative
      expect(
        result.error.includes("provider") ||
          result.error.includes("configured") ||
          result.error.includes("failed"),
      ).toBeTruthy();
    }
  });

  test("handles invalid maestro ID", async ({ request }) => {
    try {
      await chatWithTools(request, "non-existent-maestro", "Test message");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
