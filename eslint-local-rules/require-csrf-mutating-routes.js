/**
 * ESLint Rule: require-csrf-mutating-routes
 *
 * Warns when POST/PUT/PATCH/DELETE handlers in API routes don't call requireCSRF().
 *
 * Mutating API endpoints MUST validate CSRF tokens to prevent cross-site request
 * forgery attacks. This rule detects missing requireCSRF() calls.
 *
 * Exemptions (use eslint-disable with reason):
 * - Cron jobs (use CRON_SECRET instead)
 * - Webhooks (use webhook signature verification)
 * - Public endpoints that intentionally don't require CSRF
 *
 * ADR: docs/adr/0078-csrf-protection.md
 */

const requireCsrfMutatingRoutes = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require CSRF validation in POST/PUT/PATCH/DELETE API route handlers",
      category: "Security",
      recommended: true,
    },
    messages: {
      missingCsrf:
        "Mutating API handler should call requireCSRF(request). If intentionally exempt (cron job, webhook), add: // eslint-disable-next-line local-rules/require-csrf-mutating-routes -- [reason]",
    },
    fixable: undefined,
  },
  create(context) {
    const filename = context.getFilename();

    // Only check API route files
    if (!filename.includes("/app/api/") || !filename.endsWith("route.ts")) {
      return {};
    }

    // Track whether requireCSRF is called in each function
    const functionCalls = new Map();
    let currentFunction = null;

    return {
      // Track when we enter a function
      FunctionDeclaration(node) {
        if (
          node.id &&
          ["POST", "PUT", "PATCH", "DELETE"].includes(node.id.name)
        ) {
          currentFunction = node.id.name;
          functionCalls.set(currentFunction, { node, hasRequireCSRF: false });
        }
      },

      // Also track exported async functions (export async function POST)
      ExportNamedDeclaration(node) {
        if (
          node.declaration &&
          node.declaration.type === "FunctionDeclaration" &&
          node.declaration.id &&
          ["POST", "PUT", "PATCH", "DELETE"].includes(node.declaration.id.name)
        ) {
          currentFunction = node.declaration.id.name;
          functionCalls.set(currentFunction, {
            node: node.declaration,
            hasRequireCSRF: false,
          });
        }
      },

      // Track calls to requireCSRF
      CallExpression(node) {
        if (
          currentFunction &&
          node.callee.type === "Identifier" &&
          node.callee.name === "requireCSRF"
        ) {
          const funcData = functionCalls.get(currentFunction);
          if (funcData) {
            funcData.hasRequireCSRF = true;
          }
        }
      },

      // When we exit a function, check if requireCSRF was called
      "FunctionDeclaration:exit"(node) {
        if (
          node.id &&
          ["POST", "PUT", "PATCH", "DELETE"].includes(node.id.name)
        ) {
          const funcData = functionCalls.get(node.id.name);
          if (funcData && !funcData.hasRequireCSRF) {
            context.report({
              node: node.id,
              messageId: "missingCsrf",
            });
          }
          currentFunction = null;
        }
      },

      // Also handle exit from exported functions
      "ExportNamedDeclaration:exit"(node) {
        if (
          node.declaration &&
          node.declaration.type === "FunctionDeclaration" &&
          node.declaration.id &&
          ["POST", "PUT", "PATCH", "DELETE"].includes(node.declaration.id.name)
        ) {
          const funcData = functionCalls.get(node.declaration.id.name);
          if (funcData && !funcData.hasRequireCSRF) {
            context.report({
              node: node.declaration.id,
              messageId: "missingCsrf",
            });
          }
          currentFunction = null;
        }
      },
    };
  },
};

export default requireCsrfMutatingRoutes;
