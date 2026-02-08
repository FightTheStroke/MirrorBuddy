/**
 * @vitest-environment node
 *
 * Regression test for Bug 1: Campaigns page must call service layer
 * directly, NOT fetch its own API route (which fails without cookies
 * in server components).
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("AdminCampaignsPage (server component)", () => {
  it("does not fetch its own API route (regression)", () => {
    const pagePath = path.resolve(__dirname, "../page.tsx");
    const source = fs.readFileSync(pagePath, "utf-8");

    // Must NOT contain fetch() to own API
    expect(source).not.toMatch(/fetch\s*\(/);
    expect(source).not.toContain("/api/admin/email-campaigns");

    // Must import listCampaigns from service layer
    expect(source).toContain("listCampaigns");
    expect(source).toContain("@/lib/email/campaign-service");
  });
});
