/**
 * ESLint Rule: enforce-module-boundaries
 *
 * Enforces that imports from protected domain modules use barrel exports only.
 * Cross-module deep imports (e.g., @/lib/safety/jailbreak-detector/patterns)
 * are flagged — use @/lib/safety instead.
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
        "Import from protected module '{{ moduleName }}' must use barrel export '@/lib/{{ moduleName }}' instead of '{{ importPath }}'. Deep imports break module encapsulation.",
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

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;

        // Only check @/lib/* imports
        if (!importPath.startsWith("@/lib/")) return;

        // Parse module name: @/lib/{moduleName}/...
        const remainder = importPath.slice("@/lib/".length);
        const slashIndex = remainder.indexOf("/");

        // No slash means barrel import (@/lib/safety) — always OK
        if (slashIndex === -1) return;

        const moduleName = remainder.slice(0, slashIndex);
        const subPath = remainder.slice(slashIndex + 1);

        // Not a protected module — skip
        if (!protectedModules.has(moduleName)) return;

        // Allow @/lib/{module}/index explicitly
        if (subPath === "index" || subPath === "index.ts") return;

        // Allow @/lib/{module}/server for server-only barrel exports
        if (subPath === "server" || subPath === "server.ts") return;

        // Allow intra-module imports (file is inside the same module)
        const filename = context.getFilename();
        const moduleDir = `/lib/${moduleName}/`;
        if (filename.includes(moduleDir)) return;

        context.report({
          node,
          messageId: "useBarrelExport",
          data: { moduleName, importPath },
        });
      },
    };
  },
};

export default enforceModuleBoundaries;
