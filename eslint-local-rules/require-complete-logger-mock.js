/**
 * ESLint rule: require-complete-logger-mock
 *
 * Ensures that vi.mock("@/lib/logger") includes all required methods
 * both at the root level and in child().
 *
 * The logger is used in two ways:
 * 1. logger.info/warn/error/debug() - direct calls
 * 2. logger.child().info/warn/error/debug() - scoped logging
 *
 * Both must be mocked to avoid "X is not a function" errors.
 */

const requireCompleteLoggerMock = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require complete logger mock with all methods at root and child level",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      incompleteLoggerMock:
        'Logger mock is incomplete. Must include info, warn, error, debug at root level AND in child(). Use the complete mock pattern:\n\nvi.mock("@/lib/logger", () => ({\n  logger: {\n    info: vi.fn(),\n    warn: vi.fn(),\n    error: vi.fn(),\n    debug: vi.fn(),\n    child: () => ({\n      info: vi.fn(),\n      warn: vi.fn(),\n      error: vi.fn(),\n      debug: vi.fn(),\n    }),\n  },\n}));',
    },
    schema: [],
  },

  create(context) {
    const REQUIRED_METHODS = ["info", "warn", "error", "debug"];

    return {
      CallExpression(node) {
        // Check for vi.mock("@/lib/logger", ...)
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.name === "vi" &&
          node.callee.property.name === "mock" &&
          node.arguments.length >= 2
        ) {
          const firstArg = node.arguments[0];

          // Check if mocking @/lib/logger
          if (
            firstArg.type === "Literal" &&
            (firstArg.value === "@/lib/logger" ||
              firstArg.value === "~/lib/logger")
          ) {
            const factoryFn = node.arguments[1];

            // Factory must be an arrow function or function expression
            if (
              factoryFn.type !== "ArrowFunctionExpression" &&
              factoryFn.type !== "FunctionExpression"
            ) {
              return;
            }

            const returnBody = factoryFn.body;
            let returnedObject = null;

            // Handle arrow function with direct object return: () => ({...})
            if (returnBody.type === "ObjectExpression") {
              returnedObject = returnBody;
            }
            // Handle arrow function with block body: () => { return {...} }
            else if (returnBody.type === "BlockStatement") {
              const returnStmt = returnBody.body.find(
                (stmt) => stmt.type === "ReturnStatement"
              );
              if (returnStmt && returnStmt.argument?.type === "ObjectExpression") {
                returnedObject = returnStmt.argument;
              }
            }

            if (!returnedObject) return;

            // Find the 'logger' property
            const loggerProp = returnedObject.properties.find(
              (prop) =>
                prop.type === "Property" &&
                ((prop.key.type === "Identifier" && prop.key.name === "logger") ||
                  (prop.key.type === "Literal" && prop.key.value === "logger"))
            );

            if (!loggerProp || loggerProp.value.type !== "ObjectExpression") {
              return;
            }

            const loggerObj = loggerProp.value;
            const loggerProps = loggerObj.properties.map((p) =>
              p.key?.name || p.key?.value
            );

            // Check root level methods
            const hasRootMethods = REQUIRED_METHODS.every((method) =>
              loggerProps.includes(method)
            );

            // Check for child() method
            const childProp = loggerObj.properties.find(
              (prop) =>
                prop.type === "Property" &&
                ((prop.key.type === "Identifier" && prop.key.name === "child") ||
                  (prop.key.type === "Literal" && prop.key.value === "child"))
            );

            let hasChildMethods = false;
            if (childProp) {
              // child should return an object with the same methods
              const childFn = childProp.value;
              if (
                childFn.type === "ArrowFunctionExpression" ||
                childFn.type === "FunctionExpression"
              ) {
                let childReturnObj = null;
                if (childFn.body.type === "ObjectExpression") {
                  childReturnObj = childFn.body;
                } else if (childFn.body.type === "BlockStatement") {
                  const returnStmt = childFn.body.body.find(
                    (stmt) => stmt.type === "ReturnStatement"
                  );
                  if (returnStmt?.argument?.type === "ObjectExpression") {
                    childReturnObj = returnStmt.argument;
                  }
                }

                if (childReturnObj) {
                  const childProps = childReturnObj.properties.map(
                    (p) => p.key?.name || p.key?.value
                  );
                  hasChildMethods = REQUIRED_METHODS.every((method) =>
                    childProps.includes(method)
                  );
                }
              }
            }

            // Report if incomplete
            if (!hasRootMethods || !hasChildMethods) {
              context.report({
                node,
                messageId: "incompleteLoggerMock",
              });
            }
          }
        }
      },
    };
  },
};

export default requireCompleteLoggerMock;
