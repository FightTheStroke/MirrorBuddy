/**
 * ESLint Rule: no-hardcoded-strings-in-tests
 *
 * Prevents hardcoded Italian strings in test files.
 * Tests should use i18n-helpers.ts functions like getTranslation() instead.
 *
 * This ensures translations can change without breaking tests.
 *
 * @example
 * // ❌ Bad
 * expect(screen.getByText("Limiti della Prova")).toBeInTheDocument();
 *
 * // ✅ Good
 * expect(screen.getByText(getTranslation("auth.trial.title"))).toBeInTheDocument();
 */

// Common Italian words that indicate hardcoded strings
const ITALIAN_WORDS = [
  "limiti",
  "limite",
  "prova",
  "gratuita",
  "messaggi",
  "giorno",
  "voce",
  "strumenti",
  "maestri",
  "disponibili",
  "registrati",
  "salva",
  "annulla",
  "conferma",
  "elimina",
  "modifica",
  "carica",
  "scarica",
  "impostazioni",
  "profilo",
  "accedi",
  "esci",
  "benvenuto",
  "errore",
  "successo",
  "attenzione",
  "caricamento",
  "nessun",
  "vuoto",
  "seleziona",
  "aggiungi",
  "rimuovi",
  "crea",
  "apri",
  "chiudi",
  "avanti",
  "indietro",
  "continua",
  "completa",
  "inizia",
  "termina",
  "ripristina",
  "ripeti",
  "riprova",
  "invia",
  "cerca",
  "filtra",
  "ordina",
  "mostra",
  "nascondi",
  "espandi",
  "comprimi",
  "abilita",
  "disabilita",
  "attiva",
  "disattiva",
];

// Italian accented characters pattern
const ITALIAN_ACCENT_PATTERN = /[àèéìòù]/i;

/**
 * Check if a string contains Italian text
 */
function containsItalianText(text) {
  if (!text || typeof text !== "string") return false;

  const lowercased = text.toLowerCase().trim();

  // Check for Italian accented characters
  if (ITALIAN_ACCENT_PATTERN.test(text)) {
    return true;
  }

  // Check for common Italian words
  for (const word of ITALIAN_WORDS) {
    // Word boundary check that handles Italian characters
    // eslint-disable-next-line security/detect-non-literal-regexp -- safe: word is from hardcoded ITALIAN_WORDS array
    const wordPattern = new RegExp(`(^|[^a-zàèéìòù])${word}([^a-zàèéìòù]|$)`, "i");
    if (wordPattern.test(lowercased)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if argument is a hardcoded Italian string
 */
function isHardcodedItalianString(node) {
  if (!node) return false;

  // Direct string literal
  if (node.type === "Literal" && typeof node.value === "string") {
    return containsItalianText(node.value);
  }

  // Template literal without expressions
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    const text = node.quasis.map((q) => q.value.cooked).join("");
    return containsItalianText(text);
  }

  // RegExp with Italian text
  if (node.type === "NewExpression" && node.callee.name === "RegExp") {
    const arg = node.arguments[0];
    if (arg && arg.type === "Literal" && typeof arg.value === "string") {
      return containsItalianText(arg.value);
    }
  }

  // Regex literal
  if (node.type === "Literal" && node.regex) {
    return containsItalianText(node.regex.pattern);
  }

  return false;
}

const noHardcodedStringsInTests = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent hardcoded Italian strings in test files. Use getTranslation() from @/test/i18n-helpers instead.",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      hardcodedString:
        'Hardcoded Italian string "{{text}}" in test. Use getTranslation("key") from @/test/i18n-helpers instead.',
      hardcodedRegex:
        "Hardcoded Italian pattern in RegExp. Use getTranslation() to build patterns dynamically.",
    },
    fixable: undefined,
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    // Only apply to test files
    if (!filename.includes(".test.") && !filename.includes(".spec.")) {
      return {};
    }

    // Skip i18n helper files themselves
    if (filename.includes("i18n-helpers") || filename.includes("i18n-check")) {
      return {};
    }

    return {
      // Check screen.getByText("Italian text")
      CallExpression(node) {
        // Check getByText, getByRole with name, toContainText, toHaveText
        const callee = node.callee;
        let methodName = null;

        if (callee.type === "MemberExpression") {
          methodName = callee.property.name;
        } else if (callee.type === "Identifier") {
          methodName = callee.name;
        }

        if (!methodName) return;

        // Text query methods
        const textMethods = [
          "getByText",
          "queryByText",
          "findByText",
          "getAllByText",
          "queryAllByText",
          "findAllByText",
          "toContainText",
          "toHaveText",
          "toHaveTextContent",
        ];

        if (textMethods.includes(methodName)) {
          const arg = node.arguments[0];
          if (isHardcodedItalianString(arg)) {
            const text =
              (arg.type === "Literal" && typeof arg.value === "string")
                ? arg.value
                : arg.quasis?.map((q) => q.value.cooked).join("") || "";
            context.report({
              node: arg,
              messageId: "hardcodedString",
              data: { text: text.slice(0, 30) + (text.length > 30 ? "..." : "") },
            });
          }
        }

        // getByRole with name option
        if (methodName === "getByRole" || methodName === "findByRole") {
          const options = node.arguments[1];
          if (options && options.type === "ObjectExpression") {
            const nameProp = options.properties.find(
              (p) => p.key && p.key.name === "name"
            );
            if (nameProp && isHardcodedItalianString(nameProp.value)) {
              const text =
                (nameProp.value.type === "Literal" && typeof nameProp.value.value === "string") ? nameProp.value.value : "";
              context.report({
                node: nameProp.value,
                messageId: "hardcodedString",
                data: {
                  text: text.slice(0, 30) + (text.length > 30 ? "..." : ""),
                },
              });
            }
          }
        }
      },
    };
  },
};

export default noHardcodedStringsInTests;
