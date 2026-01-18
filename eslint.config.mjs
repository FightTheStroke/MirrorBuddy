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
  // CSRF Protection: Enforce csrfFetch for client-side POST/PUT/DELETE requests
  // Only applies to client-side code (components, hooks, stores, client utils)
  // Excludes: API routes, AI providers, server utilities, scripts
  // See ADR 0053 for full documentation
  {
    files: [
      "src/components/**/*.ts",
      "src/components/**/*.tsx",
      "src/lib/hooks/**/*.ts",
      "src/lib/stores/**/*.ts",
      "src/lib/client-*.ts",
      "src/hooks/**/*.ts",
      // Additional client-side code that makes API calls
      "src/lib/voice/**/*.ts",
      "src/lib/tools/**/*.ts",
      "src/lib/safety/**/*.ts",
    ],
    ignores: [
      // WebRTC files call Azure directly (not through our API)
      "src/lib/hooks/voice-session/webrtc-*.ts",
      // Server-side handlers that call Azure APIs directly (not our /api/*)
      "src/lib/tools/handlers/**/*.ts",
      // Server-side only files
      "src/lib/tools/server-*.ts",
      "src/lib/safety/server-*.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='fetch']:has(ObjectExpression > Property[key.name='method'][value.value='POST'])",
          message: "Use csrfFetch from '@/lib/auth/csrf-client' for POST requests. Plain fetch fails with 403 in production. See ADR 0053.",
        },
        {
          selector: "CallExpression[callee.name='fetch']:has(ObjectExpression > Property[key.name='method'][value.value='PUT'])",
          message: "Use csrfFetch from '@/lib/auth/csrf-client' for PUT requests. Plain fetch fails with 403 in production. See ADR 0053.",
        },
        {
          selector: "CallExpression[callee.name='fetch']:has(ObjectExpression > Property[key.name='method'][value.value='DELETE'])",
          message: "Use csrfFetch from '@/lib/auth/csrf-client' for DELETE requests. Plain fetch fails with 403 in production. See ADR 0053.",
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
