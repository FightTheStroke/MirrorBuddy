import baseConfig from "./playwright.config";
import {
  defineConfig,
  devices,
  type PlaywrightTestConfig,
} from "@playwright/test";

/**
 * Iteration-focused E2E config.
 *
 * Goal: allow running "previously ignored" suites (admin/api/security/AI) on demand,
 * without changing the default CI behavior in `playwright.config.ts`.
 *
 * Recommended usage (fast, incremental):
 * - npm run test:e2e:smoke
 * - npm run test:e2e:admin
 * - npm run test:e2e:i18n
 * - npm run test:e2e:security
 * - npm run test:e2e:api
 * - npm run test:e2e:last-failed
 */

function withIterationProjects(
  config: PlaywrightTestConfig,
): PlaywrightTestConfig {
  const projects = (config.projects ?? []).map((project) => {
    if (project.name === "chromium") {
      // Re-enable all suites for iteration, but avoid double-running mobile tests.
      return {
        ...project,
        testIgnore: ["**/mobile/**"],
      };
    }

    if (project.name === "cookie-signing") {
      // Enable cookie-signing project for targeted runs:
      // `npx playwright test --config playwright.config.iteration.ts --project=cookie-signing`
      return {
        ...project,
        use: {
          ...devices["Desktop Chrome"],
          storageState: undefined,
        },
        testMatch: "**/cookie-signing.spec.ts",
        testIgnore: undefined,
      };
    }

    return project;
  });

  return {
    ...config,
    projects,
  };
}

export default defineConfig(withIterationProjects(baseConfig));
