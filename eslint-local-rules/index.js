/**
 * ESLint Local Rules Plugin
 *
 * Exports custom ESLint rules for MirrorBuddy project.
 */

// Common Italian words and patterns for detection
const ITALIAN_COMMON_WORDS = [
  "ciao",
  "salve",
  "benvenuto",
  "benvenuta",
  "accedi",
  "esci",
  "uscire",
  "profilo",
  "impostazioni",
  "aiuto",
  "chi siamo",
  "contatti",
  "condizioni",
  "grazie",
  "prego",
  "errore",
  "attenzione",
  "successo",
  "sì",
  "si",
  "annulla",
  "conferma",
  "salva",
  "carica",
  "scarica",
  "elimina",
  "modifica",
  "nuovo",
  "ricerca",
  "risultati",
  "nessun",
  "vuoto",
  "caricamento",
  "in corso",
];

// Pattern to detect Italian text (accented characters common in Italian)
const ITALIAN_PATTERN = /[àèéìòùù]/i;

const containsItalian = (text) => {
  const lowercased = text.toLowerCase().trim();

  // Check for Italian accented characters
  if (ITALIAN_PATTERN.test(text)) {
    return true;
  }

  // Check for common Italian words
  for (const word of ITALIAN_COMMON_WORDS) {
    // Use word boundary that includes punctuation and end of string
    // eslint-disable-next-line security/detect-non-literal-regexp
    const wordPattern = new RegExp(
      `(^|\\s)${word}(\\s|[^a-zàèéìòùù]|$)`,
      "i"
    );
    if (wordPattern.test(lowercased)) {
      return true;
    }
  }

  return false;
};

const noHardcodedItalian = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Detect hardcoded Italian strings in JSX and suggest using i18n",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/FightTheStroke/MirrorBuddy/blob/main/eslint-local-rules/README.md",
    },
    messages: {
      hardcodedItalian:
        "Hardcoded Italian text detected in JSX. Use useTranslations() hook instead for i18n support.",
    },
    fixable: undefined,
  },
  create(context) {
    return {
      JSXText(node) {
        const text = node.value;

        // Skip empty text or whitespace-only text
        if (!text || !text.trim()) {
          return;
        }

        // Skip if text contains only numbers or special characters
        if (!/[a-zàèéìòùù]/i.test(text)) {
          return;
        }

        if (containsItalian(text)) {
          context.report({
            node,
            messageId: "hardcodedItalian",
          });
        }
      },
    };
  },
};

module.exports = {
  rules: {
    "no-hardcoded-italian": noHardcodedItalian,
  },
};
