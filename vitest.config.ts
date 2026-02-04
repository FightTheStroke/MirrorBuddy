import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.spec.ts"],
    exclude: ["node_modules", "e2e/**", "feat/**"],
    setupFiles: ["./src/test/setup.ts"],
    // Retry flaky tests on CI (F-07)
    retry: process.env.CI ? 2 : 0,
    // JSON reporter for flaky test tracking
    reporters: process.env.CI ? ["default", "json"] : ["default"],
    outputFile: process.env.CI ? "./coverage/test-results.json" : undefined,
    // Tests that modify i18n files should run with proper isolation
    // Using hooks: "list" ensures beforeAll/afterAll run in correct order
    // fileParallelism: false prevents cross-file race conditions with i18n files
    sequence: {
      hooks: "list",
    },
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/lib/education/**/*.ts",
        "src/lib/ai/**/*.ts",
        "src/lib/safety/**/*.ts",
        "src/lib/tools/**/*.ts",
        "src/lib/profile/**/*.ts",
        "src/lib/pdf-generator/**/*.ts",
      ],
      exclude: [
        "node_modules/",
        "e2e/",
        "**/*.config.*",
        "**/*.d.ts",
        "src/types/**",
        "**/*.test.ts",
        "**/*.spec.ts",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
