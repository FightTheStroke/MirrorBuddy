/**
 * ESLint Rule: no-missing-i18n-keys
 *
 * Validates that translation keys used in code exist in the message files.
 * Prevents deploying code with missing translations.
 *
 * Checks:
 * - t("key") calls reference existing keys
 * - useTranslations("namespace") calls reference existing namespaces
 * - getTranslations("namespace") calls reference existing namespaces
 *
 * ADR: Task T7-02 - Block missing i18n keys at build time
 */

import fs from "fs";
import path from "path";

const REFERENCE_LOCALE = "it";

// Dynamically load namespaces from filesystem
function loadNamespaceList() {
  const messagesDir = path.join(process.cwd(), "messages", REFERENCE_LOCALE);

  if (!fs.existsSync(messagesDir)) {
    return [];
  }

  return fs
    .readdirSync(messagesDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(".json", ""));
}

const NAMESPACES = loadNamespaceList();

/**
 * Load and cache message files
 */
let messageCache = null;

function loadMessages() {
  if (messageCache) return messageCache;

  const messages = {};
  const messagesDir = path.join(process.cwd(), "messages", REFERENCE_LOCALE);

  for (const ns of NAMESPACES) {
    const filePath = path.join(messagesDir, `${ns}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        messages[ns] = JSON.parse(content);
      } catch (error) {
        // Silent fail - if we can't load, we can't validate
        console.warn(
          `[no-missing-i18n-keys] Failed to load ${filePath}: ${error.message}`,
        );
      }
    }
  }

  messageCache = messages;
  return messages;
}

/**
 * Extract all keys from a nested object
 */
function extractKeys(obj, prefix = "") {
  const keys = new Set();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Recursively extract nested keys
      for (const nestedKey of extractKeys(value, fullKey)) {
        keys.add(nestedKey);
      }
    } else {
      // Add leaf key
      keys.add(fullKey);
    }
  }

  return keys;
}

/**
 * Check if a key exists in the messages
 */
function keyExists(namespace, key) {
  const messages = loadMessages();

  if (!messages[namespace]) {
    return false;
  }

  const allKeys = extractKeys(messages[namespace]);
  return allKeys.has(key);
}

/**
 * Check if a namespace exists
 */
function namespaceExists(namespace) {
  return NAMESPACES.includes(namespace);
}

export const noMissingI18nKeys = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent using translation keys that don't exist in message files",
      category: "Possible Errors",
      recommended: true,
    },
    messages: {
      missingKey:
        'Translation key "{{namespace}}.{{key}}" does not exist in messages/{{locale}}/{{namespace}}.json. Add the key or fix the typo.',
      missingNamespace:
        'Translation namespace "{{namespace}}" does not exist. Available namespaces: {{available}}.',
    },
    fixable: undefined,
  },
  create(context) {
    const filename = context.getFilename();

    // Skip test files and node_modules
    if (
      filename.includes("node_modules") ||
      filename.includes(".test.") ||
      filename.includes("__tests__")
    ) {
      return {};
    }

    // Track the current namespace in scope
    let currentNamespace = null;

    return {
      CallExpression(node) {
        // Check useTranslations("namespace") and getTranslations("namespace")
        if (node.callee.type === "Identifier") {
          const funcName = node.callee.name;

          if (
            (funcName === "useTranslations" ||
              funcName === "getTranslations") &&
            node.arguments.length > 0
          ) {
            const arg = node.arguments[0];
            if (arg.type === "Literal" && typeof arg.value === "string") {
              const namespace = arg.value;

              // Validate namespace exists
              if (!namespaceExists(namespace)) {
                context.report({
                  node: arg,
                  messageId: "missingNamespace",
                  data: {
                    namespace,
                    available: NAMESPACES.join(", "),
                  },
                });
                return;
              }

              // Set current namespace for subsequent t() calls
              currentNamespace = namespace;
            }
          }

          // Check t("key") calls
          if (funcName === "t" && node.arguments.length > 0) {
            const arg = node.arguments[0];
            if (arg.type === "Literal" && typeof arg.value === "string") {
              const key = arg.value;

              // Skip validation if we don't know the namespace
              if (!currentNamespace) {
                return;
              }

              // Validate key exists
              if (!keyExists(currentNamespace, key)) {
                context.report({
                  node: arg,
                  messageId: "missingKey",
                  data: {
                    namespace: currentNamespace,
                    key,
                    locale: REFERENCE_LOCALE,
                  },
                });
              }
            }
          }
        }
      },
    };
  },
};
