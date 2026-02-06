/**
 * Privacy-Aware Embedding Integration Tests
 * Part of Ethical Design Hardening (F-01)
 *
 * Tests that verify PII is removed from content before generating embeddings
 * for the RAG pipeline, ensuring privacy-by-design compliance.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generatePrivacyAwareEmbedding,
  generatePrivacyAwareEmbeddingWithMetadata,
  generatePrivacyAwareEmbeddings,
  requiresAnonymization,
  anonymizeConversationForRAG,
} from "../privacy-aware-embedding";
import * as embeddingService from "../embedding-service";

// Mock only the embedding service to test actual anonymization
vi.mock("../embedding-service", () => ({
  generateEmbedding: vi.fn(),
  generateEmbeddings: vi.fn(),
}));

describe("privacy-aware-embedding", () => {
  const mockEmbeddingResult = {
    vector: Array(1536).fill(0.1),
    model: "text-embedding-3-small",
    usage: { tokens: 10 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(embeddingService.generateEmbedding).mockResolvedValue(
      mockEmbeddingResult,
    );
    vi.mocked(embeddingService.generateEmbeddings).mockResolvedValue([
      mockEmbeddingResult,
    ]);
  });

  describe("generatePrivacyAwareEmbedding", () => {
    it("should anonymize phone numbers before embedding", async () => {
      const textWithPhone = "Call me at +39 333 1234567 for details";

      await generatePrivacyAwareEmbedding(textWithPhone);

      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining("[PHONE]"),
      );
      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.not.stringContaining("+39 333 1234567"),
      );
    });

    it("should anonymize Italian fiscal codes before embedding", async () => {
      const textWithFiscalCode = "Il mio codice fiscale è RSSMRA85M01H501Z";

      await generatePrivacyAwareEmbedding(textWithFiscalCode);

      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining("[ID]"),
      );
      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.not.stringContaining("RSSMRA85M01H501Z"),
      );
    });

    it("should anonymize names and emails before embedding", async () => {
      const textWithPII = "John studied with Maria at john@example.com";

      await generatePrivacyAwareEmbedding(textWithPII);

      const callArg = vi.mocked(embeddingService.generateEmbedding).mock
        .calls[0][0];
      expect(callArg).toContain("[NAME]");
      expect(callArg).toContain("[EMAIL]");
      expect(callArg).not.toContain("john@example.com");
    });

    it("should anonymize addresses before embedding", async () => {
      const textWithAddress = "I live at Via Roma 123, Milano";

      await generatePrivacyAwareEmbedding(textWithAddress);

      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining("[ADDRESS]"),
      );
    });

    it("should handle text without PII normally", async () => {
      const textWithoutPII = "Today we learn mathematics and science";

      await generatePrivacyAwareEmbedding(textWithoutPII);

      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        textWithoutPII,
      );
    });

    it("should return embedding result with correct structure", async () => {
      const text = "Test content";

      const result = await generatePrivacyAwareEmbedding(text);

      expect(result).toEqual(mockEmbeddingResult);
      expect(result.vector).toHaveLength(1536);
      expect(result.model).toBe("text-embedding-3-small");
    });

    it("should anonymize multiple PII types in single text", async () => {
      const complexText =
        "Contact Mario Rossi at mario.rossi@example.com or +39 333 1234567";

      await generatePrivacyAwareEmbedding(complexText);

      const callArg = vi.mocked(embeddingService.generateEmbedding).mock
        .calls[0][0];
      expect(callArg).toContain("[NAME]");
      expect(callArg).toContain("[EMAIL]");
      expect(callArg).toContain("[PHONE]");
      expect(callArg).not.toContain("mario.rossi@example.com");
      expect(callArg).not.toContain("+39 333 1234567");
    });
  });

  describe("locale-specific PII anonymization", () => {
    it("should anonymize French NIR (social security number)", async () => {
      const frenchPII = "Mon numéro NIR est 1 89 05 49 588 157 80";

      await generatePrivacyAwareEmbedding(frenchPII);

      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining("[ID]"),
      );
      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.not.stringContaining("1 89 05 49 588 157 80"),
      );
    });

    it("should anonymize German phone numbers", async () => {
      const germanPhone = "Meine Nummer ist 0151 23456789";

      await generatePrivacyAwareEmbedding(germanPhone);

      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining("[PHONE]"),
      );
      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.not.stringContaining("0151 23456789"),
      );
    });

    it("should anonymize Spanish DNI", async () => {
      const spanishDNI = "Mi DNI es 12345678Z";

      await generatePrivacyAwareEmbedding(spanishDNI);

      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining("[ID]"),
      );
      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.not.stringContaining("12345678Z"),
      );
    });

    it("should anonymize UK postal codes", async () => {
      const ukAddress = "My address is SW1A 1AA, London";

      await generatePrivacyAwareEmbedding(ukAddress);

      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining("[ADDRESS]"),
      );
      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.not.stringContaining("SW1A 1AA"),
      );
    });

    it("should anonymize French names with diacritics", async () => {
      const frenchName = "Je m'appelle François Dubois";

      await generatePrivacyAwareEmbedding(frenchName);

      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining("[NAME]"),
      );
    });

    it("should anonymize German street addresses", async () => {
      const germanAddress = "Ich wohne in der Hauptstraße 45, Berlin";

      await generatePrivacyAwareEmbedding(germanAddress);

      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining("[ADDRESS]"),
      );
    });

    it("should anonymize US Social Security Numbers", async () => {
      const usSSN = "My SSN is 123-45-6789";

      await generatePrivacyAwareEmbedding(usSSN);

      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining("[ID]"),
      );
      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.not.stringContaining("123-45-6789"),
      );
    });
  });

  describe("generatePrivacyAwareEmbeddingWithMetadata", () => {
    it("should include anonymization metadata when PII is detected", async () => {
      const textWithPII = "Contact John at john@example.com";

      const result =
        await generatePrivacyAwareEmbeddingWithMetadata(textWithPII);

      expect(result.wasAnonymized).toBe(true);
      expect(result.piiRemoved).toContain("name");
      expect(result.piiRemoved).toContain("email");
    });

    it("should indicate no anonymization when no PII present", async () => {
      const textWithoutPII = "Today we learn mathematics";

      const result =
        await generatePrivacyAwareEmbeddingWithMetadata(textWithoutPII);

      expect(result.wasAnonymized).toBe(false);
      expect(result.piiRemoved).toEqual([]);
    });

    it("should force anonymization when forceAnonymization is true", async () => {
      const text = "Contact Maria at maria@test.com";

      const result = await generatePrivacyAwareEmbeddingWithMetadata(text, {
        forceAnonymization: true,
      });

      expect(result.wasAnonymized).toBe(true);
      expect(result.piiRemoved.length).toBeGreaterThan(0);
    });

    it("should include content hash when storeContentHash is true", async () => {
      const text = "Test content";

      const result = await generatePrivacyAwareEmbeddingWithMetadata(text, {
        storeContentHash: true,
      });

      expect(result.contentHash).toBeDefined();
      expect(result.contentHash).toMatch(/^h_[0-9a-f]+$/);
    });

    it("should not include content hash by default", async () => {
      const text = "Test content";

      const result = await generatePrivacyAwareEmbeddingWithMetadata(text);

      expect(result.contentHash).toBeUndefined();
    });
  });

  describe("generatePrivacyAwareEmbeddings (batch)", () => {
    it("should anonymize multiple texts before batch embedding", async () => {
      const texts = [
        "Contact Mario at mario@example.com",
        "Call Anna at +39 333 9876543",
        "No PII here",
      ];

      vi.mocked(embeddingService.generateEmbeddings).mockResolvedValue([
        mockEmbeddingResult,
        mockEmbeddingResult,
        mockEmbeddingResult,
      ]);

      await generatePrivacyAwareEmbeddings(texts);

      const callArg = vi.mocked(embeddingService.generateEmbeddings).mock
        .calls[0][0];
      // Accept both [NAME] and [NOME] (Italian) placeholders
      expect(callArg[0]).toMatch(/\[(NAME|NOME)\]/);
      expect(callArg[0]).toContain("[EMAIL]");
      expect(callArg[0]).not.toContain("mario@example.com");
      expect(callArg[1]).toMatch(/\[(NAME|NOME)\]/);
      expect(callArg[1]).toContain("[PHONE]");
      expect(callArg[1]).not.toContain("+39 333 9876543");
      expect(callArg[2]).toBe("No PII here");
    });

    it("should return metadata for each text in batch", async () => {
      const texts = ["Contact John at john@example.com", "No PII here"];

      vi.mocked(embeddingService.generateEmbeddings).mockResolvedValue([
        mockEmbeddingResult,
        mockEmbeddingResult,
      ]);

      const results = await generatePrivacyAwareEmbeddings(texts);

      expect(results).toHaveLength(2);
      expect(results[0].wasAnonymized).toBe(true);
      expect(results[0].piiRemoved.length).toBeGreaterThan(0);
      expect(results[1].wasAnonymized).toBe(false);
      expect(results[1].piiRemoved).toEqual([]);
    });
  });

  describe("requiresAnonymization", () => {
    it("should detect when anonymization is required", () => {
      const textWithSensitivePII = "Contact John at john@example.com";

      const result = requiresAnonymization(textWithSensitivePII);

      expect(result.required).toBe(true);
      expect(result.piiTypes).toContain("name");
      expect(result.piiTypes).toContain("email");
    });

    it("should detect no anonymization needed for safe content", () => {
      const safeText = "Today we learn about mathematics";

      const result = requiresAnonymization(safeText);

      expect(result.required).toBe(false);
      expect(result.piiTypes).toEqual([]);
    });
  });

  describe("anonymizeConversationForRAG", () => {
    it("should anonymize only user messages", () => {
      const conversation = [
        {
          role: "user" as const,
          content: "I'm Mario Rossi at mario@example.com",
        },
        { role: "assistant" as const, content: "Hello! How can I help you?" },
        { role: "user" as const, content: "Call me at +39 333 1234567" },
      ];

      const result = anonymizeConversationForRAG(conversation);

      // Accept both [NAME] and [NOME] (Italian) placeholders
      expect(result.anonymizedConversation[0].content).toMatch(
        /\[(NAME|NOME)\]/,
      );
      expect(result.anonymizedConversation[0].content).toContain("[EMAIL]");
      expect(result.anonymizedConversation[0].content).not.toContain(
        "mario@example.com",
      );
      expect(result.anonymizedConversation[1].content).toBe(
        "Hello! How can I help you?",
      );
      expect(result.anonymizedConversation[2].content).toContain("[PHONE]");
    });

    it("should count total PII removed across conversation", () => {
      const conversation = [
        {
          role: "user" as const,
          content: "I'm Mario Rossi at mario@example.com",
        },
        { role: "user" as const, content: "Call me at +39 333 1234567" },
      ];

      const result = anonymizeConversationForRAG(conversation);

      expect(result.totalPIIRemoved).toBeGreaterThan(0);
    });

    it("should preserve assistant messages unchanged", () => {
      const assistantMessage = "I can help you with that question.";
      const conversation = [
        { role: "assistant" as const, content: assistantMessage },
      ];

      const result = anonymizeConversationForRAG(conversation);

      expect(result.anonymizedConversation[0].content).toBe(assistantMessage);
      expect(result.totalPIIRemoved).toBe(0);
    });
  });
});
