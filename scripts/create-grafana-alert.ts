/**
 * Create Grafana Cloud Alert Rule - Azure OpenAI TPM > 80%
 *
 * Creates a proactive alert rule in Grafana Cloud for Azure OpenAI TPM usage.
 * Implements F-02 and F-07 requirements.
 *
 * Prerequisites:
 *   - GRAFANA_CLOUD_PROMETHEUS_URL: Grafana Cloud instance URL
 *   - GRAFANA_CLOUD_API_KEY: Grafana Cloud API token with alerts:write permission
 *   - GRAFANA_CLOUD_PROMETHEUS_USER: Instance ID
 *
 * Usage:
 *   npx tsx scripts/create-grafana-alert.ts
 *
 * Alert Details:
 *   - Title: MirrorBuddy - Azure OpenAI Tokens/min High Usage
 *   - Condition: TPM usage > 80% (proactive warning)
 *   - Evaluation: Every 1 minute (real-time)
 *   - Duration: 3 minutes (avoid false alarms)
 *   - Severity: warning
 */

import "dotenv/config";

interface AlertRule {
  title: string;
  condition: string;
  data: AlertRuleData[];
  noDataState: string;
  execErrState: string;
  for: string;
  annotations: Record<string, string>;
  labels: Record<string, string>;
}

interface AlertRuleData {
  refId: string;
  queryType: string;
  model: {
    expr: string;
    interval: string;
    legendFormat: string;
  };
  datasourceUid: string;
  relativeTimeRange: {
    from: number;
    to: number;
  };
}

async function createGrafanaAlert() {
  const instanceId = process.env.GRAFANA_CLOUD_PROMETHEUS_USER;
  const apiKey = process.env.GRAFANA_CLOUD_API_KEY;

  if (!instanceId || !apiKey) {
    console.error("Missing required environment variables:");
    console.error("  - GRAFANA_CLOUD_PROMETHEUS_USER");
    console.error("  - GRAFANA_CLOUD_API_KEY");
    process.exit(1);
  }

  // Grafana Cloud API endpoint
  const grafanaUrl = `https://${instanceId}.grafana.net`;

  // First, get the Prometheus datasource UID
  console.log("Step 1: Fetching Prometheus datasource UID...");
  const datasourcesResponse = await fetch(`${grafanaUrl}/api/datasources`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!datasourcesResponse.ok) {
    console.error(
      `Failed to fetch datasources: ${datasourcesResponse.status}`,
    );
    console.error(await datasourcesResponse.text());
    process.exit(1);
  }

  const datasources = await datasourcesResponse.json() as Array<{
    uid: string;
    name: string;
    type: string;
  }>;
  const prometheusDatasource = datasources.find((ds) => ds.type === "prometheus");

  if (!prometheusDatasource) {
    console.error("No Prometheus datasource found in Grafana Cloud instance");
    process.exit(1);
  }

  console.log(`✓ Found Prometheus datasource: ${prometheusDatasource.uid}`);

  // Get folder for alerts (usually "Alerts")
  console.log("\nStep 2: Fetching alert folder...");
  const foldersResponse = await fetch(`${grafanaUrl}/api/folders`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!foldersResponse.ok) {
    console.error(`Failed to fetch folders: ${foldersResponse.status}`);
    process.exit(1);
  }

  const folders = await foldersResponse.json() as Array<{
    uid: string;
    title: string;
  }>;
  const alertsFolder = folders.find((f) => f.title === "Alerts")
    || folders[0];

  console.log(`✓ Using folder: ${alertsFolder.title} (${alertsFolder.uid})`);

  // Create the alert rule
  console.log("\nStep 3: Creating alert rule...");

  const alertRule: AlertRule = {
    title: "MirrorBuddy - Azure OpenAI Tokens/min High Usage",
    condition: "B",
    data: [
      {
        refId: "A",
        queryType: "instant",
        model: {
          expr: 'service_limit_usage_percentage{service="azure_openai",metric="chat_tpm"}',
          interval: "1m",
          legendFormat: "TPM Usage %",
        },
        datasourceUid: prometheusDatasource.uid,
        relativeTimeRange: {
          from: 60,
          to: 0,
        },
      },
      {
        refId: "B",
        queryType: "expression",
        model: {
          expr: "$A > 80",
          interval: "",
          legendFormat: "Above 80%",
        },
        datasourceUid: "-100",
        relativeTimeRange: {
          from: 600,
          to: 0,
        },
      },
    ],
    noDataState: "NoData",
    execErrState: "Alerting",
    for: "3m",
    annotations: {
      summary: "Azure OpenAI TPM usage above 80%",
      description:
        "Current TPM: {{ $values.A.Value }}%. Limit: 10K TPM per deployment. Consider increasing quota or implementing rate limiting.",
      runbook_url: "/admin/service-limits",
    },
    labels: {
      severity: "warning",
      service: "azure_openai",
      component: "token_limits",
    },
  };

  const createAlertResponse = await fetch(
    `${grafanaUrl}/api/v1/provisioning/alert-rules`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(alertRule),
    },
  );

  if (!createAlertResponse.ok) {
    const errorText = await createAlertResponse.text();
    console.error(
      `Failed to create alert rule: ${createAlertResponse.status}`,
    );
    console.error(errorText);

    // Try to parse error details
    try {
      const errorJson = JSON.parse(errorText);
      console.error("Error details:", errorJson);
    } catch {
      console.error("Raw error:", errorText);
    }
    process.exit(1);
  }

  const alertResponse = await createAlertResponse.json() as {
    uid: string;
    title: string;
  };

  console.log("✓ Alert rule created successfully!");
  console.log(`  UID: ${alertResponse.uid}`);
  console.log(`  Title: ${alertResponse.title}`);

  // Verify the alert was created
  console.log("\nStep 4: Verifying alert rule...");
  const verifyResponse = await fetch(
    `${grafanaUrl}/api/v1/provisioning/alert-rules/${alertResponse.uid}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!verifyResponse.ok) {
    console.error(`Failed to verify alert: ${verifyResponse.status}`);
    process.exit(1);
  }

  const verifiedAlert = await verifyResponse.json() as {
    uid: string;
    title: string;
    for: string;
    annotations: Record<string, string>;
  };

  console.log("✓ Alert rule verified!");
  console.log(`\nAlert Configuration:`);
  console.log(`  UID: ${verifiedAlert.uid}`);
  console.log(`  Title: ${verifiedAlert.title}`);
  console.log(`  Evaluation Interval: 1 minute`);
  console.log(`  Wait Duration: ${verifiedAlert.for}`);
  console.log(`  Condition: TPM > 80%`);
  console.log(`  Severity: warning`);
  console.log(`\nAnnotations:`);
  Object.entries(verifiedAlert.annotations).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  console.log(`\n🎉 Alert rule ready for Grafana Cloud!`);
  console.log(`   Dashboard: https://${instanceId}.grafana.net/`);
  console.log(
    `   Alert UID: ${verifiedAlert.uid} (for reference/updates/deletion)`,
  );

  return alertResponse.uid;
}

// Run the script
createGrafanaAlert().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
