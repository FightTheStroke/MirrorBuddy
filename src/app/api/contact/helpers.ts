/**
 * Contact API Helpers
 * Email formatting and database operations
 */

import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "contact-api" });

/**
 * Escape HTML special characters to prevent XSS in email templates
 */
function escapeHtml(unsafe: string | undefined | null): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface ContactFormData {
  name: string;
  email: string;
  type: "general" | "schools" | "enterprise";
  [key: string]: string | string[] | undefined;
}

interface EmailResult {
  success: boolean;
  error?: string;
}

/**
 * Extract form-specific data fields
 */
export function extractFormData(
  body: ContactFormData,
): Record<string, string | string[] | undefined> {
  const { name: _name, email: _email, type: _type, ...data } = body;
  return data;
}

/**
 * Get contact type display name
 */
function getContactTypeLabel(type: string): string {
  switch (type) {
    case "general":
      return "General Contact";
    case "schools":
      return "Schools Contact";
    case "enterprise":
      return "Enterprise Contact";
    default:
      return "Contact";
  }
}

/**
 * Format contact data as HTML email
 */
function formatEmailHtml(
  type: string,
  name: string,
  email: string,
  data: Record<string, string | string[] | undefined>,
): string {
  const typeLabel = getContactTypeLabel(type);
  const timestamp = new Date().toLocaleString("it-IT", {
    timeZone: "Europe/Rome",
  });

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #4F46E5; color: white; padding: 20px; }
        .content { padding: 20px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #666; }
        .value { margin-top: 5px; }
        .footer { padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${typeLabel}</h1>
      </div>
      <div class="content">
        <div class="field">
          <div class="label">Nome:</div>
          <div class="value">${escapeHtml(name)}</div>
        </div>
        <div class="field">
          <div class="label">Email:</div>
          <div class="value"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></div>
        </div>
  `;

  // Add type-specific fields (all user input is escaped to prevent XSS)
  if (type === "general") {
    html += `
        <div class="field">
          <div class="label">Oggetto:</div>
          <div class="value">${escapeHtml(data.subject as string) || "N/A"}</div>
        </div>
        <div class="field">
          <div class="label">Messaggio:</div>
          <div class="value">${escapeHtml(data.message as string) || "N/A"}</div>
        </div>
    `;
  } else if (type === "schools") {
    html += `
        <div class="field">
          <div class="label">Ruolo:</div>
          <div class="value">${escapeHtml(data.role as string) || "N/A"}</div>
        </div>
        <div class="field">
          <div class="label">Scuola:</div>
          <div class="value">${escapeHtml(data.schoolName as string) || "N/A"}</div>
        </div>
        <div class="field">
          <div class="label">Tipo Scuola:</div>
          <div class="value">${escapeHtml(data.schoolType as string) || "N/A"}</div>
        </div>
        <div class="field">
          <div class="label">Numero Studenti:</div>
          <div class="value">${escapeHtml(data.studentCount as string) || "N/A"}</div>
        </div>
        ${
          data.specificNeeds
            ? `
        <div class="field">
          <div class="label">Esigenze Specifiche:</div>
          <div class="value">${escapeHtml(data.specificNeeds as string)}</div>
        </div>
        `
            : ""
        }
    `;
  } else if (type === "enterprise") {
    const topics = Array.isArray(data.topics)
      ? data.topics.map((t) => escapeHtml(t)).join(", ")
      : escapeHtml(data.topics as string) || "N/A";
    html += `
        <div class="field">
          <div class="label">Ruolo:</div>
          <div class="value">${escapeHtml(data.role as string) || "N/A"}</div>
        </div>
        <div class="field">
          <div class="label">Azienda:</div>
          <div class="value">${escapeHtml(data.company as string) || "N/A"}</div>
        </div>
        <div class="field">
          <div class="label">Settore:</div>
          <div class="value">${escapeHtml(data.sector as string) || "N/A"}</div>
        </div>
        <div class="field">
          <div class="label">Dipendenti:</div>
          <div class="value">${escapeHtml(data.employeeCount as string) || "N/A"}</div>
        </div>
        <div class="field">
          <div class="label">Temi di interesse:</div>
          <div class="value">${topics}</div>
        </div>
        ${
          data.message
            ? `
        <div class="field">
          <div class="label">Messaggio:</div>
          <div class="value">${escapeHtml(data.message as string)}</div>
        </div>
        `
            : ""
        }
    `;
  }

  html += `
      </div>
      <div class="footer">
        <p>Ricevuto il: ${timestamp}</p>
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Send admin notification email
 */
export async function sendAdminNotification(
  type: string,
  name: string,
  email: string,
  data: Record<string, string | string[] | undefined>,
): Promise<EmailResult> {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    log.warn("ADMIN_EMAIL not configured - skipping notification");
    return { success: false, error: "ADMIN_EMAIL not configured" };
  }

  const typeLabel = getContactTypeLabel(type);
  const subject = `MirrorBuddy - ${typeLabel}: ${name}`;
  const html = formatEmailHtml(type, name, email, data);

  try {
    const result = await sendEmail({
      to: adminEmail,
      subject,
      html,
      replyTo: email,
    });

    if (!result.success) {
      log.error("Failed to send admin notification", {
        error: result.error,
        type,
      });
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error("Exception sending admin notification", { error: message, type });
    return { success: false, error: message };
  }
}
