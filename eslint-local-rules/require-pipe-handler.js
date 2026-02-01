/**
 * ESLint Rule: require-pipe-handler
 *
 * Warns when API route handlers use the legacy `export async function GET/POST/...`
 * pattern instead of the composable `pipe()` middleware pattern.
 *
 * CORRECT (pipe pattern):
 *   export const GET = pipe(withSentry("/api/path"), withAuth)(async (ctx) => { ... });
 *
 * LEGACY (function pattern):
 *   export async function GET(request: NextRequest) { ... }
 *
 * The pipe() pattern provides:
 * - Automatic error handling with Sentry
 * - Request logging with timing
 * - Composable auth/CSRF middleware
 * - Consistent error responses
 *
 * See: src/lib/api/pipe.ts for implementation
 */

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const requirePipeHandler = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Prefer pipe() middleware pattern over export async function in API routes",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      usePipe:
        'Use pipe() middleware pattern instead of export async function. Example: export const {{method}} = pipe(withSentry("/api/path"))(async (ctx) => { ... })',
    },
    fixable: undefined,
  },
  create(context) {
    const filename = context.getFilename();

    // Only check API route files
    if (!filename.includes("/app/api/") || !filename.endsWith("route.ts")) {
      return {};
    }

    return {
      ExportNamedDeclaration(node) {
        // Detect: export async function GET/POST/... (request: NextRequest)
        if (
          node.declaration &&
          node.declaration.type === "FunctionDeclaration" &&
          node.declaration.id &&
          HTTP_METHODS.includes(node.declaration.id.name)
        ) {
          context.report({
            node: node.declaration.id,
            messageId: "usePipe",
            data: { method: node.declaration.id.name },
          });
        }
      },

      // Also detect: export async function GET at top level (no ExportNamedDeclaration wrapper)
      FunctionDeclaration(node) {
        if (
          node.id &&
          HTTP_METHODS.includes(node.id.name) &&
          node.parent &&
          node.parent.type === "Program"
        ) {
          // Only if it's at the top level (not nested)
          context.report({
            node: node.id,
            messageId: "usePipe",
            data: { method: node.id.name },
          });
        }
      },
    };
  },
};

export default requirePipeHandler;
