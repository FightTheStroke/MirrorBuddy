/**
 * ESLint Rule: no-direct-ai-provider
 *
 * Enforces using the AI provider router (aiRouter) instead of importing
 * provider implementations directly (AzureOpenAIProvider, ClaudeProvider).
 *
 * CORRECT:
 *   import { aiRouter } from "@/lib/ai/providers/router";
 *   const result = await aiRouter.chatWithFailover(messages, prompt);
 *
 * INCORRECT:
 *   import { AzureOpenAIProvider } from "@/lib/ai/providers/azure-openai";
 *   const provider = new AzureOpenAIProvider();
 *
 * Exceptions:
 * - Test files (*.test.ts, *.spec.ts)
 * - The router itself (router.ts)
 * - Provider implementation files
 *
 * ADR: docs/adr/0130-multi-provider-ai-router.md
 */

const DIRECT_PROVIDER_PATHS = [
  "@/lib/ai/providers/azure-openai",
  "@/lib/ai/providers/claude",
  "@/lib/ai/providers/ollama",
];

const noDirectAiProvider = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce using AI provider router instead of direct provider imports",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      noDirectProvider:
        'Do not import AI providers directly. Use aiRouter from "@/lib/ai/providers/router" for automatic failover. See ADR 0130.',
    },
    fixable: undefined,
  },
  create(context) {
    const filename = context.getFilename();

    // Skip test files
    if (filename.match(/\.(test|spec)\.[jt]sx?$/)) {
      return {};
    }

    // Skip provider implementation files
    if (filename.includes("/ai/providers/")) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (DIRECT_PROVIDER_PATHS.some((p) => source.includes(p))) {
          context.report({
            node,
            messageId: "noDirectProvider",
          });
        }
      },
    };
  },
};

export default noDirectAiProvider;
