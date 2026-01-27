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

/**
 * Rule: no-i18n-in-providers
 *
 * Prevents using useTranslations or other next-intl hooks in files that are
 * rendered outside the LocaleProvider context (like providers.tsx).
 *
 * This prevents the "NextIntlClientProvider was not found" error that occurs
 * when i18n-dependent components are rendered before the locale is available.
 *
 * ADR: docs/adr/0083-i18n-context-architecture.md
 */
const noI18nInProviders = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent next-intl hooks in files outside LocaleProvider context",
      category: "Possible Errors",
      recommended: true,
    },
    messages: {
      noI18nInProviders:
        "next-intl hooks (useTranslations, useLocale, etc.) cannot be used in providers.tsx or root layout because NextIntlClientProvider context is not available. Move i18n-dependent components to [locale]/layout.tsx or below. See ADR 0083.",
    },
    fixable: undefined,
  },
  create(context) {
    const filename = context.getFilename();

    // Only check providers.tsx and root layout files
    const isRestrictedFile =
      filename.includes("providers.tsx") ||
      (filename.includes("layout.tsx") &&
        !filename.includes("[locale]") &&
        !filename.includes("admin"));

    if (!isRestrictedFile) {
      return {};
    }

    const forbiddenHooks = [
      "useTranslations",
      "useLocale",
      "useNow",
      "useTimeZone",
      "useFormatter",
      "useMessages",
    ];

    return {
      ImportSpecifier(node) {
        if (
          node.parent.source.value === "next-intl" &&
          forbiddenHooks.includes(node.imported.name)
        ) {
          context.report({
            node,
            messageId: "noI18nInProviders",
          });
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          forbiddenHooks.includes(node.callee.name)
        ) {
          context.report({
            node,
            messageId: "noI18nInProviders",
          });
        }
      },
    };
  },
};

/**
 * Rule: prefer-validate-auth
 *
 * Warns when reading AUTH_COOKIE_NAME directly instead of using validateAuth().
 * Does NOT warn about VISITOR_COOKIE_NAME reads (those are valid for trial handling).
 *
 * ADR: docs/adr/0075-cookie-handling-standards.md
 */
const preferValidateAuth = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Prefer validateAuth() over direct AUTH_COOKIE_NAME reads in API routes",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      preferValidateAuth:
        "Direct read of AUTH_COOKIE_NAME detected. Use validateAuth() or validateAdminAuth() from '@/lib/auth/session-auth' instead. See ADR 0075.",
    },
    fixable: undefined,
  },
  create(context) {
    const filename = context.getFilename();

    // Only check API route files
    if (!filename.includes("/app/api/")) {
      return {};
    }

    // Skip auth implementation files
    if (filename.includes("/api/auth/")) {
      return {};
    }

    return {
      CallExpression(node) {
        // Check for cookieStore.get(AUTH_COOKIE_NAME)
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.name === "cookieStore" &&
          node.callee.property.name === "get" &&
          node.arguments.length > 0
        ) {
          const arg = node.arguments[0];
          // Check if argument is AUTH_COOKIE_NAME identifier
          if (arg.type === "Identifier" && arg.name === "AUTH_COOKIE_NAME") {
            context.report({
              node,
              messageId: "preferValidateAuth",
            });
          }
          // Check if argument is the literal string
          if (
            arg.type === "Literal" &&
            arg.value === "mirrorbuddy-user-id"
          ) {
            context.report({
              node,
              messageId: "preferValidateAuth",
            });
          }
        }
      },
    };
  },
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
    "no-i18n-in-providers": noI18nInProviders,
    "prefer-validate-auth": preferValidateAuth,
  },
};
