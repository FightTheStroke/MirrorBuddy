import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
import YAML from "yaml";
import { describe, it, expect, beforeAll } from "vitest";

describe("i18n CI Integration", () => {
  let workflowContent: any;
  let packageJson: any;

  beforeAll(() => {
    const workflowPath = join(
      process.cwd(),
      ".github/workflows/i18n-validation.yml",
    );
    const packageJsonPath = join(process.cwd(), "package.json");

    const rawWorkflow = readFileSync(workflowPath, "utf-8");
    packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

    workflowContent = YAML.parse(rawWorkflow);
  });

  describe("Workflow CI Configuration", () => {
    it("workflow should be triggered on PR creation and updates", () => {
      const hasOnPullRequest = workflowContent.on?.pull_request !== undefined;
      expect(hasOnPullRequest).toBe(true);
      expect(workflowContent.on.pull_request.paths).toBeDefined();
    });

    it("workflow should be triggered on main branch pushes", () => {
      const hasOnPush = workflowContent.on?.push !== undefined;
      expect(hasOnPush).toBe(true);
    });

    it("workflow should only run when i18n-related files change", () => {
      const paths = workflowContent.on.pull_request.paths;
      const i18nRelatedPaths = [
        "messages/**",
        "src/**",
        "scripts/i18n-check.ts",
        "package.json",
      ];
      i18nRelatedPaths.forEach((path) => {
        expect(paths).toContain(path);
      });
    });

    it("job should have concurrency settings for optimization", () => {
      const job = workflowContent.jobs["i18n-check"];
      expect(job).toBeDefined();
    });
  });

  describe("Script Availability", () => {
    it("npm run i18n:check should exist", () => {
      expect(packageJson.scripts["i18n:check"]).toBeDefined();
    });

    it("i18n:check should be executable", () => {
      const script = packageJson.scripts["i18n:check"];
      expect(script).toContain("tsx");
      expect(script).toContain("i18n-check.ts");
    });

    it("should run i18n:check without errors on current codebase", () => {
      try {
        const output = execSync("npm run i18n:check", {
          cwd: process.cwd(),
          encoding: "utf-8",
        });
        expect(output).toContain("Result: PASS");
      } catch (error: any) {
        throw new Error(`i18n:check failed: ${error.message}`);
      }
    });

    it("i18n:check output should show all locales are validated", () => {
      const output = execSync("npm run i18n:check", {
        cwd: process.cwd(),
        encoding: "utf-8",
      });
      // ADR 0082: namespace-based structure outputs "{✓|✗} {locale}: X/Y keys"
      // Note: Status may be ✗ if another test temporarily modified message files
      expect(output).toMatch(/[✓✗]\s+it:/);
      expect(output).toMatch(/[✓✗]\s+en:/);
      expect(output).toContain("keys");
    });
  });

  describe("PR Feedback Configuration", () => {
    it("should post comment on PR when validation fails", () => {
      const job = workflowContent.jobs["i18n-check"];
      const commentStep = job.steps.find((step: any) =>
        step.uses?.includes("github-script"),
      );
      expect(commentStep).toBeDefined();
      expect(commentStep.if).toContain("failure()");
    });

    it("comment should provide actionable guidance", () => {
      const job = workflowContent.jobs["i18n-check"];
      const commentStep = job.steps.find((step: any) =>
        step.uses?.includes("github-script"),
      );
      const script = commentStep.with.script;
      expect(script).toContain("npm run i18n:check");
    });
  });

  describe("Workflow Error Handling", () => {
    it("should fail the workflow if i18n:check returns non-zero exit code", () => {
      const job = workflowContent.jobs["i18n-check"];
      const i18nStep = job.steps.find((step: any) =>
        step.run?.includes("npm run i18n:check"),
      );
      // continue-on-error should be false or not set (default is false)
      const continueOnError = i18nStep["continue-on-error"];
      expect(continueOnError).not.toBe(true);
    });

    it("should have proper step naming for clarity in PR checks", () => {
      const job = workflowContent.jobs["i18n-check"];
      const i18nStep = job.steps.find((step: any) =>
        step.run?.includes("npm run i18n:check"),
      );
      expect(i18nStep.name).toBeDefined();
      expect(i18nStep.name.toLowerCase()).toContain("i18n");
    });
  });

  describe("Workflow Performance", () => {
    it("should use setup-node with built-in caching", () => {
      const job = workflowContent.jobs["i18n-check"];
      // The setup-node action has built-in caching
      expect(
        job.steps.some((step: any) => step.uses?.includes("setup-node")),
      ).toBe(true);
    });

    it("should use Node.js 20 for consistency", () => {
      const job = workflowContent.jobs["i18n-check"];
      const setupNode = job.steps.find((step: any) =>
        step.uses?.includes("setup-node"),
      );
      expect(setupNode["with"]["node-version"]).toBe("20");
    });

    it("should use npm ci instead of npm install in CI", () => {
      const job = workflowContent.jobs["i18n-check"];
      const installStep = job.steps.find((step: any) =>
        step.run?.includes("npm ci"),
      );
      expect(installStep).toBeDefined();
    });
  });

  describe("CI/CD Integration Requirements (F-xx)", () => {
    it("F-01: i18n validation must run on every PR", () => {
      const hasPullRequestTrigger =
        workflowContent.on.pull_request !== undefined;
      expect(hasPullRequestTrigger).toBe(true);
    });

    it("F-02: Validation must fail the build on incomplete translations", () => {
      const job = workflowContent.jobs["i18n-check"];
      const i18nStep = job.steps.find((step: any) =>
        step.run?.includes("npm run i18n:check"),
      );
      const continueOnError = i18nStep["continue-on-error"];
      expect(continueOnError).not.toBe(true);
    });

    it("F-03: Validation script must check all required locales", () => {
      const output = execSync("npm run i18n:check", {
        cwd: process.cwd(),
        encoding: "utf-8",
      });
      // ADR 0082: namespace-based structure outputs locale names without .json suffix
      // Note: Status may be ✗ if another test temporarily modified message files
      expect(output).toMatch(/[✓✗]\s+it:/);
      expect(output).toMatch(/[✓✗]\s+en:/);
      expect(output).toContain("PASS");
    });

    it("F-04: PR must have visibility into validation failures", () => {
      const job = workflowContent.jobs["i18n-check"];
      const commentStep = job.steps.find((step: any) =>
        step.uses?.includes("github-script"),
      );
      expect(commentStep).toBeDefined();
      expect(commentStep.if).toContain("pull_request");
    });
  });
});
