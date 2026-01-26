import { describe, it, expect } from "vitest";
import { TOOL_SCHEMAS } from "../tool-parameter-schemas";
import {
  validateParameters,
  getToolSchema,
} from "../tool-parameter-validators";

describe("tool-parameter-schemas", () => {
  describe("schema structure", () => {
    it("should have schemas for all 9 tools", () => {
      const expectedTools = [
        "quiz",
        "flashcard",
        "mindmap",
        "formula",
        "chart",
        "summary",
        "homework",
        "pdf",
        "webcam",
      ];
      const actualTools = Object.keys(TOOL_SCHEMAS);
      expect(actualTools.sort()).toEqual(expectedTools.sort());
    });

    it("should have valid schema structure for each tool", () => {
      Object.entries(TOOL_SCHEMAS).forEach(([toolName, schema]) => {
        expect(schema).toHaveProperty("toolName");
        expect(schema).toHaveProperty("parameters");
        expect(schema).toHaveProperty("extractionHint");
        expect(schema.toolName).toBe(toolName);
        expect(Array.isArray(schema.parameters)).toBe(true);
      });
    });

    it("should have at least one parameter definition per tool (except pdf/webcam)", () => {
      const toolsWithParams = [
        "quiz",
        "flashcard",
        "mindmap",
        "formula",
        "chart",
        "summary",
        "homework",
      ];
      toolsWithParams.forEach((toolName) => {
        const schema = TOOL_SCHEMAS[toolName];
        expect(schema.parameters.length).toBeGreaterThan(0);
      });

      // PDF and Webcam have no parameters
      expect(TOOL_SCHEMAS.pdf.parameters.length).toBe(0);
      expect(TOOL_SCHEMAS.webcam.parameters.length).toBe(0);
    });
  });

  describe("parameter definition structure", () => {
    it("should have valid parameter definitions with required fields", () => {
      const quizSchema = TOOL_SCHEMAS.quiz;
      quizSchema.parameters.forEach((param) => {
        expect(param).toHaveProperty("name");
        expect(param).toHaveProperty("type");
        expect(param).toHaveProperty("required");
        expect(param).toHaveProperty("description");
        expect(typeof param.name).toBe("string");
        expect(["string", "number", "boolean", "enum"]).toContain(param.type);
        expect(typeof param.required).toBe("boolean");
        expect(typeof param.description).toBe("string");
      });
    });

    it("should have enum values for enum-type parameters", () => {
      const summarySchema = TOOL_SCHEMAS.summary;
      const lengthParam = summarySchema.parameters.find(
        (p) => p.name === "length",
      );
      expect(lengthParam?.type).toBe("enum");
      expect(Array.isArray(lengthParam?.enumValues)).toBe(true);
      expect(lengthParam?.enumValues?.length).toBeGreaterThan(0);
    });

    it("should have defaultValue for optional parameters", () => {
      const quizSchema = TOOL_SCHEMAS.quiz;
      const questionCountParam = quizSchema.parameters.find(
        (p) => p.name === "questionCount",
      );
      expect(questionCountParam?.defaultValue).toBeDefined();
      expect(typeof questionCountParam?.defaultValue).toBe("number");
    });
  });

  describe("quiz schema", () => {
    it("should have topic, questionCount parameters", () => {
      const schema = TOOL_SCHEMAS.quiz;
      const paramNames = schema.parameters.map((p) => p.name);
      expect(paramNames).toContain("topic");
      expect(paramNames).toContain("questionCount");
    });

    it("topic should be required string", () => {
      const schema = TOOL_SCHEMAS.quiz;
      const topicParam = schema.parameters.find((p) => p.name === "topic");
      expect(topicParam?.required).toBe(true);
      expect(topicParam?.type).toBe("string");
    });

    it("questionCount should be number with default", () => {
      const schema = TOOL_SCHEMAS.quiz;
      const countParam = schema.parameters.find(
        (p) => p.name === "questionCount",
      );
      expect(countParam?.type).toBe("number");
      expect(countParam?.required).toBe(false);
      expect(typeof countParam?.defaultValue).toBe("number");
    });
  });

  describe("flashcard schema", () => {
    it("should have topic and count parameters", () => {
      const schema = TOOL_SCHEMAS.flashcard;
      const paramNames = schema.parameters.map((p) => p.name);
      expect(paramNames).toContain("topic");
      expect(paramNames).toContain("count");
    });
  });

  describe("mindmap schema", () => {
    it("should have title parameter", () => {
      const schema = TOOL_SCHEMAS.mindmap;
      const paramNames = schema.parameters.map((p) => p.name);
      expect(paramNames).toContain("title");
    });
  });

  describe("chart schema", () => {
    it("should have chartType and title parameters", () => {
      const schema = TOOL_SCHEMAS.chart;
      const paramNames = schema.parameters.map((p) => p.name);
      expect(paramNames).toContain("chartType");
      expect(paramNames).toContain("title");
    });

    it("chartType should be enum with valid chart types", () => {
      const schema = TOOL_SCHEMAS.chart;
      const chartTypeParam = schema.parameters.find(
        (p) => p.name === "chartType",
      );
      expect(chartTypeParam?.type).toBe("enum");
      const expectedTypes = [
        "bar",
        "line",
        "pie",
        "doughnut",
        "scatter",
        "radar",
        "polarArea",
      ];
      expectedTypes.forEach((type) => {
        expect(chartTypeParam?.enumValues).toContain(type);
      });
    });
  });

  describe("summary schema", () => {
    it("should have topic and optional length", () => {
      const schema = TOOL_SCHEMAS.summary;
      const paramNames = schema.parameters.map((p) => p.name);
      expect(paramNames).toContain("topic");
      expect(paramNames).toContain("length");
    });

    it("length should be enum with short/medium/long", () => {
      const schema = TOOL_SCHEMAS.summary;
      const lengthParam = schema.parameters.find((p) => p.name === "length");
      expect(lengthParam?.type).toBe("enum");
      expect(lengthParam?.enumValues).toContain("short");
      expect(lengthParam?.enumValues).toContain("medium");
      expect(lengthParam?.enumValues).toContain("long");
    });
  });

  describe("validateParameters", () => {
    it("should validate valid quiz parameters", () => {
      const result = validateParameters("quiz", {
        topic: "fotosintesi",
        questionCount: 5,
      });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should return errors for missing required parameters", () => {
      const result = validateParameters("quiz", {
        questionCount: 5,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes("topic"))).toBe(true);
    });

    it("should return errors for invalid parameter types", () => {
      const result = validateParameters("quiz", {
        topic: "fotosintesi",
        questionCount: "five",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("questionCount"))).toBe(true);
    });

    it("should validate enum values", () => {
      const result = validateParameters("summary", {
        topic: "photosynthesis",
        length: "invalid",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("length"))).toBe(true);
    });

    it("should accept valid enum values", () => {
      const result = validateParameters("summary", {
        topic: "photosynthesis",
        length: "long",
      });
      expect(result.valid).toBe(true);
    });

    it("should pass validation for optional parameters", () => {
      const result = validateParameters("quiz", {
        topic: "math",
        // questionCount is optional, so not providing it should be ok
      });
      expect(result.valid).toBe(true);
    });

    it("should validate chart with enum chartType", () => {
      const result = validateParameters("chart", {
        chartType: "bar",
        title: "Sales Data",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject invalid chartType", () => {
      const result = validateParameters("chart", {
        chartType: "invalid",
        title: "Sales Data",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("chartType"))).toBe(true);
    });

    it("should validate pdf with empty parameters", () => {
      const result = validateParameters("pdf", {});
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should validate webcam with empty parameters", () => {
      const result = validateParameters("webcam", {});
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should return error for unknown tool", () => {
      const result = validateParameters("unknown-tool", {});
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("unknown"))).toBe(true);
    });

    it("should accept additional unexpected parameters gracefully", () => {
      const result = validateParameters("quiz", {
        topic: "math",
        questionCount: 5,
        extraField: "extra",
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("getToolSchema", () => {
    it("should return schema for valid tool", () => {
      const schema = getToolSchema("quiz");
      expect(schema).toBeDefined();
      expect(schema?.toolName).toBe("quiz");
    });

    it("should return undefined for invalid tool", () => {
      const schema = getToolSchema("invalid-tool");
      expect(schema).toBeUndefined();
    });

    it("should return schema with all required properties", () => {
      const schema = getToolSchema("flashcard");
      expect(schema).toHaveProperty("toolName");
      expect(schema).toHaveProperty("parameters");
      expect(schema).toHaveProperty("extractionHint");
    });
  });

  describe("extraction hints", () => {
    it("should have meaningful extraction hints for each tool", () => {
      Object.entries(TOOL_SCHEMAS).forEach(([_toolName, schema]) => {
        expect(schema.extractionHint).toBeTruthy();
        expect(typeof schema.extractionHint).toBe("string");
        expect(schema.extractionHint.length).toBeGreaterThan(10);
      });
    });
  });
});
