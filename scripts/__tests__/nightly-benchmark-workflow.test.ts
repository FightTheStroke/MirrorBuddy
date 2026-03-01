import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflowPath = resolve(process.cwd(), ".github/workflows/nightly-benchmark.yml");

describe("nightly benchmark workflow", () => {
  it("defines nightly benchmark schedule and trigger", () => {
    const content = readFileSync(workflowPath, "utf8");

    expect(content).toContain("schedule:");
    expect(content).toContain('cron: "0 2 1 */3 *"');
    expect(content).toContain("nightly-benchmark");
  });

  it("runs benchmark script with required secrets", () => {
    const content = readFileSync(workflowPath, "utf8");

    expect(content).toContain("scripts/nightly-benchmark.ts");
    expect(content).toContain("DATABASE_URL: ${{ secrets.DATABASE_URL }}");
    expect(content).toContain("OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}");
  });

  it("captures exit code and defines regression alert channels", () => {
    const content = readFileSync(workflowPath, "utf8");

    expect(content).toContain("BENCHMARK_EXIT_CODE");
    expect(content).toContain("api.resend.com/emails");
    expect(content).toContain("SLACK_WEBHOOK_URL");
  });
});
