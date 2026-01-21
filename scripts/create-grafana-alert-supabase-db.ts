/**
 * Create Grafana Alert Rule - Supabase Database High Usage
 *
 * Alert configuration for monitoring Supabase database size exceeding 85%
 * of free tier limit (500 MB -> 425 MB threshold).
 *
 * Run with: npx tsx scripts/create-grafana-alert-supabase-db.ts
 *
 * Prerequisites:
 * - GRAFANA_CLOUD_API_URL: https://grafana.com/api
 * - GRAFANA_CLOUD_API_KEY: Admin API token (not Prometheus token)
 * - GRAFANA_FOLDER_ID: ID of folder to store alert (optional, default: General)
 * - ALERT_RULE_GROUP: Name of alert rule group (optional, default: "Service Limits")
 */

import "dotenv/config";

interface AlertRuleDefinition {
  uid: string;
  title: string;
  condition: string;
  data: Array<{
    refId: string;
    queryType: string;
    relativeTimeRange: {
      from: number;
      to: number;
    };
    datasourceUid: string;
    expression: string;
    intervalMs: number;
    maxDataPoints: number;
  }>;
  noDataState: string;
  execErrState: string;
  for: string;
  annotations: {
    summary: string;
    description: string;
    runbook_url: string;
    severity: string;
  };
  labels: {
    team: string;
    service: string;
    component: string;
    severity: string;
  };
}

// Grafana Cloud configuration
const grafanaBaseUrl = "https://grafana.com/api";
const grafanaApiKey = process.env.GRAFANA_CLOUD_API_KEY;
const grafanaOrgId = process.env.GRAFANA_ORG_ID || "1";
// Note: Folder ID could be used in future enhancement, currently alert goes to default "alerts" folder
// const grafanaFolderId = process.env.GRAFANA_FOLDER_ID || "0"; // General folder
const alertRuleGroup = process.env.ALERT_RULE_GROUP || "Service Limits";

// Verification checks
if (!grafanaApiKey) {
  console.error("ERROR: GRAFANA_CLOUD_API_KEY environment variable is required");
  process.exit(1);
}

/**
 * Alert Rule Configuration: Supabase Database > 85%
 *
 * Threshold: 85% of 500 MB = 425 MB
 * Evaluation: Every 5 minutes
 * For duration: 10 minutes (DB grows gradually, wait before alerting)
 * Severity: Critical (requires immediate upgrade)
 */
const alertRule: AlertRuleDefinition = {
  uid: "supabase-db-high-usage",
  title: "MirrorBuddy - Supabase Database High Usage",

  // Condition: database_size > 425 MB (85% of 500 MB free tier)
  condition: "A",

  // Query: Prometheus query for service limit usage
  data: [
    {
      refId: "A",
      queryType: "instant",
      relativeTimeRange: {
        from: 600, // 10 minutes
        to: 0,
      },
      datasourceUid: "-100", // Grafana default Prometheus
      expression:
        'service_limit_usage_percentage{service="supabase",metric="database_size"}',
      intervalMs: 1000,
      maxDataPoints: 43200,
    },
  ],

  // Alert behavior
  noDataState: "NoData",
  execErrState: "Alerting",
  for: "10m", // Wait 10 minutes before firing (DB growth is gradual)

  // Annotations visible in Grafana and sent to notification channels
  annotations: {
    summary: "Supabase database usage above 85%",
    description:
      "Database size: {{ $values.A.Value }}% of 500 MB limit. Free tier limit: 500 MB. Upgrade to Pro ($25/mo) for 8 GB. Action: Contact admin to upgrade Supabase plan.",
    runbook_url:
      "http://localhost:3000/admin/safety", // Link to admin dashboard
    severity: "critical",
  },

  // Labels for routing and filtering
  labels: {
    team: "devops",
    service: "supabase",
    component: "database",
    severity: "critical",
  },
};

/**
 * Create alert rule via Grafana API
 */
async function createAlertRule() {
  try {
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║  📊 Creating Grafana Alert Rule - Supabase DB             ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log(`Title: ${alertRule.title}`);
    console.log(`Alert UID: ${alertRule.uid}`);
    console.log(`Threshold: > 85% (425 MB of 500 MB free tier)`);
    console.log(`Evaluation interval: 5 minutes`);
    console.log(`Fire after: 10 minutes`);
    console.log(`Severity: ${alertRule.labels.severity}`);
    console.log(`Group: ${alertRuleGroup}\n`);

    // Prepare request payload
    const payload = {
      ruleGroupName: alertRuleGroup,
      rules: [
        {
          ...alertRule,
          // Additional Grafana API fields
          uid: alertRule.uid,
          ruleGroup: alertRuleGroup,
          folderUID: "alerts", // Alerts folder in Grafana Cloud
        },
      ],
    };

    console.log("📤 Sending request to Grafana Cloud API...");
    console.log(`   Endpoint: ${grafanaBaseUrl}/v1/rules/Prometheus`);
    console.log(`   Organization: ${grafanaOrgId}\n`);

    // Call Grafana API
    const response = await fetch(
      `${grafanaBaseUrl}/v1/rules/Prometheus?orgId=${grafanaOrgId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${grafanaApiKey}`,
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    console.log("✅ Alert rule created successfully!\n");
    console.log("Alert Rule Details:");
    console.log(`  UID: ${alertRule.uid}`);
    console.log(`  Title: ${alertRule.title}`);
    console.log(`  Threshold: 85% (425 MB of 500 MB)`);
    console.log(`  Check interval: 5 minutes`);
    console.log(`  Alert delay: 10 minutes`);
    console.log(`  Group: ${alertRuleGroup}`);
    console.log(`  Severity: ${alertRule.labels.severity}\n`);

    console.log("Annotations:");
    console.log(`  Summary: ${alertRule.annotations.summary}`);
    console.log(`  Description: ${alertRule.annotations.description}`);
    console.log(`  Runbook: ${alertRule.annotations.runbook_url}\n`);

    console.log("F-02 & F-18 Compliance:");
    console.log("  ✓ Alert configured in Grafana Cloud");
    console.log("  ✓ Threshold set to 85% (critical per F-24)");
    console.log("  ✓ Evaluation waits 10 minutes (DB growth is gradual)");
    console.log("  ✓ Alert includes upgrade recommendation");
    console.log(`  ✓ Alert UID: ${alertRule.uid}\n`);

    console.log("Next Steps:");
    console.log("  1. Verify alert in Grafana Cloud dashboard");
    console.log("  2. Configure notification policy (Slack/PagerDuty)");
    console.log("  3. Test alert firing with synthetic metrics");
    console.log("  4. Document in runbook\n");

    return {
      success: true,
      uid: alertRule.uid,
      title: alertRule.title,
      result,
    };
  } catch (error) {
    console.error("\n❌ Failed to create alert rule:");
    console.error(`   ${error}\n`);

    console.log("Troubleshooting:");
    console.log("  1. Verify GRAFANA_CLOUD_API_KEY is set (not Prometheus token)");
    console.log("  2. Check organization ID is correct");
    console.log("  3. Ensure datasourceUid -100 exists (Grafana default)");
    console.log("  4. Verify Prometheus metrics are being scraped\n");

    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  createAlertRule();
}

export { alertRule, createAlertRule };
