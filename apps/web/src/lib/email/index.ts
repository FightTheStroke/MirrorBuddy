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
import { CircuitBreaker, withRetry } from "@/lib/resilience/circuit-breaker";

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
 * Email circuit breaker - shared across all email operations
 * Opens after 3 failures, 2-minute timeout for email operations
 * Exported for testing purposes (to reset between tests)
 */
export const emailCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  timeout: 120000, // 2 minutes (email can be slow)
  onStateChange: (from, to) => {
    log.warn(`Email circuit breaker state change: ${from} -> ${to}`);
  },
});

/**
 * Determine if an email error is retryable
 * Rate limits and server errors are retryable
 * Invalid input and auth errors are not retryable
 */
function isRetryableEmailError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();
  const errorData = error as Error & { statusCode?: number; status?: number };
  const statusCode = errorData?.statusCode || errorData?.status;

  // Check for status codes
  if (statusCode) {
    // Retryable: rate limit, server errors, service unavailable
    if (
      statusCode === 429 ||
      statusCode === 500 ||
      statusCode === 503 ||
      statusCode === 502
    ) {
      return true;
    }
    // Non-retryable: bad request, auth, forbidden, not found
    if (
      statusCode === 400 ||
      statusCode === 401 ||
      statusCode === 403 ||
      statusCode === 404
    ) {
      return false;
    }
  }

  // Check error message patterns
  if (
    errorMessage.includes("rate limit") ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("server error") ||
    errorMessage.includes("unavailable")
  ) {
    return true;
  }

  if (
    errorMessage.includes("invalid") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("forbidden") ||
    errorMessage.includes("not found")
  ) {
    return false;
  }

  // Default: retry unknown errors
  return true;
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  const configured = !!process.env.RESEND_API_KEY;
  if (!configured) {
    log.warn("Email disabled: RESEND_API_KEY missing");
  }
  return configured;
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

  const from = options.from || process.env.FROM_EMAIL;

  if (!from) {
    log.error("FROM_EMAIL not configured");
    return {
      success: false,
      error: "FROM_EMAIL environment variable not configured",
    };
  }

  try {
    // Execute with circuit breaker and retry logic
    const data = await emailCircuitBreaker.execute(async () => {
      return withRetry(
        async () => {
          const { data, error } = await client.emails.send({
            from,
            to: Array.isArray(options.to) ? options.to : [options.to],
            subject: options.subject,
            html: options.html,
            text: options.text,
            replyTo: options.replyTo,
          });

          // Convert Resend error response to thrown error for retry logic
          if (error) {
            const err = new Error(error.message) as Error & {
              statusCode?: number;
            };
            err.statusCode = (error as { statusCode?: number }).statusCode;
            throw err;
          }

          return data;
        },
        {
          maxRetries: 2,
          baseDelayMs: 2000,
          maxDelayMs: 10000,
          retryableErrors: isRetryableEmailError,
        },
      );
    });

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
