/**
 * ESLint Rule: require-csrf-mutating-routes
 *
 * Warns when POST/PUT/PATCH/DELETE handlers in API routes don't have CSRF protection.
 *
 * Detects two patterns:
 * 1. pipe() middleware: checks for withCSRF in the pipe(...) arguments
 * 2. Legacy function: checks for requireCSRF() call inside the handler
 *
 * Mutating API endpoints MUST validate CSRF tokens to prevent cross-site request
 * forgery attacks.
 *
 * Exemptions (use eslint-disable with reason):
 * - Cron jobs (use CRON_SECRET instead)
 * - Webhooks (use webhook signature verification)
 * - Public endpoints that intentionally don't require CSRF
 * - Realtime collab endpoints (no cookie auth, user from body)
 *
 * ADR: docs/adr/0078-csrf-protection.md
 */

const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

/**
 * Check if an AST node is a call to pipe() that includes withCSRF.
 * Handles: pipe(withSentry, withCSRF, withAuth)(handler)
 *
 * The AST shape is:
 *   CallExpression (outer — pipe(...)(...handler))
 *     callee: CallExpression (inner — pipe(...middlewares))
 *       callee: Identifier "pipe"
 *       arguments: [...middlewares]
 */
function hasCsrfInPipe(initNode) {
  if (!initNode || initNode.type !== "CallExpression") {
    return false;
  }

  // The callee of the outer call should be the pipe() call
  const pipeCall = initNode.callee;
  if (!pipeCall || pipeCall.type !== "CallExpression") {
    return false;
  }

  // Verify it's actually pipe()
  if (
    pipeCall.callee.type !== "Identifier" ||
    pipeCall.callee.name !== "pipe"
  ) {
    return false;
  }

  // Check if any argument is withCSRF (Identifier)
  return pipeCall.arguments.some(
    (arg) => arg.type === "Identifier" && arg.name === "withCSRF",
  );
}

/**
 * Check if an AST node is a pipe()-based handler (regardless of CSRF).
 */
function isPipeHandler(initNode) {
  if (!initNode || initNode.type !== "CallExpression") {
    return false;
  }

  const pipeCall = initNode.callee;
  if (!pipeCall || pipeCall.type !== "CallExpression") {
    return false;
  }

  return (
    pipeCall.callee.type === "Identifier" && pipeCall.callee.name === "pipe"
  );
}

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
        "Mutating API handler should include CSRF protection. Use withCSRF in pipe() or requireCSRF(request) in handler. If intentionally exempt, add: // eslint-disable-next-line local-rules/require-csrf-mutating-routes -- [reason]",
    },
    fixable: undefined,
  },
  create(context) {
    const filename = context.getFilename();

    // Only check API route files
    if (!filename.includes("/app/api/") || !filename.endsWith("route.ts")) {
      return {};
    }

    // Track requireCSRF() calls inside legacy function handlers
    const functionCalls = new Map();
    let currentFunction = null;

    return {
      // ─── Pattern 1: pipe() handlers ───
      // export const POST = pipe(withSentry, withCSRF, withAuth)(handler)
      ExportNamedDeclaration(node) {
        // Handle pipe() pattern: export const POST = pipe(...)(handler)
        if (
          node.declaration &&
          node.declaration.type === "VariableDeclaration"
        ) {
          for (const declarator of node.declaration.declarations) {
            if (
              declarator.id.type === "Identifier" &&
              MUTATING_METHODS.includes(declarator.id.name) &&
              isPipeHandler(declarator.init)
            ) {
              // It's a pipe()-based mutating handler — check for withCSRF
              if (!hasCsrfInPipe(declarator.init)) {
                context.report({
                  node: declarator.id,
                  messageId: "missingCsrf",
                });
              }
            }
          }
        }

        // Handle legacy pattern: export async function POST(...)
        if (
          node.declaration &&
          node.declaration.type === "FunctionDeclaration" &&
          node.declaration.id &&
          MUTATING_METHODS.includes(node.declaration.id.name)
        ) {
          currentFunction = node.declaration.id.name;
          functionCalls.set(currentFunction, {
            node: node.declaration,
            hasRequireCSRF: false,
          });
        }
      },

      // ─── Pattern 2: Legacy function handlers ───
      // export async function POST(request) { requireCSRF(request); ... }
      FunctionDeclaration(node) {
        if (node.id && MUTATING_METHODS.includes(node.id.name)) {
          currentFunction = node.id.name;
          functionCalls.set(currentFunction, {
            node,
            hasRequireCSRF: false,
          });
        }
      },

      // Track calls to requireCSRF inside legacy handlers
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

      // Check legacy function on exit
      "FunctionDeclaration:exit"(node) {
        if (node.id && MUTATING_METHODS.includes(node.id.name)) {
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

      // Also handle exit from exported legacy functions
      "ExportNamedDeclaration:exit"(node) {
        if (
          node.declaration &&
          node.declaration.type === "FunctionDeclaration" &&
          node.declaration.id &&
          MUTATING_METHODS.includes(node.declaration.id.name)
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
