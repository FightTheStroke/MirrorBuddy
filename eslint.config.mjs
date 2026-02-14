import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";
import security from "eslint-plugin-security";
import jsxA11y from "eslint-plugin-jsx-a11y";
import localRules from "./eslint-local-rules/index.js";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Disable ESLint rules that conflict with Prettier formatting
  prettierConfig,
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
      "security/detect-possible-timing-attacks": "error",
      "security/detect-unsafe-regex": "warn",
      "security/detect-child-process": "warn",
      "security/detect-non-literal-regexp": "warn",
    },
  },
  // jsx-a11y: Full WCAG accessibility rules for JSX (34 rules, recommended preset)
  // eslint-config-next only enables 6/34 rules as "warn". This enforces all recommended rules.
  // All violations fixed — enforced as "error" to prevent regressions.
  {
    files: ["src/**/*.tsx"],
    rules: jsxA11y.flatConfigs.recommended.rules,
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
    "feat/**",
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
      // ADR 0076: Prevent logger.error('msg', { error }) - Error objects serialize to {}
      "local-rules/no-logger-error-context": "error",
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
      "local-rules/no-hardcoded-cookies": "error",
    },
  },
  // CSRF Protection: Enforce csrfFetch for client-side POST/PUT/DELETE requests
  // Case-insensitive matching (catches 'post', 'POST', 'Post', etc.)
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
      "local-rules/require-csrf-fetch": "error",
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
          // console.info/debug removed: use logger/clientLogger (ADR 0076).
          // time/timeEnd kept for performance profiling. assert for invariants.
          allow: ["time", "timeEnd", "assert"],
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
      "src/components/trial/**/*.tsx", // Trial UI email capture (ADR 0056)
      "src/lib/accessibility/**/*.ts", // Device-specific a11y settings
      "src/app/cookies/**/*.tsx", // Cookie documentation page
      "src/components/pwa/**/*.tsx", // PWA install banner dismissal
      "src/lib/hooks/use-permissions.ts", // Browser permission caches
      "src/lib/hooks/voice-session/transport-cache.ts", // WebRTC probe cache (device-specific)
      "src/hooks/use-staging-data-filter.ts", // Dev tool: staging data toggle
      // Test files
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**",
    ],
    rules: {
      "local-rules/no-direct-localstorage": "error",
    },
  },
  // TF-03: Block direct imports of generateEmbedding - enforce privacy-aware wrapper
  // Prevents PII leakage into vector embeddings by requiring use of privacy-aware-embedding.ts
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: [
      "src/lib/rag/embedding-service.ts", // Source of truth
      "src/lib/rag/privacy-aware-embedding.ts", // Needs to import embedding-service
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**",
    ],
    rules: {
      "local-rules/no-direct-embedding": "error",
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
      "local-rules/require-eventsource-cleanup": "error",
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
  // DEPRECATION: This rule is a subset of no-literal-strings-in-jsx below.
  // Once no-literal-strings-in-jsx is promoted to "error", remove this rule.
  {
    files: ["src/**/*.tsx"],
    ignores: [
      "src/**/*.test.tsx",
      "src/**/__tests__/**",
    ],
    rules: {
      "local-rules/no-hardcoded-italian": "warn",
    },
  },
  // i18n: Detect ALL hardcoded literal strings in JSX (language-agnostic)
  // Complements no-hardcoded-italian (Italian-specific) with broader coverage
  {
    files: ["src/**/*.tsx"],
    ignores: [
      "src/**/*.test.tsx",
      "src/**/__tests__/**",
    ],
    rules: {
      "local-rules/no-literal-strings-in-jsx": "warn",
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
  // NOTE: 1 false positive remains (admin.stripe is a nested object, not leaf key).
  // Escalate to "error" once the rule handles nested namespace keys correctly.
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
      "local-rules/no-prisma-race-condition": "error",
    },
  },
  // TF-04: Detect raw Prisma queries that bypass PII encryption middleware
  // Flags $queryRaw/$executeRaw that reference PII fields (email, name, parentEmail, etc.)
  {
    files: ["src/**/*.ts"],
    ignores: [
      "src/**/*.test.ts",
      "src/**/__tests__/**",
    ],
    rules: {
      "local-rules/no-plaintext-pii-storage": "error",
    },
  },
  // PII: Require emailHash (not plain email) in User/GoogleAccount find queries
  // Plain email is PII-encrypted; plaintext lookups will never match
  {
    files: ["src/**/*.ts"],
    ignores: [
      "src/**/*.test.ts",
      "src/**/__tests__/**",
      "src/lib/db/**/*.ts", // PII middleware itself
      "src/lib/auth/**/*.ts", // Auth implementation (has legacy fallbacks)
      "src/app/api/auth/**/*.ts", // Auth routes (emailHash + email fallback)
      "src/lib/security/key-rotation.ts", // Needs { email: { not: null } } filter
    ],
    rules: {
      "local-rules/require-email-hash-lookup": "error",
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
  // Prefer pipe() middleware pattern over export async function in API routes
  // pipe() provides automatic error handling, Sentry, logging, and composable middleware
  {
    files: ["src/app/api/**/route.ts"],
    ignores: [
      // Cron jobs use withCron middleware (already pipe-based)
      "src/app/api/cron/**/*.ts",
    ],
    rules: {
      "local-rules/require-pipe-handler": "warn",
    },
  },
  // ADR 0078: Require CSRF validation in mutating API route handlers
  // POST/PUT/PATCH/DELETE endpoints must include CSRF protection:
  //   - pipe() pattern: withCSRF in middleware chain
  //   - Legacy pattern: requireCSRF() call inside handler
  // Exemptions: Cron jobs (use CRON_SECRET), webhooks (use signature verification)
  {
    files: ["src/app/api/**/route.ts"],
    ignores: [
      // Cron jobs use CRON_SECRET for authentication
      "src/app/api/cron/**/*.ts",
      // Webhooks use signature verification
      "src/app/api/webhooks/**/*.ts",
    ],
    rules: {
      "local-rules/require-csrf-mutating-routes": "error",
    },
  },
  // Require complete logger mock in test files
  // Prevents "logger.X is not a function" errors from incomplete mocks
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "local-rules/require-complete-logger-mock": "error",
    },
  },
  // Module Boundaries: enforce barrel-export-only imports for protected domains
  // Cross-module deep imports (e.g., @/lib/safety/jailbreak-detector/patterns)
  // must use the barrel export (@/lib/safety) instead.
  // Intra-module deep imports remain allowed.
  // All 465 violations fixed (Plan 136). Enforced as error to prevent regressions.
  // Use `npm run lint:boundaries` to check violations locally.
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**",
    ],
    rules: {
      "local-rules/enforce-module-boundaries": [
        "error",
        {
          protectedModules: [
            "safety",
            "privacy",
            "ai",
            "education",
            "rag",
            "accessibility",
            "tier",
            "auth",
            "security",
            "compliance",
          ],
        },
      ],
    },
  },
  // ADR 0045: Enforce barrel paths in test mocks and dynamic imports
  // vi.mock("@/lib/auth/session-auth") must use barrel "@/lib/auth/server"
  // await import("@/lib/auth/session-auth") must also use barrel paths
  // "warn" during baseline reduction; escalate to "error" when violations reach 0.
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**/*.ts",
      "**/__tests__/**/*.tsx",
    ],
    rules: {
      "local-rules/enforce-module-boundaries": [
        "warn",
        {
          protectedModules: [
            "safety",
            "privacy",
            "ai",
            "education",
            "rag",
            "accessibility",
            "tier",
            "auth",
            "security",
            "compliance",
          ],
        },
      ],
    },
  },
  // ADR 0045: Enforce dependency direction between protected modules
  // CORE (safety, security, privacy) → no imports from FEATURE or CROSS
  // FEATURE (ai, education, rag) → may import CORE only
  // CROSS (auth, tier, accessibility, compliance) → may import CORE and FEATURE
  // Auth is universal: any module may import from auth.
  // NOTE: "warn" + --max-warnings 0 in lint-staged = blocking for new violations.
  // CI lint runs without --max-warnings 0 so existing warnings don't block.
  // Kept as "warn" during baseline reduction; escalate to "error" when violations reach 0.
  // Scope: src/lib only (inter-module boundaries). src/app and src/components are consumers, not checked.
  {
    files: ["src/lib/**/*.ts", "src/lib/**/*.tsx"],
    ignores: [
      "**/*.test.ts",
      "**/__tests__/**",
    ],
    rules: {
      "local-rules/enforce-dependency-direction": "warn",
    },
  },
  // ADR 0130: Enforce AI provider router - no direct provider imports
  // Use aiRouter from "@/lib/ai/providers/router" for automatic failover
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: [
      "src/lib/ai/providers/**/*.ts", // Provider implementations and router
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**",
    ],
    rules: {
      "local-rules/no-direct-ai-provider": "error",
    },
  },
  // Prevent hardcoded Italian strings in test assertions
  // Tests should use getTranslation() from @/test/i18n-helpers
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    ignores: [
      "**/i18n-helpers*",
      "**/i18n-check*",
    ],
    rules: {
      "local-rules/no-hardcoded-strings-in-tests": "error",
    },
  },
  // Plan 091: TODO/FIXME must reference a GitHub issue for tracking
  // Project policy is zero TODOs; this catches untracked ones at commit time
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**",
    ],
    rules: {
      "local-rules/no-todo-without-issue": "error",
    },
  },
  // ADR 0128: Enforce media-bridge abstraction for camera/mic access
  // Raw navigator.mediaDevices breaks on Capacitor native builds
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: [
      "src/lib/native/**/*.ts", // Media-bridge implementation
      "src/lib/hooks/voice-session/**/*.ts", // WebRTC layer (direct media access required)
      "src/components/settings/sections/diagnostics/**/*.ts", // Hardware diagnostics
      "src/components/settings/sections/diagnostics/**/*.tsx", // Hardware diagnostics
      "src/components/settings/sections/audio-settings/hooks/**/*.ts", // Audio device enumeration
      "src/components/tools/webcam-capture/hooks/**/*.ts", // Webcam capture implementation
      "src/components/education/webcam-analysis-mobile/**/*.ts", // Webcam analysis (live preview)
      "src/components/settings/profile-editor-mobile.tsx", // Avatar camera capture
      "src/lib/hooks/use-audio-devices.ts", // Audio device enumeration
      "src/lib/hooks/use-permissions.ts", // Permission probing
      "src/lib/education/frustration-detection/**/*.ts", // Prosody realtime monitor
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**",
    ],
    rules: {
      "local-rules/require-native-bridge": "error",
    },
  },
]);

export default eslintConfig;
