/**
 * ESLint Rule: no-direct-localstorage
 *
 * Restricts localStorage.setItem() to authorized files only.
 * User data should go through database API.
 * Allowed: consent, trial tracking, accessibility settings.
 *
 * ADR 0015: Data Persistence Strategy
 */
const noDirectLocalstorage = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Restrict localStorage.setItem to authorized files only",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      noLocalStorage:
        "localStorage.setItem is restricted per ADR 0015. Use database API for user data. Allowed: consent, trial tracking, a11y settings only.",
    },
    fixable: undefined,
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.type === "Identifier" &&
          node.callee.object.name === "localStorage" &&
          node.callee.property.name === "setItem"
        ) {
          context.report({
            node,
            messageId: "noLocalStorage",
          });
        }
      },
    };
  },
};

export default noDirectLocalstorage;
