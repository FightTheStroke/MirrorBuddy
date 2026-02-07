/**
 * ESLint Rule: require-email-hash-lookup
 *
 * Detects Prisma findFirst/findMany/findUnique queries on User or
 * GoogleAccount models that use plain `email` in WHERE clauses instead
 * of `emailHash`. Plain email queries bypass PII encryption and will
 * never match encrypted records in the database.
 *
 * Safe pattern:
 *   prisma.user.findFirst({ where: { emailHash: hash } })
 *
 * Unsafe pattern (detected by this rule):
 *   prisma.user.findFirst({ where: { email: value } })
 *
 * Does NOT flag: select: { email: true } (reading result fields is fine)
 *
 * Note: Backward-compat queries that use BOTH emailHash and email
 * should suppress with eslint-disable comment.
 *
 * @see src/lib/db/pii-middleware.ts
 */

const requireEmailHashLookup = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require emailHash instead of email in User/GoogleAccount where clauses",
      category: "Security",
      recommended: true,
    },
    messages: {
      useEmailHash:
        "Use 'emailHash' (via hashPII) instead of 'email' in " +
        "{{model}} where clause. Plain email is PII-encrypted in the " +
        "database and will never match plaintext lookups.",
    },
    schema: [],
  },

  create(context) {
    // Models with PII-encrypted email fields
    const PII_EMAIL_MODELS = ["user", "googleAccount"];

    // Prisma find operations (read queries that use where clauses)
    const FIND_OPERATIONS = ["findFirst", "findMany", "findUnique"];

    /**
     * Recursively search for `email` property keys inside an AST subtree.
     * Only called on the value of `where` properties, so select/include
     * are never traversed.
     */
    function findEmailInWhere(node, results) {
      if (!node || typeof node !== "object") return;

      if (node.type === "Property") {
        const keyName =
          node.key.type === "Identifier"
            ? node.key.name
            : node.key.type === "Literal"
              ? node.key.value
              : null;

        // Flag `email` property inside where clause
        if (keyName === "email") {
          results.push(node);
          return;
        }
      }

      // Recurse into child nodes
      if (node.type === "ObjectExpression") {
        for (const prop of node.properties) {
          findEmailInWhere(prop, results);
        }
      } else if (node.type === "Property" && node.value) {
        findEmailInWhere(node.value, results);
      } else if (node.type === "ArrayExpression") {
        for (const elem of node.elements) {
          findEmailInWhere(elem, results);
        }
      }
    }

    /**
     * Find the `where` property in a Prisma call arguments object,
     * then search inside it for `email` keys.
     */
    function findEmailInArgs(argsObj, results) {
      if (!argsObj || argsObj.type !== "ObjectExpression") return;

      for (const prop of argsObj.properties) {
        if (prop.type !== "Property") continue;

        const keyName = prop.key.type === "Identifier" ? prop.key.name : null;

        // Only search inside `where` property
        if (keyName === "where" && prop.value) {
          findEmailInWhere(prop.value, results);
        }
      }
    }

    return {
      CallExpression(node) {
        // Match: prisma.user.findFirst(...) or tx.user.findFirst(...)
        const callee = node.callee;
        if (callee.type !== "MemberExpression") return;

        // Get the method name (findFirst, findMany, findUnique)
        const methodName =
          callee.property.type === "Identifier" ? callee.property.name : null;
        if (!methodName || !FIND_OPERATIONS.includes(methodName)) return;

        // Get the model name (user, googleAccount)
        const modelAccess = callee.object;
        if (modelAccess.type !== "MemberExpression") return;

        const modelName =
          modelAccess.property.type === "Identifier"
            ? modelAccess.property.name
            : null;
        if (!modelName || !PII_EMAIL_MODELS.includes(modelName)) return;

        // Check the caller object is prisma or tx
        const clientName =
          modelAccess.object.type === "Identifier"
            ? modelAccess.object.name
            : null;
        if (!clientName) return;
        if (clientName !== "prisma" && clientName !== "tx") return;

        // Scan only `where` properties for `email` keys
        if (node.arguments.length === 0) return;

        const argsObj = node.arguments[0];
        const emailProps = [];
        findEmailInArgs(argsObj, emailProps);

        for (const prop of emailProps) {
          context.report({
            node: prop,
            messageId: "useEmailHash",
            data: {
              model: modelName.charAt(0).toUpperCase() + modelName.slice(1),
            },
          });
        }
      },
    };
  },
};

export default requireEmailHashLookup;
