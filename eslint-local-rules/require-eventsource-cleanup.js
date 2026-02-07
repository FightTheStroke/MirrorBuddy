/**
 * ESLint Rule: require-eventsource-cleanup
 *
 * Warns when EventSource is instantiated, reminding developers to call
 * .close() in useEffect cleanup to prevent memory leaks.
 *
 * ADR 0005, 0034: EventSource Lifecycle Management
 */
const requireEventsourceCleanup = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Remind to close EventSource instances in useEffect cleanup",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      closeEventSource:
        "EventSource instances must call .close() in useEffect cleanup to prevent memory leaks. See ADR 0005, 0034.",
    },
    fixable: undefined,
  },
  create(context) {
    return {
      NewExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "EventSource"
        ) {
          context.report({
            node,
            messageId: "closeEventSource",
          });
        }
      },
    };
  },
};

export default requireEventsourceCleanup;
