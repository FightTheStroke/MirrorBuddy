/**
 * MIRRORBUDDY - Email Service (Resend)
 *
 * Transactional email service for:
 * - Beta invite requests (admin notification)
 * - Beta approval (user credentials)
 * - Password reset
 *
 * Requires RESEND_API_KEY in environment.
 */

import { Resend } from "resend";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "email" });

// Lazy-init Resend client
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    log.warn("RESEND_API_KEY not configured - email disabled");
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
    log.info("Resend client initialized");
  }

  return resendClient;
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Email send options
 */
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Email send result
 */
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email via Resend
 *
 * @param options - Email options
 * @returns Send result with messageId or error
 */
export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  const client = getResendClient();

  if (!client) {
    return {
      success: false,
      error: "Email service not configured (RESEND_API_KEY missing)",
    };
  }

  const from = options.from || "MirrorBuddy <noreply@mirrorbuddy.app>";

  try {
    const { data, error } = await client.emails.send({
      from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    if (error) {
      log.error("Resend API error", { error, to: options.to });
      return { success: false, error: error.message };
    }

    log.info("Email sent", { messageId: data?.id, to: options.to });
    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.error("Email send failed", { error: message, to: options.to });
    return { success: false, error: message };
  }
}

/**
 * Send test email to verify configuration
 */
export async function sendTestEmail(to: string): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: "MirrorBuddy - Test Email",
    html: `
      <h1>Test Email</h1>
      <p>This is a test email from MirrorBuddy.</p>
      <p>If you received this, your email configuration is working correctly.</p>
      <p><small>Sent at: ${new Date().toISOString()}</small></p>
    `,
    text: "This is a test email from MirrorBuddy. If you received this, your email configuration is working correctly.",
  });
}
