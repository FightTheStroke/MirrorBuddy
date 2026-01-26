import { describe, it, expect } from "vitest";
import { extractToolParameters } from "../voice-parameter-extractor";

describe("voice-parameter-extractor", () => {
  describe("quiz parameter extraction", () => {
    it("extracts number of questions from Italian voice command", async () => {
      const result = await extractToolParameters(
        "quiz",
        "crea un quiz di 5 domande sulla fotosintesi",
        undefined,
        { enableAIFallback: false }, // Disable AI fallback for regex-only tests
      );

      expect(result.toolName).toBe("quiz");
      expect(result.parameters.topic).toBe("fotosintesi");
      expect(result.parameters.questionCount).toBe(5);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("extracts difficulty from voice command", async () => {
      const result = await extractToolParameters(
        "quiz",
        "voglio un quiz difficile sulla seconda guerra mondiale con 10 domande",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.parameters.difficulty).toBe(4);
      expect(result.parameters.questionCount).toBe(10);
      expect(result.parameters.topic).toBe("seconda guerra mondiale");
    });

    it("handles quiz without explicit count (defaults to 5)", async () => {
      const result = await extractToolParameters(
        "quiz",
        "fammi un quiz sulla matematica",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.parameters.questionCount).toBe(5);
      expect(result.parameters.topic).toBe("matematica");
    });

    it("extracts easy difficulty level", async () => {
      const result = await extractToolParameters(
        "quiz",
        "un quiz facile sulle tabelline",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.parameters.difficulty).toBe(2);
      expect(result.parameters.topic).toBe("tabelline");
    });
  });

  describe("flashcards parameter extraction", () => {
    it("extracts flashcard count and topic", async () => {
      const result = await extractToolParameters(
        "flashcard",
        "crea 10 flashcard sui verbi irregolari inglesi",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.toolName).toBe("flashcard");
      expect(result.parameters.count).toBe(10);
      expect(result.parameters.topic).toBe("verbi irregolari inglesi");
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it("handles flashcards without count (defaults to 8)", async () => {
      const result = await extractToolParameters(
        "flashcard",
        "fammi delle flashcard sulla chimica organica",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.parameters.count).toBe(8);
      expect(result.parameters.topic).toBe("chimica organica");
    });

    it("extracts topic with preposition variations", async () => {
      const result = await extractToolParameters(
        "flashcard",
        "crea flashcard per la storia romana",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.parameters.topic).toBe("storia romana");
    });
  });

  describe("mindmap parameter extraction", () => {
    it("extracts central topic from voice command", async () => {
      const result = await extractToolParameters(
        "mindmap",
        "crea una mappa mentale sul rinascimento italiano",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.toolName).toBe("mindmap");
      expect(result.parameters.title).toBe("rinascimento italiano");
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it("handles different mindmap request phrasings", async () => {
      const result = await extractToolParameters(
        "mindmap",
        "fammi una mappa concettuale della fotosintesi clorofilliana",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.parameters.title).toBe("fotosintesi clorofilliana");
    });

    it("extracts topic with context from maestro subject", async () => {
      const result = await extractToolParameters(
        "mindmap",
        "crea una mappa mentale",
        {
          maestroSubject: "biology",
          conversationTopics: ["cellula", "mitosi"],
        },
        { enableAIFallback: false },
      );

      expect(result.parameters.title).toContain("cellula");
      expect(result.confidence).toBeLessThan(0.7); // Lower confidence without explicit topic
    });
  });

  describe("formula parameter extraction", () => {
    it("extracts formula topic and subject area", async () => {
      const result = await extractToolParameters(
        "formula",
        "mostrami la formula della forza di gravità",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.toolName).toBe("formula");
      expect(result.parameters.description).toContain("forza di gravità");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("identifies mathematical formulas", async () => {
      const result = await extractToolParameters(
        "formula",
        "scrivi la formula del teorema di pitagora",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.parameters.description).toContain("teorema di pitagora");
    });

    it("uses context from maestro subject", async () => {
      const result = await extractToolParameters(
        "formula",
        "mostrami la formula",
        { maestroSubject: "physics", conversationTopics: ["energia cinetica"] },
        { enableAIFallback: false },
      );

      expect(result.parameters.description).toContain("energia cinetica");
    });
  });

  describe("chart parameter extraction", () => {
    it("extracts chart type from voice command", async () => {
      const result = await extractToolParameters(
        "chart",
        "crea un grafico a barre delle temperature mensili",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.toolName).toBe("chart");
      expect(result.parameters.chartType).toBe("bar");
      expect(result.parameters.title).toContain("temperature mensili");
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it("identifies pie chart type", async () => {
      const result = await extractToolParameters(
        "chart",
        "fammi un grafico a torta della composizione dell'aria",
      );

      expect(result.parameters.chartType).toBe("pie");
      expect(result.parameters.title).toContain("composizione dell'aria");
    });

    it("identifies line chart type", async () => {
      const result = await extractToolParameters(
        "chart",
        "crea un grafico lineare della crescita della popolazione",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.parameters.chartType).toBe("line");
    });

    it("defaults to bar chart when type is unclear", async () => {
      const result = await extractToolParameters(
        "chart",
        "mostrami un grafico dei dati",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.parameters.chartType).toBe("bar");
    });
  });

  describe("summary parameter extraction", () => {
    it("extracts summary topic", async () => {
      const result = await extractToolParameters(
        "summary",
        "crea un riassunto della rivoluzione francese",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.toolName).toBe("summary");
      expect(result.parameters.topic).toBe("rivoluzione francese");
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it("extracts length preference", async () => {
      const result = await extractToolParameters(
        "summary",
        "fammi un riassunto breve della divina commedia",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.parameters.topic).toBe("divina commedia");
      expect(result.parameters.length).toBe("short");
    });

    it("handles long summary requests", async () => {
      const result = await extractToolParameters(
        "summary",
        "voglio un riassunto lungo e dettagliato del genoma umano",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.parameters.length).toBe("long");
      expect(result.parameters.topic).toBe("genoma umano");
    });

    it("uses conversation topics as fallback", async () => {
      const result = await extractToolParameters(
        "summary",
        "riassumi quello che abbiamo detto",
        { conversationTopics: ["fotosintesi", "respirazione cellulare"] },
        { enableAIFallback: false },
      );

      expect(result.parameters.topic).toContain("fotosintesi");
    });
  });

  describe("homework parameter extraction", () => {
    it("extracts homework subject", async () => {
      const result = await extractToolParameters(
        "homework",
        "aiutami con i compiti di matematica",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.toolName).toBe("homework");
      expect(result.parameters.topic).toBe("matematica");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("identifies difficulty from phrasing", async () => {
      const result = await extractToolParameters(
        "homework",
        "ho un esercizio difficile di fisica",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.parameters.topic).toBe("fisica");
      expect(result.parameters.difficulty).toBe("hard");
    });
  });

  describe("pdf and webcam tools", () => {
    it("returns empty parameters for pdf upload", async () => {
      const result = await extractToolParameters(
        "pdf",
        "carica un pdf",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.toolName).toBe("pdf");
      expect(result.parameters).toEqual({});
      expect(result.confidence).toBe(0.5); // Neutral confidence
    });

    it("returns empty parameters for webcam capture", async () => {
      const result = await extractToolParameters(
        "webcam",
        "scatta una foto",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.toolName).toBe("webcam");
      expect(result.parameters).toEqual({});
      expect(result.confidence).toBe(0.5);
    });
  });

  describe("edge cases", () => {
    it("handles empty transcript gracefully", async () => {
      const result = await extractToolParameters("quiz", "");

      expect(result.toolName).toBe("quiz");
      expect(result.confidence).toBeLessThan(0.5);
    });

    it("handles unknown tool type", async () => {
      const result = await extractToolParameters("unknown-tool", "test");

      expect(result.toolName).toBe("unknown-tool");
      expect(result.parameters).toEqual({});
      expect(result.confidence).toBe(0);
    });

    it("uses context when transcript is vague", async () => {
      const result = await extractToolParameters(
        "quiz",
        "facciamo un test",
        { maestroSubject: "history", conversationTopics: ["guerra fredda"] },
        { enableAIFallback: false },
      );

      expect(result.parameters.topic).toContain("guerra fredda");
      expect(result.confidence).toBeLessThan(0.7);
    });

    it("handles multiple numbers in transcript", async () => {
      const result = await extractToolParameters(
        "quiz",
        "voglio 3 quiz con 5 domande ciascuno",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.parameters.questionCount).toBe(5); // Takes the second number as question count
    });
  });

  describe("confidence scoring", () => {
    it("returns high confidence with explicit parameters", async () => {
      const result = await extractToolParameters(
        "quiz",
        "crea un quiz di 10 domande difficili sulla fisica quantistica",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("returns low confidence without topic", async () => {
      const result = await extractToolParameters(
        "mindmap",
        "crea una mappa mentale",
        undefined,
        { enableAIFallback: false },
      );

      expect(result.confidence).toBeLessThan(0.5);
    });

    it("returns medium confidence with context fallback", async () => {
      const result = await extractToolParameters(
        "quiz",
        "facciamo un quiz",
        { conversationTopics: ["matematica"] },
        { enableAIFallback: false },
      );

      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.confidence).toBeLessThan(0.8);
    });
  });
});
