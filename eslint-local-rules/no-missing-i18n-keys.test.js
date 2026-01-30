/**
 * Tests for no-missing-i18n-keys ESLint rule
 *
 * Validates that the rule correctly detects missing translation keys
 */

import { describe, it } from "vitest";
import { RuleTester } from "eslint";
import { noMissingI18nKeys } from "./no-missing-i18n-keys.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe("no-missing-i18n-keys", () => {
  it("should detect missing translation keys", () => {
    ruleTester.run("no-missing-i18n-keys", noMissingI18nKeys, {
      valid: [
        // Valid: existing keys from common namespace
        {
          code: 'const t = useTranslations("common"); t("loading")',
          filename: "src/components/test.tsx",
        },
        // Valid: namespace that exists
        {
          code: 'useTranslations("auth")',
          filename: "src/components/test.tsx",
        },
      ],
      invalid: [
        // Invalid: non-existent key
        {
          code: 'const t = useTranslations("common"); t("nonExistentKey")',
          filename: "src/components/test.tsx",
          errors: [
            {
              messageId: "missingKey",
            },
          ],
        },
        // Invalid: non-existent namespace
        {
          code: 'useTranslations("nonExistentNamespace")',
          filename: "src/components/test.tsx",
          errors: [
            {
              messageId: "missingNamespace",
            },
          ],
        },
      ],
    });
  });
});
