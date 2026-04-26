/**
 * Tests for Mindmap Import Helpers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MindmapNode } from "../../mindmap-export";

// Mock crypto.randomUUID
const mockRandomUUID = vi.fn();
vi.stubGlobal("crypto", { randomUUID: mockRandomUUID });

// Type for testing nodes without required id (id is optional for testing ensureNodeIds)
interface TestNode {
  id?: string;
  text: string;
  children?: TestNode[];
  color?: string;
  collapsed?: boolean;
}

describe("mindmap-import helpers", () => {
  beforeEach(() => {
    mockRandomUUID.mockReturnValue("12345678-1234-1234-1234-123456789abc");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T10:00:00.000Z"));
  });

  describe("generateId", () => {
    it("generates ID with timestamp and UUID prefix", async () => {
      const { generateId } = await import("../helpers");
      const id = generateId();

      expect(id).toMatch(/^node_\d+_[a-f0-9]{8}$/);
    });

    it("generates unique IDs on each call", async () => {
      mockRandomUUID
        .mockReturnValueOnce("11111111-1111-1111-1111-111111111111")
        .mockReturnValueOnce("22222222-2222-2222-2222-222222222222");

      const { generateId } = await import("../helpers");
      const id1 = generateId();
      vi.advanceTimersByTime(1);
      const id2 = generateId();

      expect(id1).not.toBe(id2);
    });
  });

  describe("ensureNodeIds", () => {
    it("adds ID to node without ID", async () => {
      const { ensureNodeIds } = await import("../helpers");
      const node: TestNode = { text: "Test Node" };

      ensureNodeIds(node as MindmapNode);

      expect(node.id).toBeDefined();
      expect(node.id).toMatch(/^node_\d+_[a-f0-9]{8}$/);
    });

    it("preserves existing ID", async () => {
      const { ensureNodeIds } = await import("../helpers");
      const node: MindmapNode = { id: "existing-id", text: "Test Node" };

      ensureNodeIds(node);

      expect(node.id).toBe("existing-id");
    });

    it("recursively adds IDs to children", async () => {
      const { ensureNodeIds } = await import("../helpers");
      const node: TestNode = {
        text: "Parent",
        children: [{ text: "Child 1" }, { text: "Child 2", id: "keep-this" }],
      };

      ensureNodeIds(node as MindmapNode);

      expect(node.children![0].id).toBeDefined();
      expect(node.children![1].id).toBe("keep-this");
    });

    it("handles deeply nested children", async () => {
      const { ensureNodeIds } = await import("../helpers");
      const node: TestNode = {
        text: "Root",
        children: [
          {
            text: "Level 1",
            children: [
              {
                text: "Level 2",
                children: [{ text: "Level 3" }],
              },
            ],
          },
        ],
      };

      ensureNodeIds(node as MindmapNode);

      expect(node.children![0].children![0].children![0].id).toBeDefined();
    });

    it("handles node with empty children array", async () => {
      const { ensureNodeIds } = await import("../helpers");
      const node: TestNode = { text: "Node", children: [] };

      // Should not throw
      expect(() => ensureNodeIds(node as MindmapNode)).not.toThrow();
    });
  });
});
