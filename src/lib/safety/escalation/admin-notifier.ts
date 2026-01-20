/**
 * Admin Notification Service
 * Sends escalation notifications to administrators via email
 * Part of human escalation pathway (F-06)
 */

import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import type { EscalationEvent, EscalationTrigger } from "./types";

const log = logger.child({ module: "admin-notifier" });

/**
 * Sanitize content for email (no PII, truncated)
 */
function sanitizeContent(text: string, maxLength = 200): string {
  if (!text) return "";
  let sanitized = text.replace(/[\r\n]+/g, " ").trim();
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + "...";
  }
  return sanitized;
}

/**
 * Get trigger-specific email details
 */
function getTriggerDetails(trigger: EscalationTrigger): {
  prefix: string;
  description: string;
} {
  const details: Record<
    EscalationTrigger,
    { prefix: string; description: string }
  > = {
    crisis_detected: {
      prefix: "[CRITICAL] Crisis Detected",
      description:
        "Student expressed suicidal or self-harm ideation. Immediate human review recommended.",
    },
    repeated_jailbreak: {
      prefix: "[HIGH] Repeated Jailbreak Attempts",
      description:
        "Student attempted multiple prompt injections/jailbreak attacks. Possible abuse or misuse.",
    },
    severe_content_filter: {
      prefix: "[HIGH] Severe Content Filter Violation",
      description:
        "Critical content filter violation detected (violence, harm, explicit). Review recommended.",
    },
    age_gate_bypass: {
      prefix: "[HIGH] Potential Age Verification Bypass",
      description:
        "Pattern detected suggesting potential age verification bypass attempt.",
    },
    session_termination: {
      prefix: "[HIGH] Session Forcibly Terminated",
      description:
        "Session was terminated due to safety threshold. Review logs.",
    },
  };
  return details[trigger];
}

/**
 * Build HTML email content for admin notification
 */
function buildEmailHtml(
  event: EscalationEvent,
  trigger: EscalationTrigger,
): string {
  const { prefix, description } = getTriggerDetails(trigger);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mirrorbuddy.org";
  const timestamp = event.timestamp.toISOString();

  const contentSnippet = event.metadata.contentSnippet
    ? `<p><strong>Content:</strong><br/><code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${event.metadata.contentSnippet}</code></p>`
    : "";

  const attemptCount =
    event.metadata.jailbreakAttemptCount !== undefined
      ? `<p><strong>Jailbreak Attempts:</strong> ${event.metadata.jailbreakAttemptCount}</p>`
      : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .header { background: #d32f2f; color: white; padding: 20px; border-radius: 4px 4px 0 0; }
    .header h2 { margin: 0 0 10px 0; }
    .content { background: white; padding: 20px; border-radius: 0 0 4px 4px; }
    .metadata { background: #f9f9f9; padding: 12px; border-left: 4px solid #d32f2f; margin: 15px 0; font-size: 0.9em; }
    .action-button { display: inline-block; background: #d32f2f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 10px; }
    hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
    .footer { font-size: 0.85em; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>${prefix}</h2>
      <p style="margin: 0;">Escalation ID: ${event.id}</p>
    </div>
    <div class="content">
      <p><strong>Trigger:</strong> ${trigger}</p>
      <p><strong>Severity:</strong> ${event.severity.toUpperCase()}</p>
      <p><strong>Timestamp:</strong> ${timestamp}</p>
      <p><strong>Trigger Description:</strong></p>
      <p>${description}</p>

      <div class="metadata">
        <p><strong>Anonymized User ID:</strong> ${event.anonymizedUserId || "(unknown)"}</p>
        <p><strong>Session Hash:</strong> ${event.sessionHash || "(unknown)"}</p>
        ${event.maestroId ? `<p><strong>Maestro:</strong> ${event.maestroId}</p>` : ""}
        <p><strong>Reason:</strong> ${event.metadata.reason || "(not provided)"}</p>
        ${attemptCount}
      </div>

      ${contentSnippet}

      <p><strong>Recommended Action:</strong></p>
      <ul>
        <li>Review the escalation details in the admin dashboard</li>
        <li>Check session history for context</li>
        <li>Contact student or parent if appropriate</li>
        <li>Document response in case notes</li>
      </ul>

      <p style="margin-top: 20px;">
        <a href="${baseUrl}/admin/escalations/${event.id}" class="action-button">
          View in Dashboard
        </a>
      </p>

      <hr>
      <div class="footer">
        <p>This is an automated escalation from MirrorBuddy's safety system.</p>
        <p>Event ID: ${event.id}</p>
        <p>This message contains anonymized, non-PII information only.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Build plain text email content
 */
function buildEmailText(
  event: EscalationEvent,
  trigger: EscalationTrigger,
): string {
  const { prefix, description } = getTriggerDetails(trigger);
  const timestamp = event.timestamp.toISOString();

  const text = `
${prefix}
${"-".repeat(60)}

Event ID: ${event.id}
Trigger: ${trigger}
Severity: ${event.severity}
Timestamp: ${timestamp}

${description}

User ID (anonymized): ${event.anonymizedUserId || "(unknown)"}
Session Hash: ${event.sessionHash || "(unknown)"}
${event.maestroId ? `Maestro: ${event.maestroId}` : ""}
Reason: ${event.metadata.reason || "(not provided)"}
${event.metadata.jailbreakAttemptCount !== undefined ? `Jailbreak Attempts: ${event.metadata.jailbreakAttemptCount}` : ""}

Recommended Actions:
1. Review the escalation details in the admin dashboard
2. Check session history for context
3. Contact student or parent if appropriate
4. Document response in case notes

${"-".repeat(60)}
This is an automated escalation from MirrorBuddy's safety system.
  `;

  return text;
}

/**
 * Send admin notification for escalation event
 */
export async function notifyAdmin(
  event: EscalationEvent,
  adminEmail?: string,
): Promise<boolean> {
  const to = adminEmail || process.env.ADMIN_EMAIL;

  if (!to) {
    log.warn("No admin email configured for escalation", { eventId: event.id });
    return false;
  }

  const { prefix } = getTriggerDetails(event.trigger);
  const html = buildEmailHtml(event, event.trigger);
  const text = buildEmailText(event, event.trigger);

  const result = await sendEmail({
    to,
    subject: `MirrorBuddy Escalation: ${prefix}`,
    html,
    text,
  });

  if (result.success) {
    log.info("Admin notified of escalation", {
      eventId: event.id,
      trigger: event.trigger,
      messageId: result.messageId,
    });
    event.adminNotified = true;
    event.adminNotifiedAt = new Date();
    return true;
  } else {
    log.error("Failed to notify admin", {
      eventId: event.id,
      error: result.error,
    });
    return false;
  }
}
