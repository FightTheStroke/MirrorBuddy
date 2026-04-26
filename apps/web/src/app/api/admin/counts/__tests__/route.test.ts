/**
 * @vitest-environment node
 *
 * Regression test for Bug 6: Admin counts queries must filter
 * isTestData: false on UserActivity to exclude test data from
 * activeUsers24h metric.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const FILES_WITH_ACTIVE_USERS_QUERY = [
  {
    name: "counts/route.ts",
    path: path.resolve(__dirname, "../route.ts"),
  },
  {
    name: "counts/stream/route.ts",
    path: path.resolve(__dirname, "../stream/route.ts"),
  },
  {
    name: "publish-admin-counts.ts",
    path: path.resolve(
      __dirname,
      "../../../../../lib/helpers/publish-admin-counts.ts",
    ),
  },
  {
    name: "calculate-and-publish-admin-counts.ts",
    path: path.resolve(
      __dirname,
      "../../../../../lib/admin/calculate-and-publish-admin-counts.ts",
    ),
  },
];

describe("Admin counts - isTestData filter (regression)", () => {
  for (const file of FILES_WITH_ACTIVE_USERS_QUERY) {
    it(`${file.name} filters UserActivity with isTestData: false`, () => {
      const source = fs.readFileSync(file.path, "utf-8");

      // Find userActivity.groupBy blocks
      const hasGroupBy = source.includes("userActivity.groupBy");
      expect(
        hasGroupBy,
        `${file.name} should contain userActivity.groupBy query`,
      ).toBe(true);

      // The isTestData filter must appear in the same query block
      // Extract the groupBy call context (rough check)
      const groupByIndex = source.indexOf("userActivity.groupBy");
      const queryBlock = source.substring(groupByIndex, groupByIndex + 300);
      expect(
        queryBlock,
        `${file.name}: userActivity.groupBy must include isTestData: false`,
      ).toContain("isTestData: false");
    });

    it(`${file.name} does not claim UserActivity lacks isTestData field`, () => {
      const source = fs.readFileSync(file.path, "utf-8");

      // The old misleading comment should be gone
      expect(source).not.toContain("doesn't have isTestData");
      expect(source).not.toContain("does not have isTestData");
    });
  }
});
