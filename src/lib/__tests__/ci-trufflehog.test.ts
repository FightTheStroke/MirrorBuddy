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

    it("TruffleHog should NOT have --fail in extra_args (it's built-in)", () => {
      // Note: --fail is hardcoded in the TruffleHog GitHub Action itself
      // Adding it to extra_args causes "flag 'fail' cannot be repeated" error
      const job = ciWorkflow.jobs["secret-scanning"];
      const truffleStep = job.steps.find((s: any) =>
        s.uses?.includes("trufflesecurity/trufflehog"),
      );
      expect(truffleStep.with.extra_args).not.toContain("--fail");
    });

    it("TruffleHog should scan changed commits on push events", () => {
      // For push events, scan from the previous commit (event.before) to
      // the new commit (event.after). This avoids "BASE and HEAD are the same"
      // error that occurs when using default_branch + HEAD on direct pushes.
      const job = ciWorkflow.jobs["secret-scanning"];
      const truffleStep = job.steps.find((s: any) =>
        s.uses?.includes("trufflesecurity/trufflehog"),
      );
      expect(truffleStep.with.base).toBe("${{ github.event.before }}");
      expect(truffleStep.with.head).toBe("${{ github.event.after }}");
    });
  });

  describe("Job Dependencies", () => {
    it("secret-scanning job exists independently", () => {
      // Note: As of d26201de, legacy secret checks were removed from security job
      // as redundant (covered by dependency-review.yml + weekly-security-audit.yml)
      // secret-scanning runs independently via TruffleHog
      expect(ciWorkflow.jobs["secret-scanning"]).toBeDefined();
      expect(ciWorkflow.jobs.security).toBeDefined();
    });

    it("security job has SBOM and env safety checks", () => {
      const securityJob = ciWorkflow.jobs.security;
      expect(securityJob.name).toBe("SBOM & Env Safety");

      // Should have SBOM generation
      const sbomStep = securityJob.steps.find(
        (s: any) => s.name?.includes("SBOM") || s.run?.includes("cyclonedx"),
      );
      expect(sbomStep).toBeDefined();

      // Should check for exposed .env files
      const envCheckStep = securityJob.steps.find(
        (s: any) => s.name?.includes("env") && s.run?.includes("git ls-files"),
      );
      expect(envCheckStep).toBeDefined();
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
