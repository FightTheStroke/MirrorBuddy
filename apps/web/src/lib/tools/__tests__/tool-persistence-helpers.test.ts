/**
 * Tests for Tool Persistence Helpers
 */

import { describe, it, expect } from "vitest";
import {
  materialToSavedTool,
  MaterialRecord,
} from "../tool-persistence-helpers";

describe("tool-persistence-helpers", () => {
  describe("materialToSavedTool", () => {
    const baseMaterial: MaterialRecord = {
      id: "mat-123",
      toolId: "tool-456",
      userId: "user-789",
      toolType: "mindmap",
      title: "Test Mindmap",
      topic: "Math basics",
      content: '{"nodes":[{"id":"1","label":"Root"}]}',
      maestroId: "euclide",
      conversationId: "conv-abc",
      sessionId: "sess-def",
      userRating: 4,
      isBookmarked: true,
      viewCount: 10,
      createdAt: new Date("2026-01-15T10:00:00.000Z"),
      updatedAt: new Date("2026-01-15T11:00:00.000Z"),
    };

    it("converts all required fields correctly", () => {
      const result = materialToSavedTool(baseMaterial);

      expect(result.id).toBe("mat-123");
      expect(result.toolId).toBe("tool-456");
      expect(result.userId).toBe("user-789");
      expect(result.type).toBe("mindmap");
      expect(result.title).toBe("Test Mindmap");
    });

    it("maps toolType to type", () => {
      const result = materialToSavedTool(baseMaterial);
      expect(result.type).toBe(baseMaterial.toolType);
    });

    it("parses JSON content string to object", () => {
      const result = materialToSavedTool(baseMaterial);

      expect(typeof result.content).toBe("object");
      expect(result.content).toEqual({ nodes: [{ id: "1", label: "Root" }] });
    });

    it("preserves nullable fields as null", () => {
      const materialWithNulls: MaterialRecord = {
        ...baseMaterial,
        topic: null,
        maestroId: null,
        conversationId: null,
        sessionId: null,
        userRating: null,
      };

      const result = materialToSavedTool(materialWithNulls);

      expect(result.topic).toBeNull();
      expect(result.maestroId).toBeNull();
      expect(result.conversationId).toBeNull();
      expect(result.sessionId).toBeNull();
      expect(result.userRating).toBeNull();
    });

    it("preserves boolean fields", () => {
      const result = materialToSavedTool(baseMaterial);
      expect(result.isBookmarked).toBe(true);

      const notBookmarked = materialToSavedTool({
        ...baseMaterial,
        isBookmarked: false,
      });
      expect(notBookmarked.isBookmarked).toBe(false);
    });

    it("preserves numeric fields", () => {
      const result = materialToSavedTool(baseMaterial);
      expect(result.viewCount).toBe(10);
      expect(result.userRating).toBe(4);
    });

    it("preserves date objects", () => {
      const result = materialToSavedTool(baseMaterial);

      expect(result.createdAt).toEqual(new Date("2026-01-15T10:00:00.000Z"));
      expect(result.updatedAt).toEqual(new Date("2026-01-15T11:00:00.000Z"));
    });

    it("handles complex nested content", () => {
      const complexContent = {
        nodes: [
          { id: "1", label: "Root", children: ["2", "3"] },
          { id: "2", label: "Child A", data: { value: 42 } },
          { id: "3", label: "Child B", styles: { color: "red" } },
        ],
        metadata: { version: 2, author: "test" },
      };

      const materialWithComplex: MaterialRecord = {
        ...baseMaterial,
        content: JSON.stringify(complexContent),
      };

      const result = materialToSavedTool(materialWithComplex);
      expect(result.content).toEqual(complexContent);
    });

    it("handles empty JSON object content", () => {
      const emptyContent: MaterialRecord = {
        ...baseMaterial,
        content: "{}",
      };

      const result = materialToSavedTool(emptyContent);
      expect(result.content).toEqual({});
    });

    it("handles array content", () => {
      const arrayContent: MaterialRecord = {
        ...baseMaterial,
        content: '["item1","item2","item3"]',
      };

      const result = materialToSavedTool(arrayContent);
      expect(result.content).toEqual(["item1", "item2", "item3"]);
    });

    it("handles different tool types", () => {
      const toolTypes = ["mindmap", "flashcard", "quiz", "summary", "diagram"];

      for (const toolType of toolTypes) {
        const material: MaterialRecord = {
          ...baseMaterial,
          toolType,
        };

        const result = materialToSavedTool(material);
        expect(result.type).toBe(toolType);
      }
    });

    it("preserves zero values correctly", () => {
      const zeroValues: MaterialRecord = {
        ...baseMaterial,
        userRating: 0,
        viewCount: 0,
      };

      const result = materialToSavedTool(zeroValues);
      expect(result.userRating).toBe(0);
      expect(result.viewCount).toBe(0);
    });
  });
});
