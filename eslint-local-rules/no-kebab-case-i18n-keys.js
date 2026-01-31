/**
 * ESLint Rule: no-kebab-case-i18n-keys (ADR 0101)
 * Blocks kebab-case translation keys and namespaces.
 */

const isStaticString = (node) => {
  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }

  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis.map((quasi) => quasi.value.cooked).join("");
  }

  return null;
};

const hasKebabCase = (value) => {
  if (!value) return false;
  return value.split(".").some((segment) => segment.includes("-"));
};

export const noKebabCaseI18nKeys = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow kebab-case in i18n keys and namespaces",
      category: "Possible Errors",
      recommended: true,
    },
    messages: {
      noKebabCase:
        "Kebab-case i18n keys are not allowed. Use camelCase instead (ADR 0101).",
    },
    fixable: undefined,
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || node.arguments.length === 0) {
          return;
        }

        const funcName = node.callee.name;
        if (funcName !== "t" && funcName !== "useTranslations" && funcName !== "getTranslations") {
          return;
        }

        const arg = node.arguments[0];
        const value = isStaticString(arg);
        if (!value) return;

        if (hasKebabCase(value)) {
          context.report({
            node: arg,
            messageId: "noKebabCase",
          });
        }
      },
    };
  },
};
