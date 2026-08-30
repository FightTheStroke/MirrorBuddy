/**
 * Team notification for a waitlist signup.
 *
 * Roberto's requirement for the Pro page: the team must be told when somebody
 * asks to be warned, not only the person asking. The address is fixed on
 * purpose — it is the association's public inbox, not an operator's account,
 * so it cannot drift with an environment variable nobody sets.
 */

import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'waitlist-notification' });

export const WAITLIST_NOTIFICATION_ADDRESS = 'info@fightthestroke.org';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface SignupNotification {
  email: string;
  name?: string | null;
  locale: string;
  source: string;
}

export function buildNotificationEmail(signup: SignupNotification) {
  const subjectSource = signup.source === 'pro' ? 'MirrorBuddy Pro' : signup.source;
  return {
    to: WAITLIST_NOTIFICATION_ADDRESS,
    subject: `Waitlist — ${subjectSource}: ${signup.email}`,
    replyTo: signup.email,
    html: [
      '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;line-height:1.6">',
      `<h2>New waitlist signup — ${escapeHtml(subjectSource)}</h2>`,
      `<p><strong>Email:</strong> ${escapeHtml(signup.email)}</p>`,
      `<p><strong>Name:</strong> ${escapeHtml(signup.name ?? '—')}</p>`,
      `<p><strong>Language:</strong> ${escapeHtml(signup.locale)}</p>`,
      `<p><strong>Source:</strong> ${escapeHtml(signup.source)}</p>`,
      '<p style="color:#666;font-size:12px">The address is not confirmed yet: the',
      ' person still has to click the verification link.</p>',
      '</body></html>',
    ].join(''),
  };
}

/**
 * Never throws: a signup must be recorded even when the mail service is down.
 */
export async function notifyTeamOfSignup(signup: SignupNotification): Promise<void> {
  try {
    const result = await sendEmail(buildNotificationEmail(signup));
    if (!result.success) {
      log.warn('Waitlist team notification failed to send', {
        source: signup.source,
        error: result.error,
      });
    }
  } catch (err) {
    log.error('Error sending waitlist team notification', {
      source: signup.source,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
