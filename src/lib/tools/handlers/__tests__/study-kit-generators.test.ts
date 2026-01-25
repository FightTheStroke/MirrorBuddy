/**
 * Study Kit Generators Tests
 *
 * Tests for AI-powered generation of study materials.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateSummary,
  generateMindmap,
  generateDemo,
  generateQuiz,
  processStudyKit,
} from "../study-kit-generators";

// Mock the AI provider
vi.mock("@/lib/ai/providers", () => ({
  chatCompletion: vi.fn(),
}));

// Mock PDF extraction
vi.mock("../study-kit-extraction", () => ({
  extractTextFromPDF: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock tier service (ADR 0073)
vi.mock("@/lib/tier/tier-service", () => ({
  tierService: {
    getFeatureAIConfigForUser: vi.fn(() =>
      Promise.resolve({
        model: "gpt-4o",
        temperature: 0.7,
        maxTokens: 2000,
      }),
    ),
  },
}));

// Mock deployment mapping
vi.mock("@/lib/ai/providers/deployment-mapping", () => ({
  getDeploymentForModel: vi.fn((model: string) => model),
}));

// Mock adaptive difficulty
vi.mock("@/lib/education/adaptive-difficulty", () => ({
  getAdaptiveContextForUser: vi.fn(() => Promise.resolve(null)),
  buildAdaptiveInstruction: vi.fn(() => ""),
}));

import { chatCompletion } from "@/lib/ai/providers";
import { extractTextFromPDF } from "../study-kit-extraction";

const mockChatCompletion = vi.mocked(chatCompletion);
const mockExtractTextFromPDF = vi.mocked(extractTextFromPDF);

describe("Study Kit Generators", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("generateSummary", () => {
    it("should generate a summary from text", async () => {
      mockChatCompletion.mockResolvedValue({
        provider: "azure",
        content: "This is a well-structured summary of the document.",
        model: "test-model",
      });

      const result = await generateSummary("Sample text content", "Test Title");

      expect(result).toBe("This is a well-structured summary of the document.");
      expect(mockChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ role: "user" })]),
        expect.any(String),
        expect.objectContaining({ temperature: 0.7, maxTokens: 2000 }),
      );
    });

    it("should include subject when provided", async () => {
      mockChatCompletion.mockResolvedValue({
        provider: "azure",
        content: "Math summary content",
        model: "test-model",
      });

      await generateSummary("Content", "Title", "Matematica");

      expect(mockChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining("Materia: Matematica"),
          }),
        ]),
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should trim whitespace from response", async () => {
      mockChatCompletion.mockResolvedValue({
        provider: "azure",
        content: "  Summary with whitespace  \n",
        model: "test-model",
      });

      const result = await generateSummary("Text", "Title");

      expect(result).toBe("Summary with whitespace");
    });

    it("should truncate long text in prompt", async () => {
      const longText = "a".repeat(10000);
      mockChatCompletion.mockResolvedValue({
        provider: "azure",
        content: "Summary",
        model: "test-model",
      });

      await generateSummary(longText, "Title");

      expect(mockChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining("..."),
          }),
        ]),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe("generateMindmap", () => {
    it("should generate a mindmap from text", async () => {
      mockChatCompletion.mockResolvedValue({
        provider: "azure",
        content: JSON.stringify({
          title: "Test Mindmap",
          nodes: [
            { id: "1", label: "Main Concept" },
            { id: "1a", label: "Sub Concept", parentId: "1" },
          ],
        }),
        model: "test-model",
      });

      const result = await generateMindmap("Text content", "Test Title");

      expect(result.title).toBe("Test Mindmap");
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].id).toBe("1");
      expect(result.nodes[1].parentId).toBe("1");
    });

    it("should convert numeric IDs to strings", async () => {
      mockChatCompletion.mockResolvedValue({
        provider: "azure",
        content: JSON.stringify({
          title: "Mindmap",
          nodes: [{ id: 1, label: "Node", parentId: null }],
        }),
        model: "test-model",
      });

      const result = await generateMindmap("Text", "Title");

      expect(result.nodes[0].id).toBe("1");
      expect(result.nodes[0].parentId).toBeNull();
    });

    it("should handle JSON wrapped in text", async () => {
      mockChatCompletion.mockResolvedValue({
        provider: "azure",
        content:
          'Here is the mindmap: {"title":"Map","nodes":[{"id":"1","label":"A"}]} as requested',
        model: "test-model",
      });

      const result = await generateMindmap("Text", "Title");

      expect(result.title).toBe("Map");
    });

    it("should throw error when JSON parsing fails", async () => {
      mockChatCompletion.mockResolvedValue({
        provider: "azure",
        content: "No JSON here",
        model: "test-model",
      });

      await expect(generateMindmap("Text", "Title")).rejects.toThrow(
        "Failed to parse mindmap JSON",
      );
    });

    it("should throw error for invalid mindmap structure", async () => {
      mockChatCompletion.mockResolvedValue({
        provider: "azure",
        content: JSON.stringify({ invalid: "structure" }),
        model: "test-model",
      });

      await expect(generateMindmap("Text", "Title")).rejects.toThrow(
        "Invalid mindmap structure",
      );
    });
  });

  describe("generateDemo", () => {
    it("should return null for non-STEM subjects", async () => {
      const result = await generateDemo("Text", "Title", "Storia");

      expect(result).toBeNull();
      expect(mockChatCompletion).not.toHaveBeenCalled();
    });

    it("should generate demo for STEM subjects", async () => {
      mockChatCompletion.mockResolvedValue({
        provider: "azure",
        content: JSON.stringify({
          title: "Math Demo",
          description: "Interactive demo",
          html: "<div>Demo</div>",
          css: "body { color: red; }",
          js: 'console.log("demo");',
        }),
        model: "test-model",
      });

      const result = await generateDemo("Text", "Title", "Matematica");

      expect(result).not.toBeNull();
      expect(result!.title).toBe("Math Demo");
      expect(result!.html).toBe("<div>Demo</div>");
    });

    it("should recognize various STEM subject names", async () => {
      mockChatCompletion.mockResolvedValue({
        provider: "azure",
        content: JSON.stringify({ title: "Demo" }),
        model: "test-model",
      });

      const stemSubjects = [
        "fisica",
        "chemistry",
        "biologia",
        "informatica",
        "STEM",
        "ingegneria",
      ];

      for (const subject of stemSubjects) {
        vi.clearAllMocks();
        await generateDemo("Text", "Title", subject);
        expect(mockChatCompletion).toHaveBeenCalled();
      }
    });

    it("should return null when JSON parsing fails", async () => {
      mockChatCompletion.mockResolvedValue({
        provider: "azure",
        content: "Invalid response",
        model: "test-model",
      });

      const result = await generateDemo("Text", "Title", "Matematica");

      expect(result).toBeNull();
    });

    it("should handle malformed JSON gracefully", async () => {
      mockChatCompletion.mockResolvedValue({
        provider: "azure",
        content: '{"title":"Demo","broken json',
        model: "test-model",
      });

      const result = await generateDemo("Text", "Title", "Fisica");

      expect(result).toBeNull();
    });

    it("should use title as fallback when not in response", async () => {
      mockChatCompletion.mockResolvedValue({
        provider: "azure",
        content: JSON.stringify({ description: "No title provided" }),
        model: "test-model",
      });

      const result = await generateDemo("Text", "My Title", "Matematica");

      expect(result!.title).toBe("My Title");
    });
  });

  describe("generateQuiz", () => {
    it("should generate a quiz from text", async () => {
      mockChatCompletion.mockResolvedValue({
        provider: "azure",
        content: JSON.stringify({
          topic: "Test Topic",
          questions: [
            {
              question: "What is 2+2?",
              options: ["3", "4", "5", "6"],
              correctIndex: 1,
              explanation: "Basic math",
            },
          ],
        }),
        model: "test-model",
      });

      const result = await generateQuiz("Text content", "Test Title");

      expect(result.topic).toBe("Test Topic");
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].correctIndex).toBe(1);
    });

    it("should handle questions without explanation", async () => {
      mockChatCompletion.mockResolvedValue({
        provider: "azure",
        content: JSON.stringify({
          topic: "Topic",
          questions: [{ question: "Q?", options: ["A", "B"], correctIndex: 0 }],
        }),
        model: "test-model",
      });

      const result = await generateQuiz("Text", "Title");

      expect(result.questions[0].explanation).toBeUndefined();
    });

    it("should throw error when JSON parsing fails", async () => {
      mockChatCompletion.mockResolvedValue({
        provider: "azure",
        content: "Not valid JSON",
        model: "test-model",
      });

      await expect(generateQuiz("Text", "Title")).rejects.toThrow(
        "Failed to parse quiz JSON",
      );
    });

    it("should throw error for invalid quiz structure", async () => {
      mockChatCompletion.mockResolvedValue({
        provider: "azure",
        content: JSON.stringify({ noTopic: true }),
        model: "test-model",
      });

      await expect(generateQuiz("Text", "Title")).rejects.toThrow(
        "Invalid quiz structure",
      );
    });
  });

  describe("processStudyKit", () => {
    const mockBuffer = Buffer.from("PDF content");

    function setupProcessStudyKitMocks() {
      mockExtractTextFromPDF.mockResolvedValue({
        text: "Extracted text content for testing",
        pageCount: 3,
      });

      // For non-STEM (no subject), generateDemo returns null without calling chatCompletion
      // So we only need 3 mocks: summary, mindmap, quiz
      mockChatCompletion
        .mockResolvedValueOnce({
          provider: "azure",
          content: "Generated summary",
          model: "test",
        })
        .mockResolvedValueOnce({
          provider: "azure",
          content: JSON.stringify({
            title: "Mindmap",
            nodes: [{ id: "1", label: "A" }],
          }),
          model: "test",
        })
        .mockResolvedValueOnce({
          provider: "azure",
          content: JSON.stringify({
            topic: "Quiz",
            questions: [
              { question: "Q", options: ["A", "B"], correctIndex: 0 },
            ],
          }),
          model: "test",
        });
    }

    it("should process PDF and generate complete study kit", async () => {
      setupProcessStudyKitMocks();

      const result = await processStudyKit(mockBuffer, "Test Document");

      expect(result.title).toBe("Test Document");
      expect(result.summary).toBe("Generated summary");
      expect(result.mindmap!.title).toBe("Mindmap");
      expect(result.quiz!.topic).toBe("Quiz");
      expect(result.status).toBe("ready");
      expect(result.pageCount).toBe(3);
    });

    it("should call progress callback during processing", async () => {
      setupProcessStudyKitMocks();
      const onProgress = vi.fn();

      await processStudyKit(mockBuffer, "Test", undefined, onProgress);

      expect(onProgress).toHaveBeenCalledWith("parsing", 0.1);
      expect(onProgress).toHaveBeenCalledWith("generating_summary", 0.25);
      expect(onProgress).toHaveBeenCalledWith("generating_mindmap", 0.45);
      expect(onProgress).toHaveBeenCalledWith("generating_demo", 0.65);
      expect(onProgress).toHaveBeenCalledWith("generating_quiz", 0.85);
      expect(onProgress).toHaveBeenCalledWith("complete", 1.0);
    });

    it("should calculate word count from extracted text", async () => {
      mockExtractTextFromPDF.mockResolvedValue({
        text: "one two three four five",
        pageCount: 1,
      });

      // No subject = non-STEM = no demo chatCompletion call
      mockChatCompletion
        .mockResolvedValueOnce({
          provider: "azure",
          content: "Summary",
          model: "test",
        })
        .mockResolvedValueOnce({
          provider: "azure",
          content: JSON.stringify({ title: "Map", nodes: [] }),
          model: "test",
        })
        .mockResolvedValueOnce({
          provider: "azure",
          content: JSON.stringify({ topic: "Q", questions: [] }),
          model: "test",
        });

      const result = await processStudyKit(mockBuffer, "Test");

      expect(result.wordCount).toBe(5);
    });

    it("should include demo for STEM subjects", async () => {
      mockExtractTextFromPDF.mockResolvedValue({
        text: "Math content",
        pageCount: 1,
      });

      mockChatCompletion
        .mockResolvedValueOnce({
          provider: "azure",
          content: "Summary",
          model: "test",
        })
        .mockResolvedValueOnce({
          provider: "azure",
          content: JSON.stringify({ title: "Map", nodes: [] }),
          model: "test",
        })
        .mockResolvedValueOnce({
          provider: "azure",
          content: JSON.stringify({
            title: "Demo",
            html: "<div></div>",
            css: "",
            js: "",
          }),
          model: "test",
        })
        .mockResolvedValueOnce({
          provider: "azure",
          content: JSON.stringify({ topic: "Q", questions: [] }),
          model: "test",
        });

      const result = await processStudyKit(mockBuffer, "Test", "Matematica");

      expect(result.demo).toBeDefined();
      expect(result.demo!.title).toBe("Demo");
    });

    it("should handle extraction failure", async () => {
      mockExtractTextFromPDF.mockRejectedValue(new Error("Extraction failed"));

      await expect(processStudyKit(mockBuffer, "Test")).rejects.toThrow(
        "Extraction failed",
      );
    });
  });
});
