/**
 * Email templates for the beta invite system
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://mirrorbuddy.app";

export interface InviteRequestData {
  name: string;
  email: string;
  motivation: string;
  trialSessionId?: string;
  requestId: string;
  trialStats?: {
    chatsUsed: number;
    voiceMinutesUsed: number;
    toolsUsed: number;
  };
}

export interface InviteApprovalData {
  name: string;
  email: string;
  username: string;
  temporaryPassword: string;
  loginUrl: string;
}

export interface InviteRejectionData {
  name: string;
  email: string;
  reason?: string;
}

/**
 * Admin notification for new beta request
 */
export function getAdminNotificationTemplate(data: InviteRequestData): {
  subject: string;
  html: string;
  text: string;
  to: string;
} {
  if (!ADMIN_EMAIL) {
    throw new Error("ADMIN_EMAIL environment variable is required");
  }

  const adminUrl = `${APP_URL}/admin/invites`;

  const trialUsageHtml = data.trialStats
    ? `
  <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0 0 12px 0;"><strong>Utilizzo Trial:</strong></p>
    <ul style="margin: 0; padding-left: 20px;">
      <li>Chat: ${data.trialStats.chatsUsed}/10</li>
      <li>Voce: ${data.trialStats.voiceMinutesUsed}/5 min</li>
      <li>Tool: ${data.trialStats.toolsUsed}/10</li>
    </ul>
  </div>
  `
    : "";

  const trialUsageText = data.trialStats
    ? `
Trial Usage:
- Chat: ${data.trialStats.chatsUsed}/10
- Voce: ${data.trialStats.voiceMinutesUsed}/5 min
- Tool: ${data.trialStats.toolsUsed}/10
`
    : "";

  return {
    to: ADMIN_EMAIL,
    subject: `[MirrorBuddy] Nuova richiesta beta da ${data.name}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Nuova richiesta beta</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1e293b;">Nuova richiesta beta</h1>

  <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0 0 8px 0;"><strong>Nome:</strong> ${escapeHtml(data.name)}</p>
    <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${escapeHtml(data.email)}</p>
    ${data.trialSessionId ? `<p style="margin: 0 0 8px 0;"><strong>Trial Session:</strong> ${escapeHtml(data.trialSessionId)}</p>` : ""}
  </div>

  ${trialUsageHtml}

  <div style="margin: 20px 0;">
    <p style="margin: 0 0 8px 0;"><strong>Motivazione:</strong></p>
    <p style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; white-space: pre-wrap;">${escapeHtml(data.motivation)}</p>
  </div>

  <div style="margin-top: 24px;">
    <a href="${adminUrl}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
      Gestisci richiesta
    </a>
  </div>

  <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
    ID Richiesta: ${data.requestId}
  </p>
</body>
</html>
    `.trim(),
    text: `
Nuova richiesta beta per MirrorBuddy

Nome: ${data.name}
Email: ${data.email}
${data.trialSessionId ? `Trial Session: ${data.trialSessionId}` : ""}
${trialUsageText}
Motivazione:
${data.motivation}

Gestisci richiesta: ${adminUrl}

ID Richiesta: ${data.requestId}
    `.trim(),
  };
}

/**
 * User notification: request received
 */
export function getRequestReceivedTemplate(data: {
  name: string;
  email: string;
}): {
  subject: string;
  html: string;
  text: string;
  to: string;
} {
  return {
    to: data.email,
    subject: "MirrorBuddy - Richiesta ricevuta",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Richiesta ricevuta</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1e293b;">Ciao ${escapeHtml(data.name)}!</h1>

  <p>Abbiamo ricevuto la tua richiesta di accesso alla beta di MirrorBuddy.</p>

  <p>Il nostro team la esaminerà e ti contatterà presto con ulteriori informazioni.</p>

  <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; color: #92400e;">
      <strong>Nota:</strong> Durante la beta, l'accesso è limitato. Ti ringraziamo per la pazienza!
    </p>
  </div>

  <p>A presto,<br>Il team MirrorBuddy</p>
</body>
</html>
    `.trim(),
    text: `
Ciao ${data.name}!

Abbiamo ricevuto la tua richiesta di accesso alla beta di MirrorBuddy.

Il nostro team la esaminerà e ti contatterà presto con ulteriori informazioni.

Nota: Durante la beta, l'accesso è limitato. Ti ringraziamo per la pazienza!

A presto,
Il team MirrorBuddy
    `.trim(),
  };
}

/**
 * User notification: approved with credentials
 */
export function getApprovalTemplate(data: InviteApprovalData): {
  subject: string;
  html: string;
  text: string;
  to: string;
} {
  return {
    to: data.email,
    subject: "MirrorBuddy - Benvenuto nella Beta!",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Benvenuto nella Beta</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1e293b;">Benvenuto nella Beta, ${escapeHtml(data.name)}!</h1>

  <p>La tua richiesta è stata approvata! Ecco le tue credenziali di accesso:</p>

  <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0 0 8px 0;"><strong>Username:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${escapeHtml(data.username)}</code></p>
    <p style="margin: 0;"><strong>Password temporanea:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${escapeHtml(data.temporaryPassword)}</code></p>
  </div>

  <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; color: #92400e;">
      <strong>Importante:</strong> Al primo accesso ti verrà chiesto di cambiare la password.
    </p>
  </div>

  <div style="margin-top: 24px;">
    <a href="${escapeHtml(data.loginUrl)}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
      Accedi a MirrorBuddy
    </a>
  </div>

  <p style="margin-top: 24px;">Buono studio!<br>Il team MirrorBuddy</p>
</body>
</html>
    `.trim(),
    text: `
Benvenuto nella Beta, ${data.name}!

La tua richiesta è stata approvata! Ecco le tue credenziali di accesso:

Username: ${data.username}
Password temporanea: ${data.temporaryPassword}

IMPORTANTE: Al primo accesso ti verrà chiesto di cambiare la password.

Accedi qui: ${data.loginUrl}

Buono studio!
Il team MirrorBuddy
    `.trim(),
  };
}

/**
 * User notification: rejected
 */
export function getRejectionTemplate(data: InviteRejectionData): {
  subject: string;
  html: string;
  text: string;
  to: string;
} {
  const reasonBlock = data.reason
    ? `<p style="background: #f1f5f9; border-radius: 8px; padding: 12px; margin: 20px 0;">${escapeHtml(data.reason)}</p>`
    : "";

  const reasonText = data.reason ? `\nMotivo: ${data.reason}\n` : "";

  return {
    to: data.email,
    subject: "MirrorBuddy - Aggiornamento sulla tua richiesta",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Aggiornamento richiesta</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1e293b;">Ciao ${escapeHtml(data.name)},</h1>

  <p>Grazie per il tuo interesse in MirrorBuddy.</p>

  <p>Purtroppo al momento non possiamo accogliere la tua richiesta di accesso alla beta.</p>

  ${reasonBlock}

  <p>Ti invitiamo a riprovare in futuro, quando avremo maggiore disponibilità.</p>

  <p>Grazie per la comprensione,<br>Il team MirrorBuddy</p>
</body>
</html>
    `.trim(),
    text: `
Ciao ${data.name},

Grazie per il tuo interesse in MirrorBuddy.

Purtroppo al momento non possiamo accogliere la tua richiesta di accesso alla beta.
${reasonText}
Ti invitiamo a riprovare in futuro, quando avremo maggiore disponibilità.

Grazie per la comprensione,
Il team MirrorBuddy
    `.trim(),
  };
}

/**
 * Escape HTML to prevent XSS in email templates
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}
