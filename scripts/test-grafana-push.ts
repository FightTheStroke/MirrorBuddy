/**
 * Test script for Grafana Cloud push - sends all V1 metrics
 * Run with: npx tsx scripts/test-grafana-push.ts
 *
 * This pushes example data to verify dashboard connectivity.
 * Real metrics come from /api/metrics via prometheus-push-service.ts
 */

import "dotenv/config";

const url = process.env.GRAFANA_CLOUD_PROMETHEUS_URL;
const user = process.env.GRAFANA_CLOUD_PROMETHEUS_USER;
const apiKey = process.env.GRAFANA_CLOUD_API_KEY;

if (!url || !user || !apiKey) {
  console.error("Missing GRAFANA_CLOUD_* env vars");
  console.error("Required:");
  console.error("  GRAFANA_CLOUD_PROMETHEUS_URL");
  console.error("  GRAFANA_CLOUD_PROMETHEUS_USER");
  console.error("  GRAFANA_CLOUD_API_KEY");
  process.exit(1);
}

console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║  🧪 TEST DATA PUSH - env=test (excluded from dashboard)   ║");
console.log("╚════════════════════════════════════════════════════════════╝");
console.log(`\nURL: ${url}`);

const timestamp = Date.now() * 1000000; // nanoseconds
const baseLabels = "instance=mirrorbuddy,env=test";

// All metrics matching dashboard queries
const metrics = [
  // ============================================
  // SESSION HEALTH (Row 1)
  // ============================================
  `mirrorbuddy_session_success_rate,${baseLabels},period=24h value=0.85 ${timestamp}`,
  `mirrorbuddy_session_dropoff_rate,${baseLabels},period=24h value=0.08 ${timestamp}`,
  `mirrorbuddy_session_stuck_loop_rate,${baseLabels},period=24h value=0.03 ${timestamp}`,
  `mirrorbuddy_session_turns_avg,${baseLabels},period=24h value=12.5 ${timestamp}`,
  `mirrorbuddy_session_duration_minutes_avg,${baseLabels},period=24h value=18.5 ${timestamp}`,
  `mirrorbuddy_sessions_total,${baseLabels},period=24h value=156 ${timestamp}`,

  // ============================================
  // SAFETY METRICS (Row 2)
  // ============================================
  `mirrorbuddy_refusal_precision,${baseLabels},period=7d value=0.98 ${timestamp}`,
  `mirrorbuddy_jailbreak_block_rate,${baseLabels},period=7d value=1.0 ${timestamp}`,
  `mirrorbuddy_incidents_total,${baseLabels},period=7d,severity=S0 value=2 ${timestamp}`,
  `mirrorbuddy_incidents_total,${baseLabels},period=7d,severity=S1 value=1 ${timestamp}`,
  `mirrorbuddy_incidents_total,${baseLabels},period=7d,severity=S2 value=0 ${timestamp}`,
  `mirrorbuddy_incidents_total,${baseLabels},period=7d,severity=S3 value=0 ${timestamp}`,

  // ============================================
  // PERFORMANCE (Row 3)
  // ============================================
  `http_request_duration_seconds,${baseLabels},route=/api/chat,quantile=0.95 value=0.45 ${timestamp}`,
  `http_request_duration_seconds,${baseLabels},route=/api/health,quantile=0.95 value=0.02 ${timestamp}`,
  `http_request_duration_seconds,${baseLabels},route=/api/voice,quantile=0.95 value=0.85 ${timestamp}`,
  `http_request_error_rate,${baseLabels},route=/api/chat value=0.01 ${timestamp}`,
  `http_request_error_rate,${baseLabels},route=/api/health value=0.0 ${timestamp}`,
  `http_request_error_rate,${baseLabels},route=/api/voice value=0.02 ${timestamp}`,

  // ============================================
  // COST CONTROL (Row 4)
  // ============================================
  `mirrorbuddy_cost_per_session_eur,${baseLabels},type=text value=0.03 ${timestamp}`,
  `mirrorbuddy_cost_per_session_eur,${baseLabels},type=voice value=0.12 ${timestamp}`,
  `mirrorbuddy_cost_spikes_total,${baseLabels},period=7d value=0 ${timestamp}`,

  // ============================================
  // EXTERNAL SERVICES (Row 5)
  // ============================================
  `mirrorbuddy_external_service_usage,${baseLabels},service=Azure\\ OpenAI,metric=Chat\\ Tokens/min value=1500 ${timestamp}`,
  `mirrorbuddy_external_service_usage,${baseLabels},service=Azure\\ OpenAI,metric=Embedding\\ Tokens/min value=500 ${timestamp}`,
  `mirrorbuddy_external_service_usage,${baseLabels},service=Google\\ Drive,metric=Queries/min value=10 ${timestamp}`,
  `mirrorbuddy_external_service_usage,${baseLabels},service=Brave\\ Search,metric=Queries/month value=150 ${timestamp}`,

  // ============================================
  // USER ENGAGEMENT (Row 6) - NEW
  // ============================================
  `mirrorbuddy_active_users,${baseLabels},period=24h value=42 ${timestamp}`,
  `mirrorbuddy_active_users,${baseLabels},period=7d value=127 ${timestamp}`,
  `mirrorbuddy_active_users,${baseLabels},period=30d value=312 ${timestamp}`,
  `mirrorbuddy_new_users,${baseLabels},period=24h value=8 ${timestamp}`,

  // ============================================
  // CONVERSION & RETENTION (Row 7) - NEW
  // ============================================
  `mirrorbuddy_onboarding_completion_rate,${baseLabels} value=0.78 ${timestamp}`,
  `mirrorbuddy_voice_adoption_rate,${baseLabels} value=0.35 ${timestamp}`,
  `mirrorbuddy_retention_rate,${baseLabels},cohort=D1 value=0.52 ${timestamp}`,
  `mirrorbuddy_retention_rate,${baseLabels},cohort=D7 value=0.38 ${timestamp}`,
  `mirrorbuddy_retention_rate,${baseLabels},cohort=D30 value=0.22 ${timestamp}`,

  // ============================================
  // MAESTRI & LEARNING (Row 8) - NEW
  // ============================================
  `mirrorbuddy_maestro_sessions,${baseLabels},period=24h,maestro=euclide value=28 ${timestamp}`,
  `mirrorbuddy_maestro_sessions,${baseLabels},period=24h,maestro=leonardo value=22 ${timestamp}`,
  `mirrorbuddy_maestro_sessions,${baseLabels},period=24h,maestro=curie value=18 ${timestamp}`,
  `mirrorbuddy_maestro_sessions,${baseLabels},period=24h,maestro=darwin value=15 ${timestamp}`,
  `mirrorbuddy_maestro_sessions,${baseLabels},period=24h,maestro=galileo value=12 ${timestamp}`,
  `mirrorbuddy_maestro_sessions,${baseLabels},period=24h,maestro=lovelace value=10 ${timestamp}`,
  `mirrorbuddy_maestro_sessions,${baseLabels},period=24h,maestro=manzoni value=9 ${timestamp}`,
  `mirrorbuddy_maestro_sessions,${baseLabels},period=24h,maestro=shakespeare value=7 ${timestamp}`,
  `mirrorbuddy_maestro_sessions,${baseLabels},period=24h,maestro=socrate value=5 ${timestamp}`,
  `mirrorbuddy_maestro_sessions,${baseLabels},period=24h,maestro=mozart value=4 ${timestamp}`,
  `mirrorbuddy_xp_earned,${baseLabels},period=24h value=4850 ${timestamp}`,
  `mirrorbuddy_active_streaks,${baseLabels} value=67 ${timestamp}`,
  `mirrorbuddy_max_level,${baseLabels} value=15 ${timestamp}`,
  `mirrorbuddy_quizzes_completed,${baseLabels},period=24h value=89 ${timestamp}`,
  `mirrorbuddy_flashcards_reviewed,${baseLabels},period=24h value=342 ${timestamp}`,
  `mirrorbuddy_mindmaps_created,${baseLabels},period=24h value=23 ${timestamp}`,
].join("\n");

async function pushMetrics() {
  try {
    const response = await fetch(url!, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Authorization: `Basic ${Buffer.from(`${user}:${apiKey}`).toString("base64")}`,
      },
      body: metrics,
    });

    if (response.ok) {
      console.log("\n✅ All V1 TEST metrics pushed successfully!");
      console.log("\n⚠️  NOTE: These metrics have env=test label");
      console.log("   They are EXCLUDED from the main dashboard by default.");
      console.log("   To view test data, edit dashboard queries to remove env!=\"test\" filter.");
      console.log("\nDashboard: https://mirrorbuddy.grafana.net/d/dashboard/");
      console.log("\nTest metrics sent (env=test):");
      console.log("  Session Health:");
      console.log("    - success=85%, dropoff=8%, stuck=3%, turns=12.5");
      console.log("  Safety:");
      console.log("    - precision=98%, jailbreak=100%, S3=0");
      console.log("  Performance:");
      console.log("    - chat P95=450ms, voice P95=850ms");
      console.log("  Cost:");
      console.log("    - text=\u20ac0.03, voice=\u20ac0.12, spikes=0");
      console.log("  User Engagement:");
      console.log("    - DAU=42, WAU=127, MAU=312, new=8");
      console.log("  Conversion & Retention:");
      console.log("    - onboarding=78%, voice=35%, D1=52%, D7=38%, D30=22%");
      console.log("  Maestri & Learning:");
      console.log("    - top maestro=euclide(28), XP=4850, streaks=67");
    } else {
      const text = await response.text();
      console.error(`\n\u274c Push failed: ${response.status}`);
      console.error(text);
    }
  } catch (error) {
    console.error("\n\u274c Error:", error);
  }
}

pushMetrics();
