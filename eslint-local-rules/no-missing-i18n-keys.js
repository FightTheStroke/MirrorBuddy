/**
 * ESLint Rule: no-missing-i18n-keys (T7-02)
 * Validates translation keys/namespaces exist in message files.
 * Supports dotted sub-path namespaces (e.g. "education.knowledgeHub").
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
    if (fs.existsSync(filePath)) { // eslint-disable-line security/detect-non-literal-fs-filename
      try {
        const content = fs.readFileSync(filePath, "utf-8"); // eslint-disable-line security/detect-non-literal-fs-filename
        const parsed = JSON.parse(content);
        // Store the full parsed JSON content under the namespace key.
        // This matches the runtime behavior in src/i18n/request.ts:
        // messages[ns] = nsData (where nsData is the complete parsed file).
        // Each JSON file has ALL content wrapped under a single key matching
        // the filename (e.g., compliance.json = { "compliance": { ... } }).
        messages[ns] = parsed;
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
 * Resolve a namespace string to its file and optional sub-path.
 * "education" -> { file: "education", subPath: null }
 * "education.knowledgeHub" -> { file: "education", subPath: "knowledgeHub" }
 * Returns null if no matching file exists.
 */
function resolveNamespace(namespace) {
  if (NAMESPACES.includes(namespace)) {
    return { file: namespace, subPath: null };
  }

  const dotIndex = namespace.indexOf(".");
  if (dotIndex > 0) {
    const fileNs = namespace.substring(0, dotIndex);
    const subPath = namespace.substring(dotIndex + 1);
    if (NAMESPACES.includes(fileNs)) {
      return { file: fileNs, subPath };
    }
  }

  return null;
}

/**
 * Navigate into a nested object following a dot-separated path.
 * Returns the nested value or undefined if path is invalid.
 */
function getNestedValue(obj, dotPath) {
  const parts = dotPath.split(".");
  let current = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

/**
 * Check if a key exists in the messages for a given namespace.
 * Handles dotted sub-path namespaces (e.g. "education.knowledgeHub").
 *
 * CRITICAL: JSON files have ALL content wrapped under a single key matching
 * the filename. So common.json = { "common": { "login": "..." } }.
 * When checking if key "login" exists in namespace "common", we need to
 * look for "common.login" in the extracted keys.
 */
function keyExists(namespace, key) {
  const messages = loadMessages();
  const resolved = resolveNamespace(namespace);

  if (!resolved || !messages[resolved.file]) {
    return false;
  }

  const allKeys = extractKeys(messages[resolved.file]);
  // Build the full key path: namespace.subPath.key or namespace.key
  const fullKey = resolved.subPath
    ? `${resolved.file}.${resolved.subPath}.${key}`
    : `${resolved.file}.${key}`;
  return allKeys.has(fullKey);
}

/**
 * Check if a namespace exists.
 * Supports dotted sub-paths: "education.knowledgeHub" checks that
 * education.json exists AND has a "knowledgeHub" object key.
 *
 * CRITICAL: JSON files have ALL content wrapped under a single key matching
 * the filename. So education.json = { "education": { "knowledgeHub": {...} } }.
 * To check if "knowledgeHub" sub-path exists, we need to navigate:
 * messages["education"]["education"]["knowledgeHub"]
 */
function namespaceExists(namespace) {
  const resolved = resolveNamespace(namespace);
  if (!resolved) return false;
  if (!resolved.subPath) return true;

  const messages = loadMessages();
  const nsMessages = messages[resolved.file];
  if (!nsMessages) return false;

  // Navigate into the wrapper key first, then the subPath
  const fullPath = `${resolved.file}.${resolved.subPath}`;
  const nested = getNestedValue(nsMessages, fullPath);
  return typeof nested === "object" && nested !== null;
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
