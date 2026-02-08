/**
 * ESLint Rule: no-literal-strings-in-jsx
 *
 * Language-agnostic rule that flags hardcoded user-visible text in JSX.
 * Complements no-hardcoded-italian (which only catches Italian words)
 * by catching ALL literal strings that should use useTranslations().
 *
 * Start as "warn" to avoid blocking existing code while cleaning up.
 */

// Attributes that contain user-visible text
const TEXT_ATTRIBUTES = ['aria-label', 'title', 'alt', 'placeholder'];

// Brand names and technical terms allowed without i18n
const DEFAULT_ALLOWED = [
  'MirrorBuddy',
  'Melissa',
  'Enea',
  'Azure',
  'Ollama',
  'OpenAI',
  'Web Speech',
  'Azure Realtime',
  'Google',
  'GitHub',
  'Vercel',
  'Europe',
];

/**
 * Check if text should be whitelisted (not flagged).
 *
 * @param {string} text - Trimmed text to check
 * @param {string[]} allowed - Merged allowlist of brand/product names
 * @returns {boolean} true if text should NOT be flagged
 */
function isWhitelisted(text, allowed) {
  // Whitespace-only
  if (/^\s*$/.test(text)) return true;

  // Single character (punctuation, letter, etc.)
  if (text.trim().length <= 1) return true;

  // Punctuation and symbols only (bullets, arrows, etc.)
  if (/^[\s\p{P}\p{S}]*$/u.test(text)) return true;

  // Numbers only (with optional decimal, comma, percent)
  if (/^[\d.,\s%]+$/.test(text)) return true;

  // ALL-CAPS technical terms (API, CSRF, JSON, PDF, HTML, etc.)
  if (/^[A-Z][A-Z0-9_\s]+$/.test(text)) return true;

  // URLs and emails
  if (/^https?:\/\//.test(text) || /@.*\./.test(text)) return true;

  // Brand/product names from allowlist (exact match)
  if (allowed.includes(text)) return true;

  // No actual word characters (2+ consecutive alpha chars)
  if (!/[a-zA-Z\u00C0-\u024F]{2,}/.test(text)) return true;

  return false;
}

const noLiteralStringsInJsx = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detect hardcoded literal strings in JSX and suggest using i18n',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      noLiteralString: "Hardcoded text '{{text}}' in JSX. Use useTranslations() hook for i18n.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowed: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
    fixable: undefined,
  },
  create(context) {
    const options = context.options[0] || {};
    const userAllowed = options.allowed || [];
    const allowed = [...DEFAULT_ALLOWED, ...userAllowed];

    return {
      JSXText(node) {
        const text = node.value.trim();
        if (!text || isWhitelisted(text, allowed)) return;

        // Truncate long text for the error message
        const display = text.length > 40 ? text.slice(0, 37) + '...' : text;
        context.report({
          node,
          messageId: 'noLiteralString',
          data: { text: display },
        });
      },

      JSXAttribute(node) {
        const attrName =
          node.name.type === 'JSXNamespacedName'
            ? `${node.name.namespace.name}:${node.name.name.name}`
            : node.name.type === 'JSXIdentifier'
              ? node.name.name
              : null;

        if (!attrName || !TEXT_ATTRIBUTES.includes(attrName)) return;
        if (!node.value) return;

        // Only check string literals, not expressions like {t("key")}
        if (node.value.type === 'Literal' && typeof node.value.value === 'string') {
          const text = node.value.value;
          if (!text || isWhitelisted(text, allowed)) return;

          const display = text.length > 40 ? text.slice(0, 37) + '...' : text;
          context.report({
            node,
            messageId: 'noLiteralString',
            data: { text: display },
          });
        }
      },
    };
  },
};

export default noLiteralStringsInJsx;
