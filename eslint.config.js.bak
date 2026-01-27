/**
 * ESLint Configuration for MirrorBuddy
 *
 * ESLint 9 format with custom local rules for i18n enforcement.
 * Custom rule: no-hardcoded-italian - Detects hardcoded Italian strings in JSX
 */

const js = require("@eslint/js");
const securityPlugin = require("eslint-plugin-security");
const localRulesPlugin = require("./eslint-local-rules/index.js");

module.exports = [
  {
    ignores: [
      "node_modules/",
      "dist/",
      "build/",
      ".next/",
      "coverage/",
      ".env*",
      "*.lock",
    ],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      security: securityPlugin,
      "local-rules": localRulesPlugin,
    },
    rules: {
      // Custom local rules for i18n
      "local-rules/no-hardcoded-italian": "warn",

      // Standard ESLint rules
      "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      // Security rules
      "security/detect-object-injection": "off",
    },
  },
  // E2E test configuration
  {
    files: ["e2e/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": "off",
    },
  },
];
