/**
 * Email templates for waitlist signup and verification
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mirrorbuddy.app';

type Locale = 'it' | 'en' | 'fr' | 'de' | 'es';

export interface WaitlistVerificationData {
  email: string;
  name?: string;
  verificationToken: string;
  locale?: string;
}

export interface WaitlistVerifiedData {
  email: string;
  name?: string;
  promoCode?: string;
  unsubscribeToken?: string;
  locale?: string;
}

const verificationSubjects: Record<Locale, string> = {
  it: 'Conferma la tua iscrizione a MirrorBuddy',
  en: 'Confirm your MirrorBuddy waitlist signup',
  fr: "Confirmez votre inscription à la liste d'attente MirrorBuddy",
  de: 'Bestätige deine MirrorBuddy Wartelisten-Anmeldung',
  es: 'Confirma tu registro en la lista de espera de MirrorBuddy',
};

const verifiedSubjects: Record<Locale, string> = {
  it: 'Benvenuto nella waitlist di MirrorBuddy!',
  en: 'Welcome to the MirrorBuddy waitlist!',
  fr: "Bienvenue sur la liste d'attente MirrorBuddy!",
  de: 'Willkommen auf der MirrorBuddy-Warteliste!',
  es: '¡Bienvenido a la lista de espera de MirrorBuddy!',
};

type VerifText = { heading: string; body: string; cta: string; unsub: string };
const verificationText: Record<Locale, VerifText> = {
  it: {
    heading: 'Conferma la tua email',
    body: 'Clicca il link per confermare la tua iscrizione alla waitlist di MirrorBuddy.',
    cta: 'Conferma iscrizione',
    unsub: 'Annulla iscrizione',
  },
  en: {
    heading: 'Confirm your email',
    body: 'Click the link to confirm your MirrorBuddy waitlist signup.',
    cta: 'Confirm signup',
    unsub: 'Unsubscribe',
  },
  fr: {
    heading: 'Confirmez votre email',
    body: "Cliquez sur le lien pour confirmer votre inscription à la liste d'attente MirrorBuddy.",
    cta: "Confirmer l'inscription",
    unsub: 'Se désabonner',
  },
  de: {
    heading: 'E-Mail bestätigen',
    body: 'Klicke auf den Link, um deine MirrorBuddy Wartelisten-Anmeldung zu bestätigen.',
    cta: 'Anmeldung bestätigen',
    unsub: 'Abmelden',
  },
  es: {
    heading: 'Confirma tu email',
    body: 'Haz clic en el enlace para confirmar tu registro en la lista de espera de MirrorBuddy.',
    cta: 'Confirmar registro',
    unsub: 'Cancelar suscripción',
  },
};

type VerifiedText = {
  heading: string;
  body: string;
  promoLabel: string;
  instructions: string;
  unsub: string;
};
const verifiedText: Record<Locale, VerifiedText> = {
  it: {
    heading: 'Sei in lista!',
    body: 'La tua iscrizione è stata confermata. Ti avviseremo quando MirrorBuddy sarà disponibile.',
    promoLabel: 'Il tuo codice promozionale esclusivo:',
    instructions:
      'Usa questo codice al lancio per uno sconto speciale. Ti avviseremo non appena la piattaforma sarà accessibile.',
    unsub: 'Annulla iscrizione',
  },
  en: {
    heading: "You're on the list!",
    body: "Your signup has been confirmed. We'll notify you when MirrorBuddy launches.",
    promoLabel: 'Your exclusive promo code:',
    instructions:
      "Use this code at launch to get a special discount. We'll email you when the platform is available.",
    unsub: 'Unsubscribe',
  },
  fr: {
    heading: 'Vous êtes sur la liste!',
    body: 'Votre inscription est confirmée. Nous vous informerons lors du lancement de MirrorBuddy.',
    promoLabel: 'Votre code promo exclusif:',
    instructions:
      'Utilisez ce code au lancement pour une remise spéciale. Nous vous contacterons dès que la plateforme sera disponible.',
    unsub: 'Se désabonner',
  },
  de: {
    heading: 'Du bist auf der Liste!',
    body: 'Deine Anmeldung wurde bestätigt. Wir benachrichtigen dich, wenn MirrorBuddy startet.',
    promoLabel: 'Dein exklusiver Promo-Code:',
    instructions:
      'Nutze diesen Code beim Launch für einen Sonderrabatt. Wir schicken dir eine E-Mail, sobald die Plattform verfügbar ist.',
    unsub: 'Abmelden',
  },
  es: {
    heading: '¡Estás en la lista!',
    body: 'Tu registro ha sido confirmado. Te avisaremos cuando MirrorBuddy se lance.',
    promoLabel: 'Tu código promocional exclusivo:',
    instructions:
      'Usa este código en el lanzamiento para un descuento especial. Te enviaremos un email en cuanto la plataforma esté disponible.',
    unsub: 'Cancelar suscripción',
  },
};

function normalizeLocale(locale?: string): Locale {
  const supported: Locale[] = ['it', 'en', 'fr', 'de', 'es'];
  const lang = (locale || 'it').split('-')[0] as Locale;
  return supported.includes(lang) ? lang : 'it';
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (c) => map[c] || c);
}

function footer(unsubUrl: string, unsubLabel: string): string {
  const privUrl = escapeHtml(`${APP_URL}/privacy`);
  return `<div style="background:#f1f5f9;padding:20px;text-align:center;border-top:1px solid #e2e8f0;"><p style="margin:0;color:#94a3b8;font-size:12px;">© 2026 MirrorBuddy • <a href="${unsubUrl}" style="color:#6366f1;text-decoration:none;">${unsubLabel}</a> • <a href="${privUrl}" style="color:#6366f1;text-decoration:none;">Privacy Policy</a></p></div>`;
}

/** Waitlist email verification template (used by waitlist-service) */
export function getVerificationTemplate(data: WaitlistVerificationData): {
  subject: string;
  html: string;
  text: string;
  to: string;
} {
  const locale = normalizeLocale(data.locale);
  const t = verificationText[locale];
  const verifyUrl = `${APP_URL}/api/waitlist/verify?token=${escapeHtml(data.verificationToken)}`;
  const rawVerifyUrl = `${APP_URL}/api/waitlist/verify?token=${data.verificationToken}`;
  const unsubUrl = `${APP_URL}/api/waitlist/unsubscribe`;

  return {
    to: data.email,
    subject: verificationSubjects[locale],
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${t.heading}</title></head><body style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:0;background-color:#f8fafc;"><div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:32px 24px;text-align:center;"><h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">MirrorBuddy</h1></div><div style="background:#fff;padding:32px 24px;"><h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">${t.heading}</h2><p style="color:#475569;font-size:15px;line-height:1.6;">${t.body}</p><div style="text-align:center;margin:32px 0;"><a href="${verifyUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">${t.cta}</a></div><p style="color:#64748b;font-size:13px;word-break:break-all;">${verifyUrl}</p></div>${footer(unsubUrl, t.unsub)}</body></html>`.trim(),
    text: `${t.heading}\n\n${t.body}\n\n${t.cta}: ${rawVerifyUrl}\n\n---\n${t.unsub}: ${unsubUrl}\n© 2026 MirrorBuddy | ${APP_URL}/privacy`.trim(),
  };
}

/** Waitlist confirmed template with promo code (used by waitlist-service) */
export function getVerifiedTemplate(data: WaitlistVerifiedData): {
  subject: string;
  html: string;
  text: string;
  to: string;
} {
  const locale = normalizeLocale(data.locale);
  const t = verifiedText[locale];
  const unsubUrl = data.unsubscribeToken
    ? `${APP_URL}/api/waitlist/unsubscribe?token=${escapeHtml(data.unsubscribeToken)}`
    : `${APP_URL}/api/waitlist/unsubscribe`;
  const rawUnsubUrl = data.unsubscribeToken
    ? `${APP_URL}/api/waitlist/unsubscribe?token=${data.unsubscribeToken}`
    : `${APP_URL}/api/waitlist/unsubscribe`;
  const promoBlock = data.promoCode
    ? `<div style="background:#fef3c7;border-radius:8px;padding:20px;margin:24px 0;text-align:center;"><p style="margin:0 0 12px;color:#92400e;font-size:14px;font-weight:600;">${t.promoLabel}</p><code style="font-size:24px;font-weight:bold;letter-spacing:4px;color:#1e293b;">${escapeHtml(data.promoCode)}</code></div>`
    : '';
  const promoText = data.promoCode ? `\n\n${t.promoLabel} ${data.promoCode}` : '';

  return {
    to: data.email,
    subject: verifiedSubjects[locale],
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${t.heading}</title></head><body style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:0;background-color:#f8fafc;"><div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:32px 24px;text-align:center;"><h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">MirrorBuddy</h1></div><div style="background:#fff;padding:32px 24px;"><h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">${t.heading}</h2><p style="color:#475569;font-size:15px;line-height:1.6;">${t.body}</p>${promoBlock}<p style="color:#475569;font-size:14px;line-height:1.6;">${t.instructions}</p></div>${footer(unsubUrl, t.unsub)}</body></html>`.trim(),
    text: `${t.heading}\n\n${t.body}${promoText}\n\n${t.instructions}\n\n---\n${t.unsub}: ${rawUnsubUrl}\n© 2026 MirrorBuddy | ${APP_URL}/privacy`.trim(),
  };
}

// Aliases for backward compatibility with direct imports
export const getWaitlistVerificationTemplate = getVerificationTemplate;
export const getWaitlistVerifiedTemplate = getVerifiedTemplate;
