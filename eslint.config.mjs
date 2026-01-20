import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import security from "eslint-plugin-security";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Security plugin - detect common security issues
  {
    plugins: {
      security,
    },
    rules: {
      // Critical security checks (errors)
      "security/detect-eval-with-expression": "error",
      "security/detect-buffer-noassert": "error",
      "security/detect-no-csrf-before-method-override": "error",
      // Warning-level checks (existing codebase has many valid patterns)
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-non-literal-require": "warn",
      "security/detect-object-injection": "off", // Too many false positives on obj[key]
      "security/detect-possible-timing-attacks": "warn",
      "security/detect-unsafe-regex": "warn",
      "security/detect-child-process": "warn",
      "security/detect-non-literal-regexp": "warn",
    },
  },
  // Scripts, e2e, tests, public - not production code or controlled paths
  {
    files: [
      "scripts/**/*.ts",
      "e2e/**/*.ts",
      "**/*.spec.ts",
      "**/*.test.ts",
      "**/__tests__/**/*.ts",
      "public/**/*.js",
      "src/lib/storage/**/*.ts", // Local storage with controlled paths
    ],
    rules: {
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-non-literal-regexp": "off",
    },
  },
  // Safety/content filter patterns - intentionally complex regex for security
  {
    files: [
      "src/lib/safety/**/*patterns*.ts",
      "src/lib/safety/jailbreak-*.ts",
      "src/lib/safety/output-sanitizer-*.ts",
      "src/lib/safety/versioning/*.ts",
      "src/lib/safety/escalation/*.ts",
      "src/lib/ai/intent-detection/**/*.ts",
      "src/lib/ai/handoff-manager/**/*.ts",
      "src/lib/education/frustration-detection/**/*.ts",
      "src/lib/privacy/anonymization-service.ts",
      "src/lib/rag/hybrid-retrieval.ts",
      "src/components/tools/webcam-capture/hooks/use-webcam-capture.ts",
    ],
    rules: {
      "security/detect-unsafe-regex": "off", // Intentional: security patterns
      "security/detect-non-literal-regexp": "off", // Dynamic regex from controlled sources
    },
  },
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
