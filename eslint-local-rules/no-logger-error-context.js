/**
 * ESLint Rule: no-logger-error-context
 *
 * Prevents passing Error objects inside context objects to logger.error().
 * Error objects serialize to {} in JSON, losing all useful information.
 *
 * WRONG:  logger.error('msg', { error })
 * RIGHT:  logger.error('msg', context, error)
 * RIGHT:  logger.error('msg', undefined, error)
 *
 * ADR 0076: Centralized Logging with Sentry Integration
 */
const noLoggerErrorContext = {
  meta: {
    type: "problem",
    docs: {
      description: "Prevent passing Error in context object to logger.error()",
      category: "Possible Errors",
      recommended: true,
    },
    messages: {
      noErrorInContext:
        "Don't pass Error in context object - it serializes to {}. Use: logger.error('msg', context, error) or logger.error('msg', undefined, error)",
    },
    fixable: undefined,
  },
  create(context) {
    return {
      CallExpression(node) {
        // Match logger.error(...)
        if (
          node.callee.type !== "MemberExpression" ||
          node.callee.object.type !== "Identifier" ||
          node.callee.object.name !== "logger" ||
          node.callee.property.name !== "error"
        ) {
          return;
        }

        // Check each argument for { error: <Identifier> }
        for (const arg of node.arguments) {
          if (arg.type !== "ObjectExpression") continue;
          for (const prop of arg.properties) {
            if (
              prop.type === "Property" &&
              prop.key.type === "Identifier" &&
              prop.key.name === "error" &&
              prop.value.type === "Identifier"
            ) {
              context.report({
                node: prop,
                messageId: "noErrorInContext",
              });
            }
          }
        }
      },
    };
  },
};

export default noLoggerErrorContext;
