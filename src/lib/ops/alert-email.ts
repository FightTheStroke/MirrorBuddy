/**
 * Operations Alert Email Service
 *
 * Sends email alerts to ADMIN_EMAIL when:
 * - Cost budgets breach warning/critical thresholds
 * - External service quotas reach critical levels
 *
 * Uses Resend via existing sendEmail() + deduplication
 * to avoid spamming (max 1 email per alert type per hour).
 *
 * Plan 105 - W5-Alerting [T5-01]
 */

import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import type { CostAlert } from "./cost-tracker";

const log = logger.child({ module: "ops-alert" });

/** Deduplication: track last send time per alert key */
const lastSent = new Map<string, number>();
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour between duplicate alerts

/**
 * Send alert emails for any active cost/quota alerts.
 * Call this after getCostDashboardData() returns alerts.
 */
export async function sendAlertEmails(alerts: CostAlert[]): Promise<number> {
  const to = process.env.ADMIN_EMAIL;
  if (!to) {
    log.warn("ADMIN_EMAIL not set, skipping ops alerts");
    return 0;
  }

  if (alerts.length === 0) return 0;

  const now = Date.now();
  let sent = 0;

  for (const alert of alerts) {
    const key = `${alert.service}:${alert.severity}`;
    const last = lastSent.get(key) || 0;

    if (now - last < COOLDOWN_MS) {
      continue; // Dedup: already sent within the hour
    }

    const result = await sendEmail({
      to,
      subject: `[MirrorBuddy Ops] ${alert.severity.toUpperCase()}: ${alert.service}`,
      html: buildAlertHtml(alert),
      text: buildAlertText(alert),
    });

    if (result.success) {
      lastSent.set(key, now);
      sent++;
      log.info("Ops alert email sent", {
        service: alert.service,
        severity: alert.severity,
        messageId: result.messageId,
      });
    } else {
      log.error("Ops alert email failed", {
        service: alert.service,
        error: result.error,
      });
    }
  }

  return sent;
}

function buildAlertHtml(alert: CostAlert): string {
  const color = alert.severity === "critical" ? "#d32f2f" : "#f59e0b";
  const label = alert.severity === "critical" ? "CRITICAL" : "WARNING";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; color: #333;">
  <div style="max-width: 500px; margin: 0 auto; padding: 20px;">
    <div style="background: ${color}; color: white; padding: 16px; border-radius: 4px 4px 0 0;">
      <h2 style="margin: 0;">${label}: ${alert.service}</h2>
    </div>
    <div style="background: white; border: 1px solid #ddd; padding: 20px; border-radius: 0 0 4px 4px;">
      <p>${alert.message}</p>
      <p style="color: #666; font-size: 0.9em;">
        Time: ${new Date().toISOString()}<br/>
        Dashboard: <a href="${process.env.NEXT_PUBLIC_APP_URL || ""}/admin/mission-control/ops-dashboard">View Ops Dashboard</a>
      </p>
    </div>
    <p style="font-size: 0.8em; color: #999;">
      Automated alert from MirrorBuddy Ops. Max 1 email per alert type per hour.
    </p>
  </div>
</body>
</html>`;
}

function buildAlertText(alert: CostAlert): string {
  return `[${alert.severity.toUpperCase()}] ${alert.service}

${alert.message}

Time: ${new Date().toISOString()}
Dashboard: /admin/mission-control/ops-dashboard

---
Automated alert from MirrorBuddy Ops (max 1/hour per alert type)`;
}
