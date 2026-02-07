/**
 * ESLint Rule: require-csrf-fetch
 *
 * Enforces csrfFetch for client-side POST/PUT/DELETE requests.
 * Matches method names case-insensitively (POST, post, Post all match).
 *
 * WRONG:  fetch('/api/foo', { method: 'POST' })
 * RIGHT:  csrfFetch('/api/foo', { method: 'POST' })
 *
 * ADR 0078: CSRF Protection
 */

const MUTATING_METHODS = new Set(["post", "put", "delete", "patch"]);

const requireCsrfFetch = {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce csrfFetch for client-side mutating HTTP requests",
      category: "Security",
      recommended: true,
    },
    messages: {
      useCsrfFetch:
        "Use csrfFetch from '@/lib/auth/csrf-client' for {{ method }} requests. Plain fetch fails with 403 in production. See ADR 0078.",
    },
    fixable: undefined,
  },
  create(context) {
    return {
      CallExpression(node) {
        // Only match plain fetch() calls
        if (node.callee.type !== "Identifier" || node.callee.name !== "fetch") {
          return;
        }

        // Look for the options argument (usually 2nd arg)
        for (const arg of node.arguments) {
          if (arg.type !== "ObjectExpression") continue;

          for (const prop of arg.properties) {
            if (
              prop.type === "Property" &&
              prop.key.type === "Identifier" &&
              prop.key.name === "method" &&
              prop.value.type === "Literal" &&
              typeof prop.value.value === "string" &&
              MUTATING_METHODS.has(prop.value.value.toLowerCase())
            ) {
              context.report({
                node,
                messageId: "useCsrfFetch",
                data: { method: prop.value.value.toUpperCase() },
              });
            }
          }
        }
      },
    };
  },
};

export default requireCsrfFetch;
