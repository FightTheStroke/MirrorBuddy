/**
 * Tests for no-direct-embedding ESLint rule
 *
 * Validates that the rule correctly blocks direct imports of generateEmbedding
 * in non-test files, enforcing use of privacy-aware wrapper.
 */

import { describe, it } from "vitest";
import { RuleTester } from "eslint";
import noDirectEmbedding from "./no-direct-embedding.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

describe("no-direct-embedding", () => {
  it("should block direct generateEmbedding imports in non-test files", () => {
    ruleTester.run("no-direct-embedding", noDirectEmbedding, {
      valid: [
        // Valid: importing from privacy-aware-embedding
        {
          code: 'import { generatePrivacyAwareEmbedding } from "@/lib/rag/privacy-aware-embedding"',
          filename: "src/lib/example.ts",
        },
        // Valid: test file can import directly
        {
          code: 'import { generateEmbedding } from "@/lib/rag/embedding-service"',
          filename: "src/lib/example.test.ts",
        },
        // Valid: test file in __tests__ directory
        {
          code: 'import { generateEmbedding } from "@/lib/rag/embedding-service"',
          filename: "src/lib/__tests__/example.ts",
        },
        // Valid: embedding-service.ts itself
        {
          code: "export function generateEmbedding() {}",
          filename: "src/lib/rag/embedding-service.ts",
        },
        // Valid: privacy-aware-embedding.ts can import from embedding-service
        {
          code: 'import { generateEmbedding } from "./embedding-service"',
          filename: "src/lib/rag/privacy-aware-embedding.ts",
        },
      ],
      invalid: [
        // Invalid: direct import from embedding-service
        {
          code: 'import { generateEmbedding } from "@/lib/rag/embedding-service"',
          filename: "src/lib/tools/example.ts",
          errors: [
            {
              messageId: "usePrivacyAware",
            },
          ],
        },
        // Invalid: relative import from embedding-service
        {
          code: 'import { generateEmbedding } from "./embedding-service"',
          filename: "src/lib/rag/some-file.ts",
          errors: [
            {
              messageId: "usePrivacyAware",
            },
          ],
        },
        // Invalid: generateEmbeddings (plural) is also blocked
        {
          code: 'import { generateEmbeddings } from "@/lib/rag/embedding-service"',
          filename: "src/lib/example.ts",
          errors: [
            {
              messageId: "usePrivacyAware",
            },
          ],
        },
      ],
    });
  });
});
