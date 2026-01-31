import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import security from "eslint-plugin-security";
import localRules from "./eslint-local-rules/index.js";

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
    // Playwright reports (generated files)
    "playwright-report/**",
    "test-results/**",
    // Git worktree directories (local only)
    "feature/**",
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
  // ADR 0075: Block hardcoded cookie names - use constants from cookie-constants.ts
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: [
      "src/lib/auth/cookie-constants.ts", // Source of truth for cookie names
      "src/lib/storage/migrate-session-key.ts", // sessionStorage migration, not cookies
      "src/app/cookies/content.tsx", // Documentation page showing cookie names to users
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value='mirrorbuddy-user-id']",
          message: "Use AUTH_COOKIE_NAME from '@/lib/auth/cookie-constants' instead of hardcoded cookie name. See ADR 0075.",
        },
        {
          selector: "Literal[value='mirrorbuddy-user-id-client']",
          message: "Use AUTH_COOKIE_CLIENT from '@/lib/auth/cookie-constants' instead of hardcoded cookie name. See ADR 0075.",
        },
        {
          selector: "Literal[value='mirrorbuddy-admin']",
          message: "Use ADMIN_COOKIE_NAME from '@/lib/auth/cookie-constants' instead of hardcoded cookie name. See ADR 0075.",
        },
        {
          selector: "Literal[value='mirrorbuddy-simulated-tier']",
          message: "Use SIMULATED_TIER_COOKIE from '@/lib/auth/cookie-constants' instead of hardcoded cookie name. See ADR 0075.",
        },
        {
          selector: "Literal[value='csrf-token']",
          message: "Use CSRF_TOKEN_COOKIE from '@/lib/auth/cookie-constants' instead of hardcoded cookie name. See ADR 0075.",
        },
        {
          selector: "Literal[value='convergio-user-id']",
          message: "Use LEGACY_AUTH_COOKIE from '@/lib/auth/cookie-constants' instead of hardcoded cookie name. See ADR 0075.",
        },
        {
          selector: "Literal[value='mirrorbuddy-visitor-id']",
          message: "Use VISITOR_COOKIE_NAME from '@/lib/auth/cookie-constants' instead of hardcoded cookie name. See ADR 0075.",
        },
      ],
    },
  },
  // CSRF Protection: Enforce csrfFetch for client-side POST/PUT/DELETE requests
  // Only applies to client-side code (components, hooks, stores, client utils)
  // Excludes: API routes, AI providers, server utilities, scripts
  // See ADR 0078 for full documentation (formerly ADR 0053)
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
          message: "Use csrfFetch from '@/lib/auth/csrf-client' for POST requests. Plain fetch fails with 403 in production. See ADR 0078.",
        },
        {
          selector: "CallExpression[callee.name='fetch']:has(ObjectExpression > Property[key.name='method'][value.value='PUT'])",
          message: "Use csrfFetch from '@/lib/auth/csrf-client' for PUT requests. Plain fetch fails with 403 in production. See ADR 0078.",
        },
        {
          selector: "CallExpression[callee.name='fetch']:has(ObjectExpression > Property[key.name='method'][value.value='DELETE'])",
          message: "Use csrfFetch from '@/lib/auth/csrf-client' for DELETE requests. Plain fetch fails with 403 in production. See ADR 0078.",
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
  // ADR 0076: Centralized Logging with Sentry Integration
  // Ban console.error/warn/log in production code - use logger/clientLogger instead
  // Server: import { logger } from '@/lib/logger'
  // Client: import { clientLogger } from '@/lib/logger/client'
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: [
      // Logger implementations (they use console internally)
      "src/lib/logger/**/*.ts",
      // Test files and setup
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**",
      "src/test/**",
      // E2E test utilities
      "src/e2e/**",
    ],
    rules: {
      "no-console": [
        "error",
        {
          allow: ["info", "debug", "time", "timeEnd", "trace", "assert"],
        },
      ],
    },
  },
  // ADR 0015: Block localStorage writes outside authorized files
  // Only consent, trial visitor tracking, and accessibility settings are allowed
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: [
      // Authorized localStorage uses per ADR 0015
      "src/lib/consent/**/*.ts", // GDPR consent management
      "src/lib/storage/**/*.ts", // Legacy cleanup and migrations
      "src/lib/trial/**/*.ts", // Trial visitor tracking (ADR 0056)
      "src/lib/accessibility/**/*.ts", // Device-specific a11y settings
      "src/app/cookies/**/*.tsx", // Cookie documentation page
      "src/components/pwa/**/*.tsx", // PWA install banner dismissal
      "src/lib/hooks/use-permissions.ts", // Browser permission caches
      // Test files
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "CallExpression[callee.object.name='localStorage'][callee.property.name='setItem']",
          message: "localStorage.setItem is restricted per ADR 0015. Use database API for user data. Allowed: consent, trial tracking, a11y settings only.",
        },
      ],
    },
  },
  // ADR 0005, 0034: EventSource must be closed in cleanup
  // Warns about EventSource usage to remind developers about .close() in useEffect cleanup
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: [
      // SSE server-side implementations
      "src/app/api/**/*.ts",
      // Test files
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "NewExpression[callee.name='EventSource']",
          message: "EventSource instances must call .close() in useEffect cleanup to prevent memory leaks. See ADR 0005, 0034.",
        },
      ],
    },
  },
  // ADR 0075: Prefer validateAuth() over direct AUTH cookie reads in API routes
  // Only warns about AUTH_COOKIE_NAME reads, not VISITOR_COOKIE_NAME (valid for trial)
  {
    files: ["src/app/api/**/*.ts"],
    ignores: [
      // Auth implementation files (they define validateAuth)
      "src/app/api/auth/**/*.ts",
      // Health checks don't need auth
      "src/app/api/health/**/*.ts",
      "src/app/api/metrics/**/*.ts",
      // Public endpoints
      "src/app/api/contact/**/*.ts",
      "src/app/api/tos/**/*.ts",
      "src/app/api/invite/request/**/*.ts",
      // Test files
      "**/*.test.ts",
      "**/__tests__/**",
    ],
    rules: {
      "local-rules/prefer-validate-auth": "error",
    },
  },
  // Local rules plugin - define once for all custom rules
  // See: eslint-local-rules/index.js for rule implementations
  {
    plugins: {
      "local-rules": { rules: localRules.rules },
    },
  },
  // i18n: Detect hardcoded Italian text in JSX - enforce translation usage
  // See ADR 0079 for i18n multi-language implementation
  {
    files: ["src/**/*.tsx"],
    ignores: [
      "src/**/*.test.tsx",
      "src/**/__tests__/**",
    ],
    rules: {
      "local-rules/no-hardcoded-italian": "error",
    },
  },
  // ADR 0083: Prevent next-intl hooks in files outside LocaleProvider context
  // providers.tsx and root layout run BEFORE LocaleProvider is mounted
  {
    files: [
      "src/components/providers.tsx",
      "src/app/layout.tsx",
    ],
    rules: {
      "local-rules/no-i18n-in-providers": "error",
    },
  },
  // ADR 0091: Enforce camelCase for translation keys (no kebab-case)
  // Prevents mismatch between t("kebab-case") calls and camelCase JSON keys
  {
    files: ["src/**/*.tsx", "src/**/*.ts"],
    ignores: [
      "src/**/*.test.tsx",
      "src/**/*.test.ts",
      "src/**/__tests__/**",
    ],
    rules: {
      "local-rules/no-kebab-case-i18n-keys": "error",
    },
  },
  // T7-02: Block missing i18n namespace keys at build time
  // Validates that all t("key") calls reference keys that exist in message files
  // NOTE: Set to "error" once all existing violations are fixed
  {
    files: ["src/**/*.tsx", "src/**/*.ts"],
    ignores: [
      "src/**/*.test.tsx",
      "src/**/*.test.ts",
      "src/**/__tests__/**",
    ],
    rules: {
      "local-rules/no-missing-i18n-keys": "warn",
    },
  },
  // ADR 0105: Detect Prisma find-then-create race conditions (P2002)
  // Warns on prisma.model.create() preceded by prisma.model.find*() in same scope
  {
    files: ["src/**/*.ts"],
    ignores: [
      "src/**/*.test.ts",
      "src/**/__tests__/**",
    ],
    rules: {
      "local-rules/no-prisma-race-condition": "warn",
    },
  },
  // ADR 0059: Require E2E specs to use fixtures instead of raw @playwright/test
  // Fixtures provide /api/tos mock and wall bypasses. Without them, TosGateProvider
  // blocks all pointer events, causing systematic test failures.
  {
    files: ["e2e/**/*.spec.ts"],
    ignores: ["e2e/fixtures/**"],
    rules: {
      "local-rules/require-e2e-fixtures": "warn",
    },
  },
]);

export default eslintConfig;
