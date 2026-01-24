/**
 * Tests for Mindmap Plugin Handler
 * Coverage improvement for tools/plugins/mindmap-plugin.ts
 * Tests handler branches and hierarchical validation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ToolCategory, Permission } from "../../plugin/types";

// Mock dependencies
vi.mock("../../handlers/mindmap-handler", () => ({
  generateMarkdownFromNodes: vi.fn(
    (title: string, nodes: unknown[]) =>
      `# ${title}\n${(nodes as Array<{ label: string }>).map((n) => `- ${n.label}`).join("\n")}`,
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

import { mindmapPlugin } from "../mindmap-plugin";
import type { ToolContext } from "@/types/tools";

describe("mindmap-plugin handler", () => {
  const mockContext: ToolContext = {
    conversationId: "conv-123",
    userId: "user-456",
    sessionId: "sess-789",
    maestroId: "euclide",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("plugin configuration", () => {
    it("has correct id", () => {
      expect(mindmapPlugin.id).toBe("create_mindmap");
    });

    it("has correct name", () => {
      expect(mindmapPlugin.name).toBe("Mappa Mentale");
    });

    it("has correct category", () => {
      expect(mindmapPlugin.category).toBe(ToolCategory.CREATION);
    });

    it("has required permissions", () => {
      expect(mindmapPlugin.permissions).toContain(Permission.WRITE_CONTENT);
      expect(mindmapPlugin.permissions).toContain(Permission.VOICE_OUTPUT);
    });

    it("is voice enabled", () => {
      expect(mindmapPlugin.voiceEnabled).toBe(true);
    });

    it("has voice triggers in Italian and English", () => {
      expect(mindmapPlugin.triggers).toContain("mappa mentale");
      expect(mindmapPlugin.triggers).toContain("mind map");
      expect(mindmapPlugin.triggers).toContain("mindmap");
    });

    it("has voice prompt with topic placeholder", () => {
      expect(mindmapPlugin.voicePrompt).toBeDefined();
      if (typeof mindmapPlugin.voicePrompt === "object") {
        expect(mindmapPlugin.voicePrompt.template).toContain("{topic}");
      }
    });

    it("has voice feedback with itemCount placeholder", () => {
      expect(mindmapPlugin.voiceFeedback).toBeDefined();
      if (typeof mindmapPlugin.voiceFeedback === "object") {
        expect(mindmapPlugin.voiceFeedback.template).toContain("{itemCount}");
      }
    });
  });

  describe("handler - success cases", () => {
    it("creates mindmap with single node", async () => {
      const result = await mindmapPlugin.handler(
        {
          title: "Test Map",
          nodes: [{ id: "1", label: "Root", parentId: null }],
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).title).toBe("Test Map");
      expect((result.data as any).nodes).toHaveLength(1);
      expect((result.data as any).markdown).toBeDefined();
    });

    it("creates mindmap with hierarchical nodes", async () => {
      const result = await mindmapPlugin.handler(
        {
          title: "Hierarchical Map",
          nodes: [
            { id: "1", label: "Root", parentId: null },
            { id: "2", label: "Child 1", parentId: "1" },
            { id: "3", label: "Child 2", parentId: "1" },
          ],
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).nodes).toHaveLength(3);
    });

    it("handles parentId as empty string (treated as root)", async () => {
      const result = await mindmapPlugin.handler(
        {
          title: "Test",
          nodes: [{ id: "1", label: "Root", parentId: "" }],
        },
        mockContext,
      );

      expect(result.success).toBe(true);
    });

    it('handles parentId as "null" string (treated as root)', async () => {
      const result = await mindmapPlugin.handler(
        {
          title: "Test",
          nodes: [{ id: "1", label: "Root", parentId: "null" }],
        },
        mockContext,
      );

      expect(result.success).toBe(true);
    });

    it("normalizes parentId null to null in output", async () => {
      const result = await mindmapPlugin.handler(
        {
          title: "Test",
          nodes: [{ id: "1", label: "Root", parentId: null }],
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).nodes[0].parentId).toBeNull();
    });
  });

  describe("handler - validation errors", () => {
    it("rejects missing title", async () => {
      const result = await mindmapPlugin.handler(
        { nodes: [{ id: "1", label: "Root", parentId: null }] },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation error");
    });

    it("rejects empty title", async () => {
      const result = await mindmapPlugin.handler(
        { title: "", nodes: [{ id: "1", label: "Root", parentId: null }] },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Title is required");
    });

    it("rejects title over 200 characters", async () => {
      const result = await mindmapPlugin.handler(
        {
          title: "a".repeat(201),
          nodes: [{ id: "1", label: "Root", parentId: null }],
        },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects empty nodes array", async () => {
      const result = await mindmapPlugin.handler(
        { title: "Test", nodes: [] },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("At least one node is required");
    });

    it("rejects missing nodes", async () => {
      const result = await mindmapPlugin.handler(
        { title: "Test" },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects node with empty id", async () => {
      const result = await mindmapPlugin.handler(
        { title: "Test", nodes: [{ id: "", label: "Node", parentId: null }] },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Node ID is required");
    });

    it("rejects node with empty label", async () => {
      const result = await mindmapPlugin.handler(
        { title: "Test", nodes: [{ id: "1", label: "", parentId: null }] },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Node label is required");
    });
  });
});
