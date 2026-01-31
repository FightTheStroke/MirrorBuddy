/**
 * ESLint Rule: require-e2e-fixtures
 *
 * Prevents importing test/expect from @playwright/test directly in E2E specs.
 * All specs MUST import from fixtures to ensure wall bypasses (TOS mock,
 * consent cookies) are automatically applied.
 *
 * Without these bypasses, TosGateProvider shows a modal overlay that blocks
 * ALL pointer events, causing systematic test failures (ADR 0059).
 *
 * Allowed imports:
 * - "./fixtures" or "./fixtures/base-fixtures" or "./fixtures/auth-fixtures"
 * - "./fixtures/locale-fixtures" (chains from base-fixtures)
 * - "../fixtures" variants (for nested test directories)
 *
 * Exceptions:
 * - e2e/fixtures/ directory itself (fixture implementation files)
 */

const requireE2eFixtures = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require E2E specs to import from fixtures, not @playwright/test",
      category: "Possible Errors",
      recommended: true,
    },
    messages: {
      useFixtures:
        'Import {{ name }} from fixtures (e.g. "./fixtures/base-fixtures")' +
        ' instead of "@playwright/test". Fixtures auto-apply /api/tos mock' +
        " and wall bypasses required by ADR 0059.",
    },
    fixable: undefined,
  },
  create(context) {
    const filename = context.getFilename();

    // Only apply to E2E spec files
    if (!filename.includes(".spec.ts") && !filename.includes(".spec.js")) {
      return {};
    }

    // Skip fixture implementation files themselves
    if (filename.includes("/fixtures/")) {
      return {};
    }

    // Skip files that don't live under e2e/
    if (!filename.includes("/e2e/") && !filename.includes("\\e2e\\")) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        if (node.source.value !== "@playwright/test") {
          return;
        }

        // Check if importing test or expect (type-only imports are OK)
        const problemImports = node.specifiers.filter(
          (s) =>
            s.type === "ImportSpecifier" &&
            (s.imported.name === "test" || s.imported.name === "expect"),
        );

        for (const spec of problemImports) {
          context.report({
            node: spec,
            messageId: "useFixtures",
            data: { name: spec.imported.name },
          });
        }
      },
    };
  },
};

export default requireE2eFixtures;
