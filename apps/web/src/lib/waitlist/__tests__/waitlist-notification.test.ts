/**
 * The team has to hear about a Pro signup.
 *
 * Roberto's requirement is not "store the address somewhere" — it is that
 * info@fightthestroke.org receives a message. These tests hold that promise,
 * and hold the other half of it too: a mail service having a bad day must
 * never cost somebody their place on the list.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
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
import {
  WAITLIST_NOTIFICATION_ADDRESS,
  buildNotificationEmail,
  notifyTeamOfSignup,
} from '../waitlist-notification';

const signup = {
  email: 'parent@example.com',
  name: 'Giulia',
  locale: 'it',
  source: 'pro',
};

describe('waitlist team notification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('goes to the association inbox Roberto asked for', () => {
    expect(WAITLIST_NOTIFICATION_ADDRESS).toBe('info@fightthestroke.org');
    expect(buildNotificationEmail(signup).to).toBe('info@fightthestroke.org');
  });

  it('says who asked and for what, so the subject alone is enough', () => {
    const mail = buildNotificationEmail(signup);

    expect(mail.subject).toContain('MirrorBuddy Pro');
    expect(mail.subject).toContain('parent@example.com');
    expect(mail.replyTo).toBe('parent@example.com');
  });

  it('carries the details into the body', () => {
    const { html } = buildNotificationEmail(signup);

    expect(html).toContain('parent@example.com');
    expect(html).toContain('Giulia');
    expect(html).toContain('it');
  });

  it('survives a signup with no name', () => {
    const { html } = buildNotificationEmail({ ...signup, name: null });

    expect(html).toContain('—');
  });

  it('does not let a name become markup in our own inbox', () => {
    const { html } = buildNotificationEmail({
      ...signup,
      name: '<img src=x onerror=alert(1)>',
    });

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('sends the message', async () => {
    await notifyTeamOfSignup(signup);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendEmail).mock.calls[0][0].to).toBe(WAITLIST_NOTIFICATION_ADDRESS);
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
