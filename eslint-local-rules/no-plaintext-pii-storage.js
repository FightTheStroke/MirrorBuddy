/**
 * ESLint Rule: no-plaintext-pii-storage
 *
 * Detects raw Prisma queries ($queryRaw, $executeRaw) that reference PII fields.
 * These raw queries bypass the PII encryption middleware, which can lead to
 * plaintext PII storage or access.
 *
 * PII fields per model:
 * - User: email
 * - Profile: name
 * - GoogleAccount: email, displayName
 * - CoppaConsent: parentEmail
 * - StudyKit: originalText
 * - HtmlSnippet: html
 *
 * Safe alternatives: Use normal Prisma operations (create, update, findMany, etc.)
 * which automatically go through the PII encryption middleware.
 *
 * @see src/lib/db/pii-middleware.ts
 */

const noPlaintextPiiStorage = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent raw Prisma queries that reference PII fields (bypasses encryption middleware)",
      category: "Security",
      recommended: true,
    },
    messages: {
      plaintextPiiInRawQuery:
        "Direct PII field access in raw queries - use Prisma client with PII middleware. " +
        "Raw query references '{{field}}' which bypasses encryption. " +
        "Use prisma.model.create/update/find* instead of $queryRaw/$executeRaw.",
    },
    schema: [],
  },

  create(context) {
    /**
     * PII fields to detect in raw queries
     * Based on PII_FIELD_MAP from src/lib/db/pii-middleware.ts
     */
    const PII_FIELDS = [
      "email",
      "name",
      "displayName",
      "parentEmail",
      "originalText",
      "html",
    ];

    /**
     * Check if a template literal contains any PII field references
     */
    function checkTemplateForPII(node) {
      // Get the quasi (static parts) of the template literal
      const quasis = node.quasi ? node.quasi.quasis : [];

      for (const quasi of quasis) {
        const sql = quasi.value.raw;

        // Check for each PII field in the SQL string
        for (const field of PII_FIELDS) {
          // Match field name as:
          // - Column name: SELECT email, UPDATE email =, INSERT (email)
          // - Case-insensitive SQL keywords followed by field
          const patterns = [
            // eslint-disable-next-line security/detect-non-literal-regexp -- Dynamic pattern construction for PII field validation
            new RegExp(`\\b${field}\\b`, "i"), // Word boundary match
          ];

          for (const pattern of patterns) {
            if (pattern.test(sql)) {
              context.report({
                node,
                messageId: "plaintextPiiInRawQuery",
                data: { field },
              });
              // Don't break - report all PII fields found in this query
            }
          }
        }
      }
    }

    return {
      /**
       * Detect prisma.$queryRaw`...` and prisma.$executeRaw`...` calls
       */
      TaggedTemplateExpression(node) {
        // Check if this is a $queryRaw or $executeRaw call
        const tag = node.tag;

        // Handle: prisma.$queryRaw`...`
        if (
          tag.type === "MemberExpression" &&
          tag.object?.type === "MemberExpression" &&
          tag.object.object?.name === "prisma" &&
          tag.property?.type === "Identifier" &&
          (tag.property.name === "$queryRaw" ||
            tag.property.name === "$executeRaw")
        ) {
          checkTemplateForPII(node);
        }

        // Handle: tx.$queryRaw`...` (transaction context)
        if (
          tag.type === "MemberExpression" &&
          tag.object?.type === "Identifier" &&
          tag.object.name === "tx" &&
          tag.property?.type === "Identifier" &&
          (tag.property.name === "$queryRaw" ||
            tag.property.name === "$executeRaw")
        ) {
          checkTemplateForPII(node);
        }
      },
    };
  },
};

export default noPlaintextPiiStorage;
