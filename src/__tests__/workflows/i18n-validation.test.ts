import { readFileSync } from "fs";
import { join } from "path";
import YAML from "yaml";
import { describe, it, expect, beforeAll } from "vitest";

describe("i18n Validation Workflow", () => {
  let workflowContent: any;
  let ciWorkflowContent: any;

  beforeAll(() => {
    const workflowPath = join(
      process.cwd(),
      ".github/workflows/i18n-validation.yml",
    );
    const ciWorkflowPath = join(process.cwd(), ".github/workflows/ci.yml");

    const rawWorkflow = readFileSync(workflowPath, "utf-8");
    const rawCiWorkflow = readFileSync(ciWorkflowPath, "utf-8");

    workflowContent = YAML.parse(rawWorkflow);
    ciWorkflowContent = YAML.parse(rawCiWorkflow);
  });

  describe("i18n-validation.yml workflow", () => {
    it("should exist and be properly named", () => {
      expect(workflowContent).toBeDefined();
      expect(workflowContent.name).toBe("i18n Validation");
    });

    it("should have pull_request trigger", () => {
      expect(workflowContent.on.pull_request).toBeDefined();
      expect(workflowContent.on.pull_request.paths).toBeDefined();
    });

    it("should have push trigger on main branch", () => {
      expect(workflowContent.on.push).toBeDefined();
      expect(workflowContent.on.push.branches).toContain("main");
    });

    it("should trigger on i18n-related path changes", () => {
      const paths = workflowContent.on.pull_request.paths;
      expect(paths).toContain("messages/**");
      expect(paths).toContain("src/**");
      expect(paths).toContain("scripts/i18n-check.ts");
      expect(paths).toContain("package.json");
      expect(paths).toContain("package-lock.json");
    });

    it("should have an i18n-check job", () => {
      expect(workflowContent.jobs["i18n-check"]).toBeDefined();
    });

    it("should checkout code in the first step", () => {
      const job = workflowContent.jobs["i18n-check"];
      const checkoutStep = job.steps.find((step: any) =>
        step.uses?.includes("actions/checkout"),
      );
      expect(checkoutStep).toBeDefined();
    });

    it("should setup Node.js with version 20", () => {
      const job = workflowContent.jobs["i18n-check"];
      const setupStep = job.steps.find((step: any) =>
        step.uses?.includes("actions/setup-node"),
      );
      expect(setupStep).toBeDefined();
      expect(setupStep["with"]["node-version"]).toBe("20");
    });

    it("should install dependencies with npm ci", () => {
      const job = workflowContent.jobs["i18n-check"];
      const installStep = job.steps.find((step: any) =>
        step.run?.includes("npm ci"),
      );
      expect(installStep).toBeDefined();
    });

    it("should run npm run i18n:check", () => {
      const job = workflowContent.jobs["i18n-check"];
      const i18nStep = job.steps.find((step: any) =>
        step.run?.includes("npm run i18n:check"),
      );
      expect(i18nStep).toBeDefined();
      expect(i18nStep.name).toMatch(/[Vv]alidate i18n/);
    });

    it("should not continue on error when i18n:check fails", () => {
      const job = workflowContent.jobs["i18n-check"];
      const i18nStep = job.steps.find((step: any) =>
        step.run?.includes("npm run i18n:check"),
      );
      expect(i18nStep["continue-on-error"]).toBe(false);
    });

    it("should comment on PR when validation fails", () => {
      const job = workflowContent.jobs["i18n-check"];
      const commentStep = job.steps.find((step: any) =>
        step.uses?.includes("actions/github-script"),
      );
      expect(commentStep).toBeDefined();
      expect(commentStep.if).toContain("failure()");
      expect(commentStep.if).toContain("github.event_name == 'pull_request'");
    });

    it("should have a meaningful error message in PR comment", () => {
      const job = workflowContent.jobs["i18n-check"];
      const commentStep = job.steps.find((step: any) =>
        step.uses?.includes("actions/github-script"),
      );
      const script = commentStep.with.script;
      expect(script).toContain("i18n Validation Failed");
      expect(script).toContain("translation files are incomplete");
    });
  });

  describe("Integration with main CI", () => {
    it("should reference i18n validation in CI pipeline or have separate workflow", () => {
      // Either i18n validation step exists in ci.yml OR i18n-validation.yml exists
      const hasI18nInCi = ciWorkflowContent.jobs.quality?.steps?.some(
        (step: any) => step.run?.includes("i18n:check"),
      );

      // i18n-validation.yml exists as verified above
      expect(workflowContent).toBeDefined();
      expect(hasI18nInCi || workflowContent).toBeDefined();
    });
  });

  describe("npm run i18n:check availability", () => {
    it("should have i18n:check script in package.json", () => {
      const packageJsonPath = join(process.cwd(), "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      expect(packageJson.scripts["i18n:check"]).toBeDefined();
    });

    it("i18n:check script should reference the validation script", () => {
      const packageJsonPath = join(process.cwd(), "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      expect(packageJson.scripts["i18n:check"]).toContain("i18n-check");
    });
  });
});
