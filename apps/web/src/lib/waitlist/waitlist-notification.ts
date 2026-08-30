/**
 * Team notification for a waitlist signup.
 *
 * Roberto's requirement for the Pro page: the team must be told when somebody
 * asks to be warned, not only the person asking.
 *
 * The address used to be written here, which meant a new administrator could
 * not be added to the notification without a code change. Recipients are now
 * the administrators recorded in the database, with the configured address
 * always kept in the list.
 */

import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { getAdminRecipients } from '@/lib/admin/admin-recipients';

const log = logger.child({ module: 'waitlist-notification' });

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

export function buildNotificationEmail(signup: SignupNotification, recipients: string[]) {
  const subjectSource = signup.source === 'pro' ? 'MirrorBuddy Pro' : signup.source;
  return {
    to: recipients,
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
    const recipients = await getAdminRecipients();
    if (recipients.length === 0) {
      log.warn('No administrator can be notified of the signup', {
        source: signup.source,
      });
      return;
    }

    const result = await sendEmail(buildNotificationEmail(signup, recipients));
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
