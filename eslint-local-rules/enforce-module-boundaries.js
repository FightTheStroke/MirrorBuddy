/**
 * ESLint Rule: enforce-module-boundaries
 *
 * Enforces that imports from protected domain modules use barrel exports only.
 * Cross-module deep imports (e.g., @/lib/safety/jailbreak-detector/patterns)
 * are flagged — use @/lib/safety instead.
 *
 * Also checks vi.mock() and dynamic import() paths in test files to ensure
 * they use barrel paths. Mismatched mock paths cause test failures when source
 * files import from barrels but mocks target sub-modules.
 *
 * Intra-module deep imports are allowed (code within the same module can
 * import its own internals freely).
 *
 * Protected modules are defined in eslint.config.mjs via rule options.
 */

const enforceModuleBoundaries = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce barrel-export-only imports for protected domain modules",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      useBarrelExport:
        "Import from protected module '{{ moduleName }}' must use barrel export '@/lib/{{ moduleName }}' (or '@/lib/{{ moduleName }}/server') instead of '{{ importPath }}'. Deep imports break module encapsulation.",
      useBarrelMock:
        "vi.mock('{{ importPath }}') targets a sub-module of protected module '{{ moduleName }}'. Use barrel path '@/lib/{{ moduleName }}' (or '@/lib/{{ moduleName }}/server') to match source imports. See ADR 0045.",
      useBarrelDynamicImport:
        "Dynamic import('{{ importPath }}') targets a sub-module of protected module '{{ moduleName }}'. Use barrel path to match vi.mock() path. See ADR 0045.",
    },
    schema: [
      {
        type: "object",
        properties: {
          protectedModules: {
            type: "array",
            items: { type: "string" },
            description:
              "Module names under src/lib/ that require barrel imports",
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] || {};
    const protectedModules = new Set(options.protectedModules || []);

    if (protectedModules.size === 0) return {};

    /**
     * Check if an import path violates module boundaries.
     * Returns { moduleName, importPath } if violation, null if OK.
     */
    function checkPath(importPath) {
      // Only check @/lib/* imports
      if (!importPath.startsWith("@/lib/")) return null;

      // Parse module name: @/lib/{moduleName}/...
      const remainder = importPath.slice("@/lib/".length);
      const slashIndex = remainder.indexOf("/");

      // No slash means barrel import (@/lib/safety) — always OK
      if (slashIndex === -1) return null;

      const moduleName = remainder.slice(0, slashIndex);
      const subPath = remainder.slice(slashIndex + 1);

      // Not a protected module — skip
      if (!protectedModules.has(moduleName)) return null;

      // Allow @/lib/{module}/index explicitly
      if (subPath === "index" || subPath === "index.ts") return null;

      // Allow @/lib/{module}/server for server-only barrel exports
      if (subPath === "server" || subPath === "server.ts") return null;

      // Allow intra-module imports (file is inside the same module)
      const filename = context.getFilename();
      const moduleDir = `/lib/${moduleName}/`;
      if (filename.includes(moduleDir)) return null;

      return { moduleName, importPath };
    }

    return {
      // Static imports: import { foo } from "@/lib/auth/session-auth"
      ImportDeclaration(node) {
        const result = checkPath(node.source.value);
        if (result) {
          context.report({
            node,
            messageId: "useBarrelExport",
            data: result,
          });
        }
      },

      // vi.mock() and dynamic import() paths
      CallExpression(node) {
        // Check vi.mock("@/lib/module/sub-module")
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.type === "Identifier" &&
          node.callee.object.name === "vi" &&
          node.callee.property.name === "mock" &&
          node.arguments.length >= 1 &&
          node.arguments[0].type === "Literal" &&
          typeof node.arguments[0].value === "string"
        ) {
          const result = checkPath(node.arguments[0].value);
          if (result) {
            context.report({
              node: node.arguments[0],
              messageId: "useBarrelMock",
              data: result,
            });
          }
        }
      },

      // Dynamic imports: await import("@/lib/auth/session-auth")
      ImportExpression(node) {
        if (
          node.source.type === "Literal" &&
          typeof node.source.value === "string"
        ) {
          const result = checkPath(node.source.value);
          if (result) {
            context.report({
              node: node.source,
              messageId: "useBarrelDynamicImport",
              data: result,
            });
          }
        }
      },
    };
  },
};

export default enforceModuleBoundaries;
