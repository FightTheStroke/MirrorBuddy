/**
 * Password Reset Email Template
 *
 * Generates localized HTML email for password reset requests.
 * Supports all 5 locales: it, en, fr, de, es
 */

type Locale = "it" | "en" | "fr" | "de" | "es";

interface LocaleStrings {
  subject: string;
  greeting: string;
  body: string;
  buttonText: string;
  expiryWarning: string;
  ignoreMessage: string;
  footer: string;
}

const translations: Record<Locale, LocaleStrings> = {
  en: {
    subject: "Reset your password",
    greeting: "Hello,",
    body: "You requested to reset your password. Click the button below to choose a new password:",
    buttonText: "Reset Password",
    expiryWarning: "This link will expire in 1 hour.",
    ignoreMessage:
      "If you didn't request a password reset, you can safely ignore this email.",
    footer: "MirrorBuddy Team",
  },
  it: {
    subject: "Reimposta la tua password",
    greeting: "Ciao,",
    body: "Hai richiesto di reimpostare la tua password. Clicca sul pulsante qui sotto per scegliere una nuova password:",
    buttonText: "Reimposta Password",
    expiryWarning: "Questo link scadrà tra 1 ora.",
    ignoreMessage:
      "Se non hai richiesto il reset della password, puoi ignorare questa email.",
    footer: "Team MirrorBuddy",
  },
  fr: {
    subject: "Réinitialisez votre mot de passe",
    greeting: "Bonjour,",
    body: "Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :",
    buttonText: "Réinitialiser le mot de passe",
    expiryWarning: "Ce lien expirera dans 1 heure.",
    ignoreMessage:
      "Si vous n'avez pas demandé de réinitialisation, vous pouvez ignorer cet e-mail en toute sécurité.",
    footer: "Équipe MirrorBuddy",
  },
  de: {
    subject: "Setzen Sie Ihr Passwort zurück",
    greeting: "Hallo,",
    body: "Sie haben eine Zurücksetzung Ihres Passworts angefordert. Klicken Sie auf die Schaltfläche unten, um ein neues Passwort zu wählen:",
    buttonText: "Passwort zurücksetzen",
    expiryWarning: "Dieser Link läuft in 1 Stunde ab.",
    ignoreMessage:
      "Wenn Sie keine Zurücksetzung angefordert haben, können Sie diese E-Mail ignorieren.",
    footer: "MirrorBuddy Team",
  },
  es: {
    subject: "Restablece tu contraseña",
    greeting: "Hola,",
    body: "Has solicitado restablecer tu contraseña. Haz clic en el botón a continuación para elegir una nueva contraseña:",
    buttonText: "Restablecer contraseña",
    expiryWarning: "Este enlace expirará en 1 hora.",
    ignoreMessage:
      "Si no solicitaste restablecer tu contraseña, puedes ignorar este correo de forma segura.",
    footer: "Equipo MirrorBuddy",
  },
};

/**
 * Generate password reset email with localized content
 *
 * @param resetUrl - Full URL with reset token
 * @param locale - User's preferred locale (it, en, fr, de, es)
 * @returns Object with subject and html content
 */
export function getPasswordResetEmail(
  resetUrl: string,
  locale: string,
): { subject: string; html: string } {
  // Fallback to English if locale not supported
  const validLocale: Locale = (
    ["it", "en", "fr", "de", "es"].includes(locale) ? locale : "en"
  ) as Locale;

  const strings = translations[validLocale];

  const html = `
<!DOCTYPE html>
<html lang="${validLocale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${strings.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">
                ${strings.subject}
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333333;">
                ${strings.greeting}
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #333333;">
                ${strings.body}
              </p>
              <!-- Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                      ${strings.buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Expiry Warning -->
              <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.5; color: #666666; text-align: center;">
                <strong>${strings.expiryWarning}</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.5; color: #666666;">
                ${strings.ignoreMessage}
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #999999;">
                ${strings.footer}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return {
    subject: strings.subject,
    html,
  };
}
