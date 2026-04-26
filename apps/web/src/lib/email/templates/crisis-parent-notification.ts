/**
 * Crisis Parent Notification Email Template
 *
 * Privacy-safe: NEVER includes raw message content.
 * Sends multilingual notifications to parents/guardians when crisis is detected.
 *
 * Includes:
 * - Severity banner
 * - Timestamp
 * - Generic description
 * - Helpline numbers (IT: Telefono Azzurro 19696, Telefono Amico 02 2327 2327)
 * - Recommended actions
 * - Link to parent dashboard
 */

interface CrisisEmailParams {
  locale: string;
  severity: string;
  timestamp: Date;
  maestroName?: string;
  parentDashboardUrl: string;
}

const STRINGS: Record<string, Record<string, string>> = {
  it: {
    subject: 'MirrorBuddy - Avviso di Sicurezza Importante',
    heading: 'Avviso di Sicurezza',
    severityLabel: 'Livello:',
    timeLabel: 'Quando:',
    description:
      'Il sistema di sicurezza di MirrorBuddy ha rilevato un messaggio che potrebbe indicare disagio emotivo o una situazione di crisi.',
    privacyNote:
      'Per motivi di privacy, non includiamo il contenuto del messaggio in questa email.',
    helplineTitle: 'Numeri di Supporto Immediato',
    helpline1: 'Telefono Azzurro: 19696 (24/7)',
    helpline2: 'Telefono Amico: 02 2327 2327 (disponibile tutti i giorni)',
    actionsTitle: 'Azioni Consigliate',
    action1: 'Parla con tuo figlio in un ambiente calmo e di supporto',
    action2: 'Contatta il consulente scolastico o un professionista di fiducia',
    action3: 'Utilizza i numeri di assistenza forniti sopra se necessario',
    action4: 'Monitora il benessere e mantieni una comunicazione aperta',
    dashboardLinkText: 'Vai al Dashboard Genitori',
    dashboardNote:
      'Nel dashboard puoi vedere i progressi di apprendimento e configurare le impostazioni di sicurezza.',
    footer:
      'Questo messaggio è stato inviato automaticamente dal sistema di sicurezza di MirrorBuddy. Non rispondere a questa email.',
    footerSupport: 'Per assistenza: support@mirrorbuddy.it',
    critical: 'Critico',
    high: 'Alto',
    medium: 'Medio',
  },
  en: {
    subject: 'MirrorBuddy - Important Safety Alert',
    heading: 'Safety Alert',
    severityLabel: 'Severity:',
    timeLabel: 'When:',
    description:
      "MirrorBuddy's safety system detected a message that may indicate emotional distress or a crisis situation.",
    privacyNote: 'For privacy reasons, we do not include the message content in this email.',
    helplineTitle: 'Immediate Support Numbers',
    helpline1: 'Childhelp National Child Abuse Hotline: 1-800-4-A-CHILD (1-800-422-4453)',
    helpline2: 'Crisis Text Line: Text HOME to 741741',
    actionsTitle: 'Recommended Actions',
    action1: 'Talk to your child in a calm and supportive environment',
    action2: 'Contact a school counselor or trusted professional',
    action3: 'Use the support numbers provided above if needed',
    action4: 'Monitor well-being and maintain open communication',
    dashboardLinkText: 'Go to Parent Dashboard',
    dashboardNote: 'In the dashboard you can view learning progress and configure safety settings.',
    footer:
      "This message was sent automatically by MirrorBuddy's safety system. Do not reply to this email.",
    footerSupport: 'For support: support@mirrorbuddy.it',
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
  },
  fr: {
    subject: 'MirrorBuddy - Alerte de Sécurité Importante',
    heading: 'Alerte de Sécurité',
    severityLabel: 'Niveau:',
    timeLabel: 'Quand:',
    description:
      'Le système de sécurité de MirrorBuddy a détecté un message qui pourrait indiquer une détresse émotionnelle ou une situation de crise.',
    privacyNote:
      "Pour des raisons de confidentialité, nous n'incluons pas le contenu du message dans cet email.",
    helplineTitle: 'Numéros de Soutien Immédiat',
    helpline1: 'Allo Enfance en Danger: 119 (24/7)',
    helpline2: 'Fil Santé Jeunes: 0 800 235 236',
    actionsTitle: 'Actions Recommandées',
    action1: 'Parlez à votre enfant dans un environnement calme et bienveillant',
    action2: 'Contactez un conseiller scolaire ou un professionnel de confiance',
    action3: "Utilisez les numéros d'assistance fournis ci-dessus si nécessaire",
    action4: 'Surveillez le bien-être et maintenez une communication ouverte',
    dashboardLinkText: 'Accéder au Tableau de Bord Parent',
    dashboardNote:
      "Dans le tableau de bord, vous pouvez voir les progrès d'apprentissage et configurer les paramètres de sécurité.",
    footer:
      'Ce message a été envoyé automatiquement par le système de sécurité de MirrorBuddy. Ne répondez pas à cet email.',
    footerSupport: 'Pour assistance: support@mirrorbuddy.it',
    critical: 'Critique',
    high: 'Élevé',
    medium: 'Moyen',
  },
  de: {
    subject: 'MirrorBuddy - Wichtige Sicherheitswarnung',
    heading: 'Sicherheitswarnung',
    severityLabel: 'Schweregrad:',
    timeLabel: 'Wann:',
    description:
      'Das Sicherheitssystem von MirrorBuddy hat eine Nachricht erkannt, die auf emotionalen Stress oder eine Krisensituation hinweisen könnte.',
    privacyNote:
      'Aus Datenschutzgründen fügen wir den Nachrichteninhalt nicht in diese E-Mail ein.',
    helplineTitle: 'Sofortige Unterstützungsnummern',
    helpline1: 'Nummer gegen Kummer: 116 111',
    helpline2: 'Telefonseelsorge: 0800 111 0 111',
    actionsTitle: 'Empfohlene Maßnahmen',
    action1: 'Sprechen Sie mit Ihrem Kind in einer ruhigen und unterstützenden Umgebung',
    action2: 'Kontaktieren Sie einen Schulberater oder vertrauenswürdigen Fachmann',
    action3: 'Nutzen Sie die oben angegebenen Unterstützungsnummern bei Bedarf',
    action4: 'Überwachen Sie das Wohlbefinden und pflegen Sie eine offene Kommunikation',
    dashboardLinkText: 'Zum Eltern-Dashboard',
    dashboardNote:
      'Im Dashboard können Sie den Lernfortschritt sehen und Sicherheitseinstellungen konfigurieren.',
    footer:
      'Diese Nachricht wurde automatisch vom Sicherheitssystem von MirrorBuddy gesendet. Antworten Sie nicht auf diese E-Mail.',
    footerSupport: 'Für Unterstützung: support@mirrorbuddy.it',
    critical: 'Kritisch',
    high: 'Hoch',
    medium: 'Mittel',
  },
  es: {
    subject: 'MirrorBuddy - Alerta de Seguridad Importante',
    heading: 'Alerta de Seguridad',
    severityLabel: 'Nivel:',
    timeLabel: 'Cuándo:',
    description:
      'El sistema de seguridad de MirrorBuddy detectó un mensaje que podría indicar angustia emocional o una situación de crisis.',
    privacyNote: 'Por razones de privacidad, no incluimos el contenido del mensaje en este correo.',
    helplineTitle: 'Números de Apoyo Inmediato',
    helpline1: 'ANAR: 900 20 20 10',
    helpline2: 'Teléfono de la Esperanza: 717 003 717',
    actionsTitle: 'Acciones Recomendadas',
    action1: 'Hable con su hijo en un ambiente tranquilo y de apoyo',
    action2: 'Contacte al consejero escolar o un profesional de confianza',
    action3: 'Use los números de asistencia proporcionados arriba si es necesario',
    action4: 'Monitoree el bienestar y mantenga una comunicación abierta',
    dashboardLinkText: 'Ir al Panel de Padres',
    dashboardNote:
      'En el panel puede ver el progreso de aprendizaje y configurar ajustes de seguridad.',
    footer:
      'Este mensaje fue enviado automáticamente por el sistema de seguridad de MirrorBuddy. No responda a este correo.',
    footerSupport: 'Para asistencia: support@mirrorbuddy.it',
    critical: 'Crítico',
    high: 'Alto',
    medium: 'Medio',
  },
};

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Get severity color based on severity level
 */
function getSeverityColor(severity: string): string {
  const normalized = severity.toLowerCase();
  if (normalized === 'critical') return '#dc2626';
  if (normalized === 'high') return '#ea580c';
  return '#f59e0b';
}

/**
 * Get localized severity label
 */
function getSeverityLabel(severity: string, locale: string): string {
  const strings = STRINGS[locale] || STRINGS.it;
  const normalized = severity.toLowerCase();
  if (normalized === 'critical') return strings.critical;
  if (normalized === 'high') return strings.high;
  return strings.medium;
}

/**
 * Build crisis parent notification email
 */
export function buildCrisisParentEmail(params: CrisisEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const locale = params.locale || 'it';
  const strings = STRINGS[locale] || STRINGS.it;
  const severityColor = getSeverityColor(params.severity);
  const severityLabel = getSeverityLabel(params.severity, locale);

  const formattedTime = params.timestamp.toLocaleString(
    locale === 'it' ? 'it-IT' : `${locale}-${locale.toUpperCase()}`,
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  );

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(strings.heading)}</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

    <!-- Severity Banner -->
    <div style="background: ${severityColor}; color: white; padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; font-weight: bold;">${escapeHtml(strings.heading)}</h1>
    </div>

    <!-- Description -->
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      ${escapeHtml(strings.description)}
    </p>

    <!-- Metadata Box -->
    <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; color: #334155; font-size: 14px;">
        <strong>${escapeHtml(strings.severityLabel)}</strong> ${escapeHtml(severityLabel)}
      </p>
      <p style="margin: 0; color: #334155; font-size: 14px;">
        <strong>${escapeHtml(strings.timeLabel)}</strong> ${escapeHtml(formattedTime)}
      </p>
    </div>

    <!-- Privacy Note -->
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #1e40af; font-size: 14px;">
        <strong>🔒</strong> ${escapeHtml(strings.privacyNote)}
      </p>
    </div>

    <!-- Helpline Numbers -->
    <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h2 style="color: #92400e; margin: 0 0 12px 0; font-size: 18px;">${escapeHtml(strings.helplineTitle)}</h2>
      <p style="color: #92400e; margin: 8px 0; font-size: 16px; font-weight: 600;">
        📞 ${escapeHtml(strings.helpline1)}
      </p>
      <p style="color: #92400e; margin: 8px 0; font-size: 16px; font-weight: 600;">
        📞 ${escapeHtml(strings.helpline2)}
      </p>
    </div>

    <!-- Recommended Actions -->
    <div style="margin: 24px 0;">
      <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 18px;">${escapeHtml(strings.actionsTitle)}</h2>
      <ul style="color: #475569; line-height: 1.8; padding-left: 24px;">
        <li>${escapeHtml(strings.action1)}</li>
        <li>${escapeHtml(strings.action2)}</li>
        <li>${escapeHtml(strings.action3)}</li>
        <li>${escapeHtml(strings.action4)}</li>
      </ul>
    </div>

    <!-- Dashboard Link -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${escapeHtml(params.parentDashboardUrl)}"
         style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        ${escapeHtml(strings.dashboardLinkText)}
      </a>
      <p style="color: #64748b; font-size: 14px; margin-top: 12px;">
        ${escapeHtml(strings.dashboardNote)}
      </p>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 20px;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px 0;">
        ${escapeHtml(strings.footer)}
      </p>
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        ${escapeHtml(strings.footerSupport)}
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
${strings.heading}

${strings.description}

${strings.severityLabel} ${severityLabel}
${strings.timeLabel} ${formattedTime}

${strings.privacyNote}

${strings.helplineTitle}
- ${strings.helpline1}
- ${strings.helpline2}

${strings.actionsTitle}
1. ${strings.action1}
2. ${strings.action2}
3. ${strings.action3}
4. ${strings.action4}

${strings.dashboardLinkText}: ${params.parentDashboardUrl}

${strings.dashboardNote}

---
${strings.footer}
${strings.footerSupport}
  `.trim();

  return {
    subject: strings.subject,
    html,
    text,
  };
}
