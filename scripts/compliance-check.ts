import fs from "fs";
import path from "path";
import { config } from "dotenv";

// Load .env file
config();

interface CheckResult {
  name: string;
  status: "PASS" | "FAIL" | "WARN";
  message: string;
}

const results: CheckResult[] = [];
const projectRoot = process.cwd();

// Utility functions
function checkFileExists(filePath: string, relativeTo = projectRoot): boolean {
  const fullPath = path.join(relativeTo, filePath);
  return fs.existsSync(fullPath);
}

function checkDirectoryExists(
  dirPath: string,
  relativeTo = projectRoot,
): boolean {
  const fullPath = path.join(relativeTo, dirPath);
  return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
}

function getEnvVar(name: string): string | undefined {
  return process.env[name];
}

function addResult(
  name: string,
  status: "PASS" | "FAIL" | "WARN",
  message: string,
): void {
  results.push({ name, status, message });
}

function printResults(): void {
  console.log("\n=== MirrorBuddy Compliance Check ===\n");

  for (const result of results) {
    const icon =
      result.status === "PASS"
        ? "[PASS]"
        : result.status === "WARN"
          ? "[WARN]"
          : "[FAIL]";
    console.log(`${icon} ${result.message}`);
  }

  const passCount = results.filter((r) => r.status === "PASS").length;
  const warnCount = results.filter((r) => r.status === "WARN").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;
  const totalChecks = results.length;

  console.log("\n" + "=".repeat(50));
  console.log(
    `Summary: ${passCount}/${totalChecks} checks passed, ${warnCount} warning(s), ${failCount} failure(s)`,
  );
  console.log("=".repeat(50) + "\n");
}

function getExitCode(): number {
  const failCount = results.filter((r) => r.status === "FAIL").length;
  return failCount > 0 ? 1 : 0;
}

async function runChecks(): Promise<void> {
  console.log("Starting MirrorBuddy Compliance Check...\n");

  // ===== 1. DOCUMENTATION CHECKS =====
  console.log("Checking compliance documentation...");

  const docChecks = [
    { file: "docs/compliance/DPIA.md", name: "DPIA document" },
    { file: "docs/compliance/AI-POLICY.md", name: "AI Policy document" },
    { file: "docs/compliance/MODEL-CARD.md", name: "Model Card document" },
    { file: "docs/compliance/AI-LITERACY.md", name: "AI Literacy document" },
    {
      file: "docs/compliance/AI-RISK-MANAGEMENT.md",
      name: "AI Risk Management document",
    },
    {
      file: "docs/compliance/BIAS-AUDIT-REPORT.md",
      name: "Bias Audit Report document",
    },
  ];

  for (const check of docChecks) {
    if (checkFileExists(check.file)) {
      addResult(check.name, "PASS", `${check.name} exists`);
    } else {
      addResult(check.name, "FAIL", `Missing: ${check.file}`);
    }
  }

  // ===== 2. PAGES ACCESSIBILITY CHECKS =====
  console.log("Checking compliance pages...");

  const pageChecks = [
    { path: "src/app/ai-transparency", name: "AI Transparency page" },
    { path: "src/app/privacy", name: "Privacy page" },
    { path: "src/app/terms", name: "Terms page" },
  ];

  for (const check of pageChecks) {
    if (checkDirectoryExists(check.path)) {
      addResult(check.name, "PASS", `${check.name} accessible`);
    } else {
      addResult(check.name, "FAIL", `Missing: ${check.path}`);
    }
  }

  // ===== 3. API ENDPOINTS CHECKS =====
  console.log("Checking compliance API endpoints...");

  const apiChecks = [
    {
      path: "src/app/api/privacy/delete-my-data",
      name: "Data export/deletion API",
    },
    {
      path: "src/app/api/compliance/audit-log",
      name: "Compliance audit log API",
    },
  ];

  for (const check of apiChecks) {
    if (checkDirectoryExists(check.path)) {
      addResult(check.name, "PASS", `${check.name} exists`);
    } else {
      addResult(check.name, "FAIL", `Missing: ${check.path}`);
    }
  }

  // ===== 4. SAFETY SYSTEMS CHECKS =====
  console.log("Checking safety systems...");

  const safetyChecks = [
    {
      path: "src/lib/safety/escalation",
      name: "Safety escalation system",
    },
    {
      path: "src/lib/safety/audit",
      name: "Compliance audit service",
    },
  ];

  for (const check of safetyChecks) {
    if (checkDirectoryExists(check.path)) {
      addResult(check.name, "PASS", `${check.name} exists`);
    } else {
      addResult(check.name, "FAIL", `Missing: ${check.path}`);
    }
  }

  // ===== 5. ENVIRONMENT VARIABLES CHECKS =====
  console.log("Checking environment variables...");

  const envChecks = [
    { name: "ADMIN_EMAIL", critical: true },
    { name: "RESEND_API_KEY", critical: false },
  ];

  for (const check of envChecks) {
    const value = getEnvVar(check.name);
    if (value) {
      addResult(check.name, "PASS", `${check.name} is set`);
    } else if (check.critical) {
      addResult(
        check.name,
        "FAIL",
        `${check.name} not set (required for compliance)`,
      );
    } else {
      addResult(
        check.name,
        "WARN",
        `${check.name} not set (email features disabled)`,
      );
    }
  }

  // Additional environment checks for compliance
  const additionalEnvChecks = [
    { name: "DATABASE_URL", critical: true },
    { name: "SESSION_SECRET", critical: true },
  ];

  for (const check of additionalEnvChecks) {
    const value = getEnvVar(check.name);
    if (value) {
      addResult(check.name, "PASS", `${check.name} is set`);
    } else {
      addResult(check.name, "FAIL", `${check.name} not set (required)`);
    }
  }

  printResults();
  const exitCode = getExitCode();
  process.exit(exitCode);
}

runChecks().catch((error) => {
  console.error("Error running compliance checks:", error);
  process.exit(1);
});
