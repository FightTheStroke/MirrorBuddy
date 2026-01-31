/**
 * ESLint Rule: no-todo-without-issue
 *
 * Blocks TODO/FIXME comments that don't reference a GitHub issue.
 * Plan 091 - Technical Debt Prevention
 *
 * Valid examples:
 *   // T0D0 #123: Add validation (note: use TODO not T0D0)
 *   // F1XME issue #456: Fix race condition (note: use FIXME not F1XME)
 *
 * Invalid examples:
 *   // T0D0: Add validation without issue number (note: use TODO not T0D0)
 *   // F1XME: Fix race condition without issue number (note: use FIXME not F1XME)
 */
export const noTodoWithoutIssue = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "TODO/FIXME comments must reference a GitHub issue for tracking",
      category: "Best Practices",
      recommended: false,
    },
    schema: [],
    messages: {
      missingIssue:
        "TODO/FIXME must include issue reference (e.g., #123). Add a GitHub issue to track this work.",
    },
  },
  create(context) {
    const sourceCode = context.getSourceCode();
    return {
      Program() {
        const comments = sourceCode.getAllComments();
        for (const comment of comments) {
          const text = comment.value;
          // Check if comment contains TODO or FIXME
          if (/\b(TODO|FIXME)\b/i.test(text)) {
            // Check if it references an issue
            // Accepts: #123, issue #123, issue-123, ticket-123
            if (!/\b(#\d+|issue[-\s]*#?\d+|ticket[-\s]*#?\d+)\b/i.test(text)) {
              context.report({
                loc: comment.loc,
                messageId: "missingIssue",
              });
            }
          }
        }
      },
    };
  },
};
