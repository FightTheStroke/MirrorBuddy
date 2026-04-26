/**
 * @vitest-environment node
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("nightly benchmark script", () => {
  const scriptPath = path.join(process.cwd(), "scripts/nightly-benchmark.ts");

  it("exists in scripts folder", () => {
    expect(existsSync(scriptPath)).toBe(true);
  });

  it("mentions SyntheticProfile and maestro matrix logic", () => {
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toMatch(/SyntheticProfile|syntheticProfile/);
    expect(source).toMatch(/maestro/);
  });

  it("starts as a tsx-runnable TypeScript module", () => {
    const source = readFileSync(scriptPath, "utf8");
    const firstLines = source.split("\n").slice(0, 5).join("\n");
    expect(firstLines).toMatch(/tsx|ts-node|import/);
  });
});
