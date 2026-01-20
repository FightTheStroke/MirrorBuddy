import * as fs from "fs";
import * as path from "path";

interface TestSummary {
  playwright: { passed: number; failed: number; skipped: number };
  lighthouse: Record<string, number> | null;
  security: { issues: number; critical: number };
  routes: { found: number; missing: number };
}

function readPlaywrightData(): {
  passed: number;
  failed: number;
  skipped: number;
} {
  const reportPath = path.join(
    process.cwd(),
    "playwright-report",
    "index.html",
  );
  if (!fs.existsSync(reportPath)) return { passed: 0, failed: 0, skipped: 0 };

  const html = fs.readFileSync(reportPath, "utf-8");
  const passMatch = html.match(/(\d+)\s+passed/);
  const failMatch = html.match(/(\d+)\s+failed/);
  const skipMatch = html.match(/(\d+)\s+skipped/);

  return {
    passed: passMatch ? parseInt(passMatch[1], 10) : 0,
    failed: failMatch ? parseInt(failMatch[1], 10) : 0,
    skipped: skipMatch ? parseInt(skipMatch[1], 10) : 0,
  };
}

function readLighthouseData(): Record<string, number> | null {
  const lighthouseDir = path.join(
    process.cwd(),
    ".lighthouseci",
    "lhr-reports",
  );
  if (!fs.existsSync(lighthouseDir)) return null;

  const files = fs
    .readdirSync(lighthouseDir)
    .filter((f) => f.endsWith(".json"));
  if (files.length === 0) return null;

  const results: Record<string, number> = {};
  const lhr = JSON.parse(
    fs.readFileSync(path.join(lighthouseDir, files[0]), "utf-8"),
  );
  const categories = lhr.categories || {};
  for (const [key, value] of Object.entries(categories)) {
    const category = value as { score: number };
    results[key] = Math.round(category.score * 100);
  }
  return results;
}

function readRouteData(): { found: number; missing: number } {
  const routePath = path.join(process.cwd(), "reports", "route-inventory.json");
  if (!fs.existsSync(routePath)) return { found: 0, missing: 0 };

  const inventory = JSON.parse(fs.readFileSync(routePath, "utf-8"));
  return {
    found: inventory.totalRoutes || 0,
    missing: inventory.missingRoutes?.length || 0,
  };
}

function readSecurityData(): { issues: number; critical: number } {
  const secPath = path.join(process.cwd(), "reports", "security-scan.json");
  if (!fs.existsSync(secPath)) return { issues: 0, critical: 0 };

  const scan = JSON.parse(fs.readFileSync(secPath, "utf-8")) as {
    issues?: Array<{ severity: string }>;
  };
  return {
    issues: scan.issues?.length || 0,
    critical: scan.issues?.filter((i) => i.severity === "critical").length || 0,
  };
}

function generateHtml(summary: TestSummary): string {
  const timestamp = new Date().toISOString();
  const statusClass = summary.playwright.failed > 0 ? "failing" : "passing";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MirrorBuddy Test Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #333; margin: 0 0 10px 0; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
    .status { font-size: 14px; color: #666; }
    .status.passing { color: #28a745; }
    .status.failing { color: #dc3545; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
    .card { padding: 20px; border: 1px solid #ddd; border-radius: 6px; }
    .card.failing { border-left: 4px solid #dc3545; }
    .card.passing { border-left: 4px solid #28a745; }
    .card h3 { margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase; color: #666; }
    .metric { font-size: 32px; font-weight: bold; margin: 10px 0; }
    .metric.failing { color: #dc3545; }
    .metric.passing { color: #28a745; }
    .metric.warning { color: #ffc107; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f8f9fa; font-weight: 600; }
    .score { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: 500; font-size: 12px; }
    .score.pass { background: #d4edda; color: #155724; }
    .score.warn { background: #fff3cd; color: #856404; }
    .score.fail { background: #f8d7da; color: #721c24; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>MirrorBuddy Test Report</h1>
        <p class="status ${statusClass}">Status: <strong>${statusClass === "passing" ? "PASSING" : "FAILING"}</strong></p>
      </div>
      <div class="status">${timestamp}</div>
    </div>

    <div class="grid">
      <div class="card ${summary.playwright.failed > 0 ? "failing" : "passing"}">
        <h3>Playwright Tests</h3>
        <div class="metric ${summary.playwright.failed > 0 ? "failing" : "passing"}">${summary.playwright.passed}</div>
        <p>Passed <small>(${summary.playwright.failed} failed, ${summary.playwright.skipped} skipped)</small></p>
      </div>

      <div class="card ${summary.routes.missing > 0 ? "warning" : "passing"}">
        <h3>Route Coverage</h3>
        <div class="metric ${summary.routes.missing > 0 ? "warning" : "passing"}">${summary.routes.found}</div>
        <p>Routes Found <small>(${summary.routes.missing} missing)</small></p>
      </div>

      <div class="card ${summary.security.critical > 0 ? "failing" : summary.security.issues > 0 ? "warning" : "passing"}">
        <h3>Security Scan</h3>
        <div class="metric ${summary.security.critical > 0 ? "failing" : summary.security.issues > 0 ? "warning" : "passing"}">${summary.security.issues}</div>
        <p>Issues Found <small>(${summary.security.critical} critical)</small></p>
      </div>
    </div>

    ${
      summary.lighthouse
        ? `<div style="margin: 30px 0;">
      <h2>Lighthouse Scores</h2>
      <table>
        <tr>
          <th>Category</th>
          <th>Score</th>
          <th>Status</th>
        </tr>
        ${Object.entries(summary.lighthouse)
          .map(
            ([key, score]) => `
        <tr>
          <td>${key}</td>
          <td>${score}</td>
          <td><span class="score ${score >= 90 ? "pass" : score >= 70 ? "warn" : "fail"}">${score >= 90 ? "PASS" : score >= 70 ? "WARN" : "FAIL"}</span></td>
        </tr>
      `,
          )
          .join("")}
      </table>
    </div>`
        : ""
    }

    <div class="footer">
      <p>Generated: ${timestamp}</p>
      <p>Fix issues in order: Critical security → Failed tests → Route coverage → Lighthouse scores</p>
      <p><strong>Next steps:</strong> Review failed tests, check routes/missing, verify security critical items</p>
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  console.log("Generating test report...");

  const summary: TestSummary = {
    playwright: readPlaywrightData(),
    lighthouse: readLighthouseData(),
    security: readSecurityData(),
    routes: readRouteData(),
  };

  const html = generateHtml(summary);
  const reportsDir = path.join(process.cwd(), "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const outputPath = path.join(reportsDir, "full-test-report.html");
  fs.writeFileSync(outputPath, html);

  console.log(`✓ Report generated: ${outputPath}`);
  console.log(
    `  Tests: ${summary.playwright.passed} passed, ${summary.playwright.failed} failed`,
  );
  console.log(
    `  Routes: ${summary.routes.found} found, ${summary.routes.missing} missing`,
  );
  console.log(
    `  Security: ${summary.security.issues} issues (${summary.security.critical} critical)`,
  );
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
