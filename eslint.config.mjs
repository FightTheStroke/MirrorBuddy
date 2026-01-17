import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Coverage reports
    "coverage/**",
  ]),
  // Custom rules
  {
    rules: {
      // Allow unused variables prefixed with underscore
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Prevent logger.error('msg', { error }) - Error objects don't serialize in JSON
      // CORRECT: logger.error('msg', context, error) or logger.error('msg', undefined, error)
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.object.name='logger'][callee.property.name='error'] > ObjectExpression > Property[key.name='error'][value.type='Identifier']",
          message: "Don't pass Error in context object - it serializes to {}. Use: logger.error('msg', context, error) or logger.error('msg', undefined, error)",
        },
      ],
    },
  },
  // Test files - allow any and Function for mocking
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/__tests__/**/*.ts", "**/__tests__/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
    },
  },
]);

export default eslintConfig;
