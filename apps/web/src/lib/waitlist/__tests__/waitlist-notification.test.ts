/**
 * The team has to hear about a Pro signup.
 *
 * Roberto's requirement is not "store the address somewhere" — it is that the
 * people who can act on a Pro signup receive a message. That used to be a
 * single address written into the source, so promoting a second administrator
 * did not make them reachable; recipients now come from the administrators
 * recorded in the database.
 *
 * These tests hold that promise, and the other half of it too: a mail service
 * having a bad day must never cost somebody their place on the list.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

const getAdminRecipients = vi.fn();
vi.mock('@/lib/admin/admin-recipients', () => ({
  getAdminRecipients: () => getAdminRecipients(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

import { sendEmail } from '@/lib/email';
import { buildNotificationEmail, notifyTeamOfSignup } from '../waitlist-notification';

const ADMINS = ['admin@example.org', 'info@fightthestroke.org'];

const signup = {
  email: 'parent@example.com',
  name: 'Giulia',
  locale: 'it',
  source: 'pro',
};

describe('waitlist team notification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdminRecipients.mockResolvedValue(ADMINS);
  });

  it('goes to every administrator, not to one inbox', () => {
    expect(buildNotificationEmail(signup, ADMINS).to).toEqual(ADMINS);
  });

  it('says who asked and for what, so the subject alone is enough', () => {
    const mail = buildNotificationEmail(signup, ADMINS);

    expect(mail.subject).toContain('MirrorBuddy Pro');
    expect(mail.subject).toContain('parent@example.com');
    expect(mail.replyTo).toBe('parent@example.com');
  });

  it('carries the details into the body', () => {
    const { html } = buildNotificationEmail(signup, ADMINS);

    expect(html).toContain('parent@example.com');
    expect(html).toContain('Giulia');
    expect(html).toContain('it');
  });

  it('survives a signup with no name', () => {
    const { html } = buildNotificationEmail({ ...signup, name: null }, ADMINS);

    expect(html).toContain('—');
  });

  it('does not let a name become markup in our own inbox', () => {
    const { html } = buildNotificationEmail(
      { ...signup, name: '<img src=x onerror=alert(1)>' },
      ADMINS,
    );

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('sends the message', async () => {
    await notifyTeamOfSignup(signup);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendEmail).mock.calls[0][0].to).toEqual(ADMINS);
  });

  it('does not try to send when no administrator can be reached', async () => {
    getAdminRecipients.mockResolvedValue([]);

    await notifyTeamOfSignup(signup);

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('does not throw when the recipient lookup itself fails', async () => {
    getAdminRecipients.mockRejectedValueOnce(new Error('db down'));

    await expect(notifyTeamOfSignup(signup)).resolves.toBeUndefined();
  });

  it('does not throw when the mail service refuses', async () => {
    vi.mocked(sendEmail).mockResolvedValueOnce({
      success: false,
      error: 'rate limited',
    });

    await expect(notifyTeamOfSignup(signup)).resolves.toBeUndefined();
  });

  it('does not throw when the mail service is down entirely', async () => {
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error('ECONNRESET'));

    await expect(notifyTeamOfSignup(signup)).resolves.toBeUndefined();
  });
});
