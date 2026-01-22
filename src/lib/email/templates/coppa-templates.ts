/**
 * Email templates for COPPA parental consent verification
 *
 * COPPA requires verifiable parental consent for children under 13.
 * These templates support the consent verification flow.
 */

if (!process.env.SUPPORT_EMAIL) {
  throw new Error("SUPPORT_EMAIL environment variable is required");
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://mirrorbuddy.app";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL;

export interface ParentalConsentRequestData {
  childName: string;
  childAge: number;
  parentEmail: string;
  verificationCode: string;
  verificationUrl: string;
  expiresAt: Date;
}

export interface ParentalConsentConfirmationData {
  childName: string;
  parentEmail: string;
}

/**
 * Parental consent request email
 * Sent to parent's email with verification code
 */
export function getParentalConsentRequestTemplate(
  data: ParentalConsentRequestData,
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
    to: data.parentEmail,
    subject: "MirrorBuddy - Richiesta Consenso Genitoriale (COPPA)",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Richiesta Consenso Genitoriale</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #1e293b; margin-top: 0;">Richiesta di Consenso Genitoriale</h1>

    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Gentile genitore/tutore,
    </p>

    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Un account MirrorBuddy è stato creato per <strong>${escapeHtml(data.childName)}</strong>
      (${data.childAge} anni). In conformità con la legge COPPA sulla protezione della privacy
      dei minori online, abbiamo bisogno del tuo consenso per procedere.
    </p>

    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h2 style="color: #1e40af; margin: 0 0 12px 0; font-size: 16px;">Cosa raccogliamo:</h2>
      <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
        <li>Nome e età dello studente</li>
        <li>Progressi di apprendimento e interazioni con i tutor AI</li>
        <li>Contenuti creati (mappe mentali, flashcard, quiz)</li>
      </ul>
    </div>

    <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="color: #92400e; margin: 0; font-size: 14px;">
        <strong>I dati non verranno mai venduti o condivisi con terze parti per scopi pubblicitari.</strong>
        Vengono utilizzati esclusivamente per fornire e migliorare l'esperienza educativa.
      </p>
    </div>

    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      <strong>Il tuo codice di verifica:</strong>
    </p>

    <div style="background: #f1f5f9; border-radius: 8px; padding: 24px; text-align: center; margin: 20px 0;">
      <code style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e293b;">
        ${escapeHtml(data.verificationCode)}
      </code>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${escapeHtml(data.verificationUrl)}"
         style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Approva il Consenso
      </a>
    </div>

    <p style="color: #64748b; font-size: 14px; text-align: center;">
      Oppure inserisci il codice su: <a href="${APP_URL}/coppa/verify" style="color: #3b82f6;">${APP_URL}/coppa/verify</a>
    </p>

    <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 24px;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        <strong>Scadenza:</strong> ${expiresFormatted}<br>
        <strong>Diritti:</strong> Puoi revocare il consenso in qualsiasi momento contattandoci.<br>
        <strong>Contatti:</strong> <a href="mailto:${SUPPORT_EMAIL}" style="color: #3b82f6;">${SUPPORT_EMAIL}</a>
      </p>
    </div>
  </div>

  <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
    Se non hai richiesto questo account, puoi ignorare questa email in sicurezza.
  </p>
</body>
</html>
    `.trim(),
    text: `
Richiesta di Consenso Genitoriale - MirrorBuddy

Gentile genitore/tutore,

Un account MirrorBuddy è stato creato per ${data.childName} (${data.childAge} anni).
In conformità con la legge COPPA sulla protezione della privacy dei minori online,
abbiamo bisogno del tuo consenso per procedere.

COSA RACCOGLIAMO:
- Nome e età dello studente
- Progressi di apprendimento e interazioni con i tutor AI
- Contenuti creati (mappe mentali, flashcard, quiz)

I dati non verranno mai venduti o condivisi con terze parti per scopi pubblicitari.

IL TUO CODICE DI VERIFICA: ${data.verificationCode}

Approva il consenso: ${data.verificationUrl}
Oppure inserisci il codice su: ${APP_URL}/coppa/verify

Scadenza: ${expiresFormatted}

Diritti: Puoi revocare il consenso in qualsiasi momento.
Contatti: ${SUPPORT_EMAIL}

Se non hai richiesto questo account, puoi ignorare questa email.
    `.trim(),
  };
}

/**
 * Parental consent confirmation email
 * Sent after parent approves
 */
export function getParentalConsentConfirmationTemplate(
  data: ParentalConsentConfirmationData,
): {
  subject: string;
  html: string;
  text: string;
  to: string;
} {
  return {
    to: data.parentEmail,
    subject: "MirrorBuddy - Consenso Confermato",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Consenso Confermato</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 48px;">✅</span>
    </div>

    <h1 style="color: #1e293b; margin-top: 0; text-align: center;">Consenso Confermato</h1>

    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Grazie! Hai approvato l'account MirrorBuddy per <strong>${escapeHtml(data.childName)}</strong>.
    </p>

    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      ${escapeHtml(data.childName)} può ora accedere a tutte le funzionalità educative di MirrorBuddy.
    </p>

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h2 style="color: #166534; margin: 0 0 12px 0; font-size: 16px;">I tuoi diritti:</h2>
      <ul style="color: #166534; margin: 0; padding-left: 20px;">
        <li>Rivedere i dati raccolti in qualsiasi momento</li>
        <li>Richiedere la cancellazione dei dati</li>
        <li>Revocare il consenso</li>
      </ul>
      <p style="color: #166534; margin: 12px 0 0 0; font-size: 14px;">
        Per qualsiasi richiesta: <a href="mailto:${SUPPORT_EMAIL}" style="color: #166534;">${SUPPORT_EMAIL}</a>
      </p>
    </div>

    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Buono studio!<br>
      Il team MirrorBuddy
    </p>
  </div>
</body>
</html>
    `.trim(),
    text: `
Consenso Confermato - MirrorBuddy

Grazie! Hai approvato l'account MirrorBuddy per ${data.childName}.

${data.childName} può ora accedere a tutte le funzionalità educative di MirrorBuddy.

I TUOI DIRITTI:
- Rivedere i dati raccolti in qualsiasi momento
- Richiedere la cancellazione dei dati
- Revocare il consenso

Per qualsiasi richiesta: ${SUPPORT_EMAIL}

Buono studio!
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
