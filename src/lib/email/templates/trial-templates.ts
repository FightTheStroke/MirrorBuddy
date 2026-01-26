/**
 * Email templates for trial usage nudges and reminders
 * Plan 069 - Conversion Funnel Email Automation
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://mirrorbuddy.app";

export interface TrialUsageNudgeData {
  email: string;
  name: string;
  usagePercent: number;
  chatsUsed: number;
  chatsLimit: number;
  voiceMinutesUsed: number;
  voiceMinutesLimit: number;
  betaRequestUrl?: string;
}

export interface TrialEmailVerificationData {
  email: string;
  verificationCode: string;
  verificationUrl: string;
  expiresAt: Date;
}

export function getTrialEmailVerificationTemplate(
  data: TrialEmailVerificationData,
): {
  subject: string;
  html: string;
  text: string;
  to: string;
} {
  const expiresFormatted = data.expiresAt.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    to: data.email,
    subject: "MirrorBuddy - Verifica la tua email di prova",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MirrorBuddy - Verifica Email</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 24px; text-align: center;">
    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">MirrorBuddy</h1>
    <p style="margin: 8px 0 0; color: #e0e7ff; font-size: 14px;">Verifica email per sbloccare gli strumenti</p>
  </div>

  <div style="background: #ffffff; padding: 32px 24px; margin: 0;">
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
      Verifica la tua email
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      Inserisci questo codice per continuare a usare gli strumenti di MirrorBuddy durante la prova.
    </p>

    <div style="background: #f1f5f9; border-radius: 8px; padding: 24px; text-align: center; margin: 20px 0;">
      <code style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e293b;">
        ${escapeHtml(data.verificationCode)}
      </code>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${escapeHtml(data.verificationUrl)}" style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
        Verifica email
      </a>
    </div>

    <p style="color: #64748b; font-size: 14px; text-align: center;">
      Oppure inserisci il codice su: <a href="${escapeHtml(`${APP_URL}/trial/verify`)}" style="color: #6366f1;">${APP_URL}/trial/verify</a>
    </p>

    <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
      Codice valido fino a: ${expiresFormatted}
    </p>
  </div>

  <div style="background: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
    <p style="margin: 0; color: #64748b; font-size: 12px;">
      © 2026 MirrorBuddy • <a href="${escapeHtml(`${APP_URL}/privacy`)}" style="color: #6366f1; text-decoration: none;">Privacy Policy</a>
    </p>
  </div>
</body>
</html>
    `.trim(),
    text: `
MirrorBuddy - Verifica email

Il tuo codice di verifica: ${data.verificationCode}

Verifica ora: ${data.verificationUrl}

Oppure inserisci il codice su ${APP_URL}/trial/verify

Codice valido fino a: ${expiresFormatted}
    `.trim(),
  };
}

/**
 * 70% trial usage nudge email
 * Sent when user reaches 70% of their trial quota
 */
export function getTrialUsageNudgeTemplate(data: TrialUsageNudgeData): {
  subject: string;
  html: string;
  text: string;
  to: string;
} {
  const betaUrl = data.betaRequestUrl || `${APP_URL}/beta-request`;

  return {
    to: data.email,
    subject: "Hai quasi esaurito la tua prova gratuita di MirrorBuddy! 🎯",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MirrorBuddy - Prova Quasi Esaurita</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc;">
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 24px; text-align: center;">
    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">MirrorBuddy</h1>
    <p style="margin: 8px 0 0; color: #e0e7ff; font-size: 14px;">Il tuo tutor AI personale</p>
  </div>

  <!-- Main Content -->
  <div style="background: #ffffff; padding: 32px 24px; margin: 0;">
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
      Ciao ${escapeHtml(data.name)}!
    </h2>

    <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      Stai usando MirrorBuddy come un vero studente! Hai raggiunto il <strong>${data.usagePercent}% della tua prova gratuita</strong>.
    </p>

    <!-- Usage Stats -->
    <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #6366f1;">
      <p style="margin: 0 0 16px 0; color: #1e293b; font-size: 15px; font-weight: 600;">
        Il tuo utilizzo:
      </p>

      <!-- Chat Progress -->
      <div style="margin: 0 0 14px 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: #64748b; font-size: 14px;">Chat utilizzate</span>
          <span style="color: #1e293b; font-size: 14px; font-weight: 500;">
            ${data.chatsUsed} / ${data.chatsLimit}
          </span>
        </div>
        <div style="background: #e2e8f0; height: 6px; border-radius: 3px; overflow: hidden;">
          <div style="background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%); height: 100%; width: ${Math.min(100, (data.chatsUsed / data.chatsLimit) * 100)}%;">
          </div>
        </div>
      </div>

      <!-- Voice Minutes Progress -->
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: #64748b; font-size: 14px;">Minuti voce</span>
          <span style="color: #1e293b; font-size: 14px; font-weight: 500;">
            ${data.voiceMinutesUsed} / ${data.voiceMinutesLimit} min
          </span>
        </div>
        <div style="background: #e2e8f0; height: 6px; border-radius: 3px; overflow: hidden;">
          <div style="background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%); height: 100%; width: ${Math.min(100, (data.voiceMinutesUsed / data.voiceMinutesLimit) * 100)}%;">
          </div>
        </div>
      </div>
    </div>

    <!-- Call to Action Text -->
    <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      Quando la tua prova finisce, potrai comunque continuare a usare MirrorBuddy <strong>senza limiti</strong>. Richiedi oggi stesso l'accesso alla beta!
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${escapeHtml(betaUrl)}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; border: none; cursor: pointer;">
        Richiedi Accesso Beta
      </a>
    </div>

    <!-- Alternative Text -->
    <p style="margin: 0; color: #64748b; font-size: 13px; text-align: center;">
      O accedi al tuo account e clicca su "Richiedi Beta Access"
    </p>
  </div>

  <!-- Footer -->
  <div style="background: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
    <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
      © 2026 MirrorBuddy. Tutti i diritti riservati.<br>
      <a href="${escapeHtml(`${APP_URL}/privacy`)}" style="color: #6366f1; text-decoration: none;">Privacy Policy</a> •
      <a href="${escapeHtml(`${APP_URL}/terms`)}" style="color: #6366f1; text-decoration: none;">Termini di Servizio</a>
    </p>
  </div>
</body>
</html>
    `.trim(),
    text: `
MirrorBuddy - Prova Quasi Esaurita

Ciao ${data.name}!

Stai usando MirrorBuddy come un vero studente! Hai raggiunto il ${data.usagePercent}% della tua prova gratuita.

IL TUO UTILIZZO:

Chat utilizzate: ${data.chatsUsed} / ${data.chatsLimit}
Minuti voce: ${data.voiceMinutesUsed} / ${data.voiceMinutesLimit}

Quando la tua prova finisce, potrai comunque continuare a usare MirrorBuddy senza limiti. Richiedi oggi stesso l'accesso alla beta!

Richiedi Accesso Beta:
${betaUrl}

O accedi al tuo account e clicca su "Richiedi Beta Access"

---

© 2026 MirrorBuddy
Privacy Policy: ${APP_URL}/privacy
Termini di Servizio: ${APP_URL}/terms
    `.trim(),
  };
}

/**
 * 90% trial usage warning email
 * Sent when user reaches 90% of their trial quota (final warning)
 */
export function getTrialUsageWarningTemplate(data: TrialUsageNudgeData): {
  subject: string;
  html: string;
  text: string;
  to: string;
} {
  const betaUrl = data.betaRequestUrl || `${APP_URL}/beta-request`;

  return {
    to: data.email,
    subject: "Ultima prova gratuita di MirrorBuddy - Agisci ora!",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MirrorBuddy - Ultima Prova</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc;">
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 32px 24px; text-align: center;">
    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">MirrorBuddy</h1>
    <p style="margin: 8px 0 0; color: #fee2e2; font-size: 14px;">Il tuo tutor AI personale</p>
  </div>

  <!-- Main Content -->
  <div style="background: #ffffff; padding: 32px 24px; margin: 0;">
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
      Ciao ${escapeHtml(data.name)},
    </h2>

    <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      La tua prova gratuita sta per terminare! Hai raggiunto il <strong>${data.usagePercent}% della tua quota</strong>.
    </p>

    <!-- Alert Box -->
    <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #dc2626;">
      <p style="margin: 0; color: #7f1d1d; font-size: 15px; font-weight: 600;">
        ⚠ La tua prova scadrà presto!
      </p>
      <p style="margin: 8px 0 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
        Quando finisci la prova, perderai l'accesso. Richiedi subito l'accesso alla beta per continuare a imparare con i tuoi maestri AI preferiti.
      </p>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${escapeHtml(betaUrl)}" style="display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; border: none; cursor: pointer;">
        Richiedi Accesso Beta Adesso
      </a>
    </div>

    <p style="margin: 0; color: #64748b; font-size: 13px; text-align: center;">
      Non perdere l'accesso. Agisci entro le prossime ore!
    </p>
  </div>

  <!-- Footer -->
  <div style="background: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
    <p style="margin: 0; color: #64748b; font-size: 12px;">
      © 2026 MirrorBuddy
    </p>
  </div>
</body>
</html>
    `.trim(),
    text: `
MirrorBuddy - Ultima Prova

Ciao ${data.name},

La tua prova gratuita sta per terminare! Hai raggiunto il ${data.usagePercent}% della tua quota.

ATTENZIONE: La tua prova scadrà presto!

Quando finisci la prova, perderai l'accesso. Richiedi subito l'accesso alla beta per continuare a imparare con i tuoi maestri AI preferiti.

Richiedi Accesso Beta Adesso:
${betaUrl}

Non perdere l'accesso. Agisci entro le prossime ore!

---
© 2026 MirrorBuddy
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
