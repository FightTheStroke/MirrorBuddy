/**
 * ESLint Rule: no-direct-embedding
 *
 * Prevents direct imports of generateEmbedding/generateEmbeddings from
 * embedding-service.ts in non-test files. Enforces use of privacy-aware
 * wrapper (generatePrivacyAwareEmbedding) to prevent PII leakage into
 * vector embeddings.
 *
 * Valid imports:
 * - generatePrivacyAwareEmbedding from @/lib/rag/privacy-aware-embedding
 *
 * Blocked imports (in non-test files):
 * - generateEmbedding from @/lib/rag/embedding-service
 * - generateEmbeddings from @/lib/rag/embedding-service
 *
 * Exceptions:
 * - *.test.ts, *.test.tsx files (test files)
 * - __tests__/ directories
 * - embedding-service.ts itself (source of truth)
 * - privacy-aware-embedding.ts (needs to import the underlying service)
 */

const noDirectEmbedding = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Block direct imports of generateEmbedding to enforce privacy-aware wrapper usage",
      category: "Security",
      recommended: true,
    },
    messages: {
      usePrivacyAware:
        "Use generatePrivacyAwareEmbedding from @/lib/rag/privacy-aware-embedding instead of direct generateEmbedding import. This prevents PII leakage into vector embeddings.",
    },
    fixable: undefined,
  },
  create(context) {
    const filename = context.getFilename();

    // Exempt test files
    if (
      filename.includes(".test.ts") ||
      filename.includes(".test.tsx") ||
      filename.includes("__tests__")
    ) {
      return {};
    }

    // Exempt embedding-service.ts itself
    if (filename.includes("embedding-service.ts")) {
      return {};
    }

    // Exempt privacy-aware-embedding.ts (needs to import from embedding-service)
    if (filename.includes("privacy-aware-embedding.ts")) {
      return {};
    }

    const blockedImports = ["generateEmbedding", "generateEmbeddings"];

    return {
      ImportDeclaration(node) {
        const importSource = node.source.value;

        // Check if importing from embedding-service
        // Match both alias paths (@/lib/rag/embedding-service) and relative paths (./embedding-service)
        const isEmbeddingServiceImport =
          importSource.includes("embedding-service") &&
          !importSource.includes("privacy-aware-embedding");

        if (!isEmbeddingServiceImport) {
          return;
        }

        // Check if any of the imported names are blocked
        const problemImports = node.specifiers.filter(
          (s) =>
            s.type === "ImportSpecifier" &&
            blockedImports.includes(s.imported.name),
        );

        for (const spec of problemImports) {
          context.report({
            node: spec,
            messageId: "usePrivacyAware",
          });
        }
      },
    };
  },
};

export default noDirectEmbedding;
