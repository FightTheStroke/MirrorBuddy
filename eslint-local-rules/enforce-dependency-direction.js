/**
 * ESLint Rule: enforce-dependency-direction
 *
 * Enforces the dependency direction defined in ADR 0045:
 *   CORE (safety, security, privacy) → no imports from FEATURE or CROSS
 *   FEATURE (ai, education, rag) → may import CORE and other FEATURE, not CROSS (except auth)
 *   CROSS (auth, tier, accessibility, compliance) → may import CORE, FEATURE, and other CROSS
 *
 * Auth is universal: any module may import from auth.
 *
 * Only checks imports between protected modules under @/lib/.
 * Intra-module imports are not checked (handled by enforce-module-boundaries).
 */

const LAYERS = {
  // Core: no external dependencies on other protected modules
  core: ["safety", "security", "privacy"],
  // Feature: may depend on core only
  feature: ["ai", "education", "rag"],
  // Cross-cutting: may depend on core and feature
  cross: ["auth", "tier", "accessibility", "compliance"],
};

// Build lookup: module name → layer
const MODULE_TO_LAYER = {};
for (const [layer, modules] of Object.entries(LAYERS)) {
  for (const mod of modules) {
    MODULE_TO_LAYER[mod] = layer;
  }
}

// Allowed import directions: layer → set of layers it may import from
const ALLOWED_IMPORTS = {
  core: new Set(), // core cannot import from any other protected layer
  feature: new Set(["core", "feature"]), // feature can import from core + peer feature
  cross: new Set(["core", "feature", "cross"]), // cross can import from all layers
};

// Auth is universal exception: any module can import from auth
const UNIVERSAL_MODULES = new Set(["auth"]);

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce dependency direction between protected modules per ADR 0045",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      forbiddenDependency:
        "Module '{{sourceModule}}' ({{sourceLayer}}) cannot import from '{{targetModule}}' ({{targetLayer}}). " +
        "Dependency direction: CORE → FEATURE → CROSS. See ADR 0045.",
    },
    schema: [],
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;

        // Only check @/lib/ imports
        if (!importPath.startsWith("@/lib/")) return;

        const remainder = importPath.slice("@/lib/".length);
        const slashIndex = remainder.indexOf("/");
        const targetModule =
          slashIndex === -1 ? remainder : remainder.slice(0, slashIndex);

        // Only check imports TO protected modules
        const targetLayer = MODULE_TO_LAYER[targetModule];
        if (!targetLayer) return;

        // Universal modules can be imported by anyone
        if (UNIVERSAL_MODULES.has(targetModule)) return;

        // Determine source module from file path
        const filename = context.getFilename();
        const libMatch = filename.match(/\/lib\/([^/]+)\//);
        if (!libMatch) return; // Not inside a protected module

        const sourceModule = libMatch[1];
        const sourceLayer = MODULE_TO_LAYER[sourceModule];
        if (!sourceLayer) return; // Source is not a protected module

        // Intra-module: skip (same module)
        if (sourceModule === targetModule) return;

        // Check if this import direction is allowed
        const allowed = ALLOWED_IMPORTS[sourceLayer];
        if (!allowed.has(targetLayer)) {
          context.report({
            node,
            messageId: "forbiddenDependency",
            data: {
              sourceModule,
              sourceLayer,
              targetModule,
              targetLayer,
            },
          });
        }
      },
    };
  },
};

export default rule;
