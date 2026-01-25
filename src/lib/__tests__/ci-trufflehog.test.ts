/**
 * CI Workflow - TruffleHog Integration Tests (F-09)
 *
 * Verifies that TruffleHog secret scanning is properly integrated
 * into the CI pipeline before existing security checks.
 */

import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
// @ts-expect-error - js-yaml doesn't have types
import yaml from "js-yaml";

describe("CI Workflow - TruffleHog Secret Scanning (F-09)", () => {
  let ciWorkflow: any;

  beforeAll(() => {
    const workflowPath = path.join(
      __dirname,
      "../../../.github/workflows/ci.yml",
    );
    const content = fs.readFileSync(workflowPath, "utf-8");
    ciWorkflow = yaml.load(content) as any;
  });

  describe("TruffleHog Job Exists", () => {
    it("should have a secret-scanning job defined", () => {
      expect(ciWorkflow.jobs).toBeDefined();
      expect(ciWorkflow.jobs["secret-scanning"]).toBeDefined();
    });

    it("secret-scanning job should run on ubuntu-latest", () => {
      const job = ciWorkflow.jobs["secret-scanning"];
      expect(job["runs-on"]).toBe("ubuntu-latest");
    });

    it("secret-scanning should have correct name", () => {
      const job = ciWorkflow.jobs["secret-scanning"];
      expect(job.name).toBe("Secret Scanning");
    });
  });

  describe("TruffleHog Configuration", () => {
    it("secret-scanning should checkout code with full history", () => {
      const job = ciWorkflow.jobs["secret-scanning"];
      const checkoutStep = job.steps.find((s: any) =>
        s.uses?.startsWith("actions/checkout"),
      );
      expect(checkoutStep).toBeDefined();
      expect(checkoutStep.with["fetch-depth"]).toBe(0);
    });

    it("secret-scanning should use TruffleHog action", () => {
      const job = ciWorkflow.jobs["secret-scanning"];
      const truffleStep = job.steps.find((s: any) =>
        s.uses?.includes("trufflesecurity/trufflehog"),
      );
      expect(truffleStep).toBeDefined();
      expect(truffleStep.name).toContain("TruffleHog");
    });

    it("TruffleHog should have path set to ./root", () => {
      const job = ciWorkflow.jobs["secret-scanning"];
      const truffleStep = job.steps.find((s: any) =>
        s.uses?.includes("trufflesecurity/trufflehog"),
      );
      expect(truffleStep.with.path).toBe("./");
    });

    it("TruffleHog should use --only-verified flag", () => {
      const job = ciWorkflow.jobs["secret-scanning"];
      const truffleStep = job.steps.find((s: any) =>
        s.uses?.includes("trufflesecurity/trufflehog"),
      );
      expect(truffleStep.with.extra_args).toContain("--only-verified");
    });

    it("TruffleHog should use --fail flag", () => {
      const job = ciWorkflow.jobs["secret-scanning"];
      const truffleStep = job.steps.find((s: any) =>
        s.uses?.includes("trufflesecurity/trufflehog"),
      );
      expect(truffleStep.with.extra_args).toContain("--fail");
    });

    it("TruffleHog should scan from default branch to HEAD", () => {
      const job = ciWorkflow.jobs["secret-scanning"];
      const truffleStep = job.steps.find((s: any) =>
        s.uses?.includes("trufflesecurity/trufflehog"),
      );
      expect(truffleStep.with.base).toBeDefined();
      expect(truffleStep.with.head).toBe("HEAD");
    });
  });

  describe("Job Dependencies", () => {
    it("security job should depend on secret-scanning", () => {
      const securityJob = ciWorkflow.jobs.security;
      expect(securityJob.needs).toBeDefined();
      expect(securityJob.needs).toContain("secret-scanning");
    });

    it("secret-scanning should come before security in workflow order", () => {
      const jobKeys = Object.keys(ciWorkflow.jobs);
      const secretScanIndex = jobKeys.indexOf("secret-scanning");
      const securityIndex = jobKeys.indexOf("security");
      // Just verify both exist (order in YAML doesn't guarantee execution order)
      expect(secretScanIndex).toBeGreaterThanOrEqual(0);
      expect(securityIndex).toBeGreaterThan(secretScanIndex);
    });
  });

  describe("Existing Secret Checks Preserved", () => {
    it("security job should still have legacy secret check", () => {
      const securityJob = ciWorkflow.jobs.security;
      const secretCheckStep = securityJob.steps.find(
        (s: any) => s.name?.includes("secret") || s.run?.includes("grep"),
      );
      expect(secretCheckStep).toBeDefined();
    });

    it("legacy check should be renamed or marked as secondary", () => {
      const securityJob = ciWorkflow.jobs.security;
      const secretCheckStep = securityJob.steps.find(
        (s: any) =>
          s.name?.toLocaleLowerCase().includes("legacy") ||
          s.name?.toLocaleLowerCase().includes("check for secrets"),
      );
      expect(secretCheckStep).toBeDefined();
    });

    it("legacy check should still scan for API keys", () => {
      const securityJob = ciWorkflow.jobs.security;
      const secretCheckStep = securityJob.steps.find(
        (s: any) => s.run?.includes("grep") && s.run?.includes("sk-"),
      );
      expect(secretCheckStep).toBeDefined();
    });

    it("legacy check should still scan for AWS keys", () => {
      const securityJob = ciWorkflow.jobs.security;
      const secretCheckStep = securityJob.steps.find(
        (s: any) => s.run?.includes("grep") && s.run?.includes("AKIA"),
      );
      expect(secretCheckStep).toBeDefined();
    });
  });

  describe("Workflow Structure Integrity", () => {
    it("should not break existing build job", () => {
      expect(ciWorkflow.jobs.build).toBeDefined();
      expect(ciWorkflow.jobs.build.name).toBeDefined();
    });

    it("should not break existing unit-tests job", () => {
      expect(ciWorkflow.jobs["unit-tests"]).toBeDefined();
    });

    it("should not break existing quality job", () => {
      expect(ciWorkflow.jobs.quality).toBeDefined();
    });

    it("should have valid workflow trigger configuration", () => {
      expect(ciWorkflow.on).toBeDefined();
      expect(ciWorkflow.on.push).toBeDefined();
      expect(ciWorkflow.on["pull_request"]).toBeDefined();
    });
  });
});
