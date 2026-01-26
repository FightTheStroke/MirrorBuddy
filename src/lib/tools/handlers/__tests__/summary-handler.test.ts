/**
 * Summary Handler Unit Tests
 *
 * Tests for the summary tool handler validation
 * Part of Issue #70: Real-time summary tool
 */

import { describe, it, expect, beforeAll } from "vitest";
import { validateSections } from "../summary-handler";
import { executeToolCall } from "../../tool-executor";
import type { StudentSummaryData, StudentSummarySection } from "@/types/tools";

// Type for student summary result data
interface StudentSummaryResultData extends Omit<
  StudentSummaryData,
  "sections"
> {
  type: "student_summary";
  sections: StudentSummarySection[];
}

// Type for comment result data
interface CommentResultData {
  type: "student_summary_comment";
  sectionId: string;
  startOffset: number;
  endOffset: number;
  text: string;
  maestroId: string;
  createdAt: Date;
}

// Type for create_summary result data
interface SummaryResultData {
  topic: string;
  sections: Array<{
    title: string;
    content: string;
    keyPoints?: string[];
  }>;
  length?: "short" | "medium" | "long";
}

// Register handlers
beforeAll(async () => {
  await import("../summary-handler");
});

describe("Summary Handler", () => {
  describe("create_summary", () => {
    const defaultContext = {
      sessionId: "test-session",
      maestroId: "test-maestro",
      userId: "test-user",
    };

    it("creates summary with valid sections", async () => {
      const result = await executeToolCall(
        "create_summary",
        {
          topic: "La Fotosintesi",
          sections: [
            {
              title: "Introduzione",
              content: "La fotosintesi è un processo biochimico",
              keyPoints: ["Avviene nelle foglie", "Richiede luce solare"],
            },
          ],
        },
        defaultContext,
      );
      const data = result.data as SummaryResultData;

      expect(result.success).toBe(true);
      expect(result.toolType).toBe("summary");
      expect(data.topic).toBe("La Fotosintesi");
      expect(data.sections).toHaveLength(1);
      expect(data.sections[0].title).toBe("Introduzione");
    });

    it("trims whitespace from topic and sections", async () => {
      const result = await executeToolCall(
        "create_summary",
        {
          topic: "  La Fotosintesi  ",
          sections: [
            {
              title: "  Introduzione  ",
              content: "  Contenuto  ",
              keyPoints: ["  Punto 1  ", "  Punto 2  "],
            },
          ],
        },
        defaultContext,
      );
      const data = result.data as SummaryResultData;

      expect(data.topic).toBe("La Fotosintesi");
      expect(data.sections[0].title).toBe("Introduzione");
      expect(data.sections[0].content).toBe("Contenuto");
      expect(data.sections[0].keyPoints).toEqual(["Punto 1", "Punto 2"]);
    });

    it("includes length parameter when provided", async () => {
      const result = await executeToolCall(
        "create_summary",
        {
          topic: "Test",
          sections: [{ title: "S1", content: "C1" }],
          length: "short",
        },
        defaultContext,
      );
      const data = result.data as SummaryResultData;

      expect(data.length).toBe("short");
    });

    it("returns error for missing topic", async () => {
      const result = await executeToolCall(
        "create_summary",
        {
          sections: [{ title: "S1", content: "C1" }],
        },
        defaultContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("topic");
    });

    it("returns error for invalid sections", async () => {
      const result = await executeToolCall(
        "create_summary",
        {
          topic: "Test",
          sections: [{ title: "Only title" }],
        },
        defaultContext,
      );

      expect(result.success).toBe(false);
      // Zod validation catches missing content
      expect(result.error).toContain("content");
    });

    it("returns error for empty sections array", async () => {
      const result = await executeToolCall(
        "create_summary",
        {
          topic: "Test",
          sections: [],
        },
        defaultContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("At least one section is required");
    });

    it("returns error for non-array keyPoints", async () => {
      const result = await executeToolCall(
        "create_summary",
        {
          topic: "Test",
          sections: [{ title: "S1", content: "C1", keyPoints: "not-an-array" }],
        },
        defaultContext,
      );

      expect(result.success).toBe(false);
      // Zod validation catches invalid keyPoints type
      expect(result.error).toContain("keyPoints");
    });

    it("handles multiple sections correctly", async () => {
      const result = await executeToolCall(
        "create_summary",
        {
          topic: "La Rivoluzione Francese",
          sections: [
            { title: "Cause", content: "Le cause della rivoluzione..." },
            {
              title: "Eventi",
              content: "Gli eventi principali...",
              keyPoints: ["1789", "1792"],
            },
            { title: "Conseguenze", content: "Le conseguenze..." },
          ],
          length: "long",
        },
        defaultContext,
      );
      const data = result.data as SummaryResultData;

      expect(result.success).toBe(true);
      expect(data.sections).toHaveLength(3);
      expect(data.sections[1].keyPoints).toEqual(["1789", "1792"]);
      expect(data.length).toBe("long");
    });
  });

  describe("validateSections", () => {
    it("returns invalid for empty sections array", () => {
      const result = validateSections([]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("At least one section is required");
    });

    it("returns invalid for null sections", () => {
      const result = validateSections(null as unknown as unknown[]);
      expect(result.valid).toBe(false);
    });

    it("returns invalid for section without title", () => {
      const sections = [{ content: "Some content" }];
      const result = validateSections(sections);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("title is required");
    });

    it("returns invalid for section without content", () => {
      const sections = [{ title: "Some title" }];
      const result = validateSections(sections);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("content is required");
    });

    it("returns invalid for non-string title", () => {
      const sections = [{ title: 123, content: "Content" }];
      const result = validateSections(sections);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("title is required");
    });

    it("returns invalid for non-string content", () => {
      const sections = [{ title: "Title", content: 123 }];
      const result = validateSections(sections);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("content is required");
    });

    it("returns invalid for non-array keyPoints", () => {
      const sections = [
        { title: "Title", content: "Content", keyPoints: "not an array" },
      ];
      const result = validateSections(sections);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("keyPoints must be an array");
    });

    it("returns valid for correct section structure", () => {
      const sections = [
        {
          title: "Section 1",
          content: "Content 1",
          keyPoints: ["Point 1", "Point 2"],
        },
      ];
      const result = validateSections(sections);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("returns valid for section without keyPoints", () => {
      const sections = [{ title: "Section 1", content: "Content 1" }];
      const result = validateSections(sections);
      expect(result.valid).toBe(true);
    });

    it("returns valid for multiple sections", () => {
      const sections = [
        { title: "Section 1", content: "Content 1" },
        { title: "Section 2", content: "Content 2", keyPoints: ["Point"] },
        { title: "Section 3", content: "Content 3" },
      ];
      const result = validateSections(sections);
      expect(result.valid).toBe(true);
    });

    it("reports correct section index in error", () => {
      const sections = [
        { title: "Valid", content: "Valid" },
        { title: "Missing content" },
      ];
      const result = validateSections(sections);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Section 2");
    });
  });

  describe("open_student_summary", () => {
    const defaultContext = {
      sessionId: "test-session",
      maestroId: "test-maestro",
      userId: "test-user",
    };

    it("creates empty student summary structure", async () => {
      const result = await executeToolCall(
        "open_student_summary",
        { topic: "La Fotosintesi" },
        defaultContext,
      );
      const data = result.data as StudentSummaryResultData;

      expect(result.success).toBe(true);
      expect(result.toolType).toBe("summary");
      expect(data).toBeDefined();
      expect(data.type).toBe("student_summary");
      expect(data.topic).toBe("La Fotosintesi");
    });

    it("creates sections with guiding questions", async () => {
      const result = await executeToolCall(
        "open_student_summary",
        { topic: "Test Topic" },
        defaultContext,
      );
      const data = result.data as StudentSummaryResultData;

      expect(data.sections).toHaveLength(3);
      expect(data.sections[0].heading).toBe("Introduzione");
      expect(data.sections[0].guidingQuestion).toBeDefined();
      expect(data.sections[1].heading).toBe("Sviluppo");
      expect(data.sections[2].heading).toBe("Conclusione");
    });

    it("returns error for missing topic", async () => {
      const result = await executeToolCall(
        "open_student_summary",
        {},
        defaultContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Tool execution failed for "open_student_summary"',
      );
      expect(result.error).toContain("topic");
    });

    it("passes maestroId from context", async () => {
      const result = await executeToolCall(
        "open_student_summary",
        { topic: "Test" },
        { maestroId: "prof-einstein", sessionId: "session-123" },
      );
      const data = result.data as StudentSummaryResultData;

      expect(data.maestroId).toBe("prof-einstein");
      expect(data.sessionId).toBe("session-123");
    });
  });

  describe("student_summary_add_comment", () => {
    const defaultContext = {
      sessionId: "test-session",
      maestroId: "test-maestro",
      userId: "test-user",
    };

    it("creates comment event", async () => {
      const result = await executeToolCall(
        "student_summary_add_comment",
        {
          sectionId: "intro",
          startOffset: 10,
          endOffset: 25,
          text: "Ottimo punto!",
        },
        defaultContext,
      );
      const data = result.data as CommentResultData;

      expect(result.success).toBe(true);
      expect(data.type).toBe("student_summary_comment");
      expect(data.sectionId).toBe("intro");
      expect(data.text).toBe("Ottimo punto!");
    });

    it("returns error for missing required fields", async () => {
      const result = await executeToolCall(
        "student_summary_add_comment",
        {
          sectionId: "intro",
          // missing startOffset, endOffset, text
        },
        defaultContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Tool execution failed for "student_summary_add_comment"',
      );
    });

    it("passes maestroId from context", async () => {
      const result = await executeToolCall(
        "student_summary_add_comment",
        { sectionId: "main", startOffset: 0, endOffset: 10, text: "Bravo!" },
        { maestroId: "coach-1", sessionId: "session-1" },
      );
      const data = result.data as CommentResultData;

      expect(data.maestroId).toBe("coach-1");
    });
  });
});
