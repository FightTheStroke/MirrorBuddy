/**
 * Tests for Tool Configurations
 */

import { describe, it, expect } from "vitest";
import { UPLOAD_TOOLS, SEARCH_TOOLS, CREATE_TOOLS } from "./tool-configs";
import { Camera } from "lucide-react";

describe("Tool Configurations", () => {
  describe("UPLOAD_TOOLS", () => {
    it("should have webcam-standalone config with correct properties", () => {
      const webcamStandalone = UPLOAD_TOOLS["webcam-standalone"];

      expect(webcamStandalone).toBeDefined();
      expect(webcamStandalone.type).toBe("webcam-standalone");
      expect(webcamStandalone.route).toBe("/astuccio");
      expect(webcamStandalone.requiresMaestro).toBe(false);
      expect(webcamStandalone.category).toBe("upload");
      expect(webcamStandalone.icon).toBe(Camera);
      expect(webcamStandalone.label).toBe("Scatta Foto");
      expect(webcamStandalone.description).toBe(
        "Fotografa e salva nell'archivio",
      );
    });

    it("should have both webcam configs with different routes", () => {
      const webcam = UPLOAD_TOOLS["webcam"];
      const webcamStandalone = UPLOAD_TOOLS["webcam-standalone"];

      expect(webcam).toBeDefined();
      expect(webcamStandalone).toBeDefined();

      // Verify they have different routes
      expect(webcam.route).toBe("/webcam");
      expect(webcamStandalone.route).toBe("/astuccio");

      // Verify webcam requires maestro, standalone doesn't
      expect(webcam.requiresMaestro).toBe(true);
      expect(webcamStandalone.requiresMaestro).toBe(false);
    });

    it("should have all required properties for each upload tool", () => {
      Object.entries(UPLOAD_TOOLS).forEach(([_key, config]) => {
        expect(config.type).toBeDefined();
        expect(config.route).toBeDefined();
        expect(config.functionName).toBeDefined();
        expect(config.label).toBeDefined();
        expect(config.description).toBeDefined();
        expect(config.icon).toBeDefined();
        expect(config.category).toBe("upload");
        expect(typeof config.requiresMaestro).toBe("boolean");
      });
    });
  });

  describe("CREATE_TOOLS", () => {
    it("should have all required properties for each create tool", () => {
      Object.entries(CREATE_TOOLS).forEach(([_key, config]) => {
        expect(config.type).toBeDefined();
        expect(config.route).toBeDefined();
        expect(config.functionName).toBeDefined();
        expect(config.label).toBeDefined();
        expect(config.description).toBeDefined();
        expect(config.icon).toBeDefined();
        expect(config.category).toBe("create");
        expect(typeof config.requiresMaestro).toBe("boolean");
      });
    });
  });

  describe("SEARCH_TOOLS", () => {
    it("should have all required properties for each search tool", () => {
      Object.entries(SEARCH_TOOLS).forEach(([_key, config]) => {
        expect(config.type).toBeDefined();
        expect(config.route).toBeDefined();
        expect(config.functionName).toBeDefined();
        expect(config.label).toBeDefined();
        expect(config.description).toBeDefined();
        expect(config.icon).toBeDefined();
        expect(config.category).toBe("search");
        expect(typeof config.requiresMaestro).toBe("boolean");
      });
    });
  });
});
