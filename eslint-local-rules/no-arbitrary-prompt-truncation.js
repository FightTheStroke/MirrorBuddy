/**
 * ESLint Rule: no-arbitrary-prompt-truncation
 *
 * Prevents .slice() truncation on systemPrompt or instruction strings.
 * These should use structured extraction (e.g., voice-prompt-builder.ts)
 * instead of arbitrary character truncation.
 *
 * @see docs/adr/plan-007-notes.md — W1 learnings
 */

const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow .slice() on systemPrompt or instruction variables',
    },
    messages: {
      noSliceTruncation:
        'Avoid .slice() truncation on system prompts. Use voice-prompt-builder.ts or structured extraction instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        // Check for .slice() calls
        if (
          node.callee.type !== 'MemberExpression' ||
          node.callee.property.name !== 'slice'
        ) {
          return;
        }

        // Get the source code for the object being sliced
        const sourceCode = context.sourceCode || context.getSourceCode();
        const objectText = sourceCode.getText(node.callee.object);

        // Check if it's being called on a prompt-related variable
        const promptPatterns = [
          'systemPrompt',
          'SystemPrompt',
          'instructions',
          'fullInstructions',
          'voiceInstructions',
        ];

        if (promptPatterns.some((p) => objectText.includes(p))) {
          context.report({
            node,
            messageId: 'noSliceTruncation',
          });
        }
      },
    };
  },
};

export default rule;
