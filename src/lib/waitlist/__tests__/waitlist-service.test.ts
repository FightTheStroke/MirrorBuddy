/**
 * Unit tests for waitlist-service
 * TDD: written before implementation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

vi.mock('@/lib/funnel', () => ({
  recordFunnelEvent: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/email/templates/waitlist-templates', () => ({
  getVerificationTemplate: vi.fn().mockReturnValue({
    subject: 'Verify your email',
    html: '<p>Verify</p>',
    text: 'Verify',
  }),
  getVerifiedTemplate: vi.fn().mockReturnValue({
    subject: 'Welcome!',
    html: '<p>Welcome</p>',
    text: 'Welcome',
  }),
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

import { prisma } from '@/lib/db';
import { recordFunnelEvent } from '@/lib/funnel';
import { signup, verify, unsubscribe } from '../waitlist-service';

const mockRecordFunnelEvent = recordFunnelEvent as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('signup', () => {
  it('throws on invalid email', async () => {
    await expect(
      signup({ email: 'not-an-email', locale: 'it', gdprConsentVersion: '1.0' }),
    ).rejects.toThrow('Invalid email');
  });

  it('throws on duplicate email', async () => {
    prisma.waitlistEntry.findUnique.mockResolvedValue({ id: 'existing-id' });
    await expect(
      signup({ email: 'test@example.com', locale: 'it', gdprConsentVersion: '1.0' }),
    ).rejects.toThrow('Email already registered');
  });

  it('creates entry and records funnel event on success', async () => {
    prisma.waitlistEntry.findUnique.mockResolvedValue(null);
    prisma.waitlistEntry.create.mockResolvedValue({
      id: 'new-id',
      email: 'test@example.com',
      verificationToken: 'token123',
    });

    const result = await signup({
      email: 'test@example.com',
      locale: 'it',
      gdprConsentVersion: '1.0',
    });

    expect(prisma.waitlistEntry.create).toHaveBeenCalledOnce();
    expect(mockRecordFunnelEvent).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'WAITLIST_SIGNUP' }),
    );
    expect(result).toMatchObject({ email: 'test@example.com' });
  });

  it('throws on missing gdprConsentVersion', async () => {
    await expect(
      signup({ email: 'test@example.com', locale: 'it', gdprConsentVersion: '' }),
    ).rejects.toThrow('GDPR consent version is required');
  });

  it('sets marketingConsentAt when marketingConsent is true', async () => {
    prisma.waitlistEntry.findUnique.mockResolvedValue(null);
    prisma.waitlistEntry.create.mockResolvedValue({
      id: 'new-id',
      email: 'test@example.com',
      verificationToken: 'token123',
    });

    await signup({
      email: 'test@example.com',
      locale: 'en',
      gdprConsentVersion: '1.0',
      marketingConsent: true,
    });

    const createCall = prisma.waitlistEntry.create.mock.calls[0][0];
    expect(createCall.data.marketingConsent).toBe(true);
    expect(createCall.data.marketingConsentAt).toBeInstanceOf(Date);
  });
});

describe('verify', () => {
  it('throws when token not found', async () => {
    prisma.waitlistEntry.findUnique.mockResolvedValue(null);
    await expect(verify('invalid-token')).rejects.toThrow('Invalid verification token');
  });

  it('throws when token is expired', async () => {
    const past = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h ago
    prisma.waitlistEntry.findUnique.mockResolvedValue({
      id: 'id',
      verifiedAt: null,
      verificationExpiresAt: past,
    });
    await expect(verify('expired-token')).rejects.toThrow('Verification token expired');
  });

  it('throws when already verified', async () => {
    prisma.waitlistEntry.findUnique.mockResolvedValue({
      id: 'id',
      verifiedAt: new Date(),
      verificationExpiresAt: new Date(Date.now() + 3600000),
    });
    await expect(verify('already-verified-token')).rejects.toThrow('Email already verified');
  });

  it('sets verifiedAt and generates promoCode on success', async () => {
    const future = new Date(Date.now() + 3600000);
    prisma.waitlistEntry.findUnique.mockResolvedValue({
      id: 'id',
      email: 'test@example.com',
      verifiedAt: null,
      verificationExpiresAt: future,
      locale: 'it',
    });
    prisma.waitlistEntry.update.mockResolvedValue({
      id: 'id',
      email: 'test@example.com',
      verifiedAt: new Date(),
      promoCode: 'ABC12345',
    });

    const result = await verify('valid-token');

    expect(prisma.waitlistEntry.update).toHaveBeenCalledOnce();
    const updateCall = prisma.waitlistEntry.update.mock.calls[0][0];
    expect(updateCall.data.verifiedAt).toBeInstanceOf(Date);
    expect(updateCall.data.promoCode).toMatch(/^[A-Z0-9]{8}$/);
    expect(mockRecordFunnelEvent).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'WAITLIST_VERIFIED' }),
    );
    expect(result).toMatchObject({ email: 'test@example.com' });
  });
});

describe('unsubscribe', () => {
  it('throws when token not found', async () => {
    prisma.waitlistEntry.findUnique.mockResolvedValue(null);
    await expect(unsubscribe('invalid-token')).rejects.toThrow('Invalid unsubscribe token');
  });

  it('sets unsubscribedAt on success', async () => {
    prisma.waitlistEntry.findUnique.mockResolvedValue({
      id: 'id',
      email: 'test@example.com',
      unsubscribedAt: null,
    });
    prisma.waitlistEntry.update.mockResolvedValue({
      id: 'id',
      email: 'test@example.com',
      unsubscribedAt: new Date(),
    });

    const result = await unsubscribe('valid-unsubscribe-token');

    expect(prisma.waitlistEntry.update).toHaveBeenCalledOnce();
    const updateCall = prisma.waitlistEntry.update.mock.calls[0][0];
    expect(updateCall.data.unsubscribedAt).toBeInstanceOf(Date);
    expect(result).toMatchObject({ email: 'test@example.com' });
  });

  it('is idempotent when already unsubscribed', async () => {
    const alreadyUnsubscribed = new Date(Date.now() - 3600000);
    prisma.waitlistEntry.findUnique.mockResolvedValue({
      id: 'id',
      email: 'test@example.com',
      unsubscribedAt: alreadyUnsubscribed,
    });
    prisma.waitlistEntry.update.mockResolvedValue({
      id: 'id',
      email: 'test@example.com',
      unsubscribedAt: alreadyUnsubscribed,
    });

    // Should not throw, should succeed
    const result = await unsubscribe('valid-unsubscribe-token');
    expect(result).toMatchObject({ email: 'test@example.com' });
  });
});
