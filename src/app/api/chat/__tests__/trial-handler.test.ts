/**
 * Trial Handler Tests
 * Validates security behavior for trial limit handling (F-01: fail-closed)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkTrialForAnonymous, getTrialSession } from '../trial-handler';

// Mock the trial service
vi.mock('@/lib/trial/trial-service', () => ({
  getOrCreateTrialSession: vi.fn(),
  incrementUsage: vi.fn(),
  checkAndIncrementUsage: vi.fn(),
  getTierLimitsForTrial: vi.fn().mockResolvedValue({
    chat: 10,
    voiceSeconds: 300,
    tools: 10,
    docs: 1,
  }),
}));

// Mock Next.js server functions
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));

import { getOrCreateTrialSession, checkAndIncrementUsage } from '@/lib/trial/trial-service';
import { cookies, headers } from 'next/headers';

describe('checkTrialForAnonymous', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return allowed: true for authenticated users', async () => {
    const result = await checkTrialForAnonymous(true, 'user-123');
    expect(result.allowed).toBe(true);
  });

  it('should return allowed: true when no visitor cookie exists yet', async () => {
    const mockCookies = {
      get: vi.fn().mockReturnValue(undefined),
    };
    (cookies as any).mockResolvedValue(mockCookies);

    const result = await checkTrialForAnonymous(false);
    expect(result.allowed).toBe(true);
  });

  it('should deny access (allowed: false) when trial service throws error', async () => {
    const mockCookies = {
      get: vi.fn().mockReturnValue({ value: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' }),
    };
    (cookies as any).mockResolvedValue(mockCookies);

    const mockHeaders = {
      get: vi.fn().mockReturnValue(null),
    };
    (headers as any).mockResolvedValue(mockHeaders);

    // Mock the trial service to throw an error
    (getOrCreateTrialSession as any).mockRejectedValue(new Error('Database connection failed'));

    // SECURITY REQUIREMENT: On error, must deny access (fail-closed)
    const result = await checkTrialForAnonymous(false);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('failed');
  });

  it('should include reason when trial verification fails', async () => {
    const mockCookies = {
      get: vi.fn().mockReturnValue({ value: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' }),
    };
    (cookies as any).mockResolvedValue(mockCookies);

    const mockHeaders = {
      get: vi.fn().mockReturnValue(null),
    };
    (headers as any).mockResolvedValue(mockHeaders);

    (getOrCreateTrialSession as any).mockRejectedValue(new Error('Service unavailable'));

    const result = await checkTrialForAnonymous(false);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
    expect(typeof result.reason).toBe('string');
  });

  it('should return allowed: false when checkAndIncrementUsage throws error', async () => {
    const mockCookies = {
      get: vi.fn().mockReturnValue({ value: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' }),
    };
    (cookies as any).mockResolvedValue(mockCookies);

    const mockHeaders = {
      get: vi.fn().mockReturnValue(null),
    };
    (headers as any).mockResolvedValue(mockHeaders);

    // First call succeeds (session created), second call (atomic check) fails
    (getOrCreateTrialSession as any).mockResolvedValue({
      id: 'session-123',
      chatsUsed: 5,
      toolsUsed: 3,
    });

    // F-02: Now using atomic checkAndIncrementUsage
    (checkAndIncrementUsage as any).mockRejectedValue(new Error('Redis unavailable'));

    // SECURITY REQUIREMENT: Fail-closed on any error in limit checking
    const result = await checkTrialForAnonymous(false);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('should allow access when trial limits are within bounds', async () => {
    const mockCookies = {
      get: vi.fn().mockReturnValue({ value: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' }),
    };
    (cookies as any).mockResolvedValue(mockCookies);

    const mockHeaders = {
      get: vi.fn().mockReturnValue(null),
    };
    (headers as any).mockResolvedValue(mockHeaders);

    (getOrCreateTrialSession as any).mockResolvedValue({
      id: 'session-123',
      chatsUsed: 3,
      toolsUsed: 2,
    });

    // F-02: Now using atomic checkAndIncrementUsage instead of checkTrialLimits
    (checkAndIncrementUsage as any).mockResolvedValue({
      allowed: true,
      remaining: 6, // 10 - 3 - 1 (atomic increment)
    });

    const result = await checkTrialForAnonymous(false);

    expect(result.allowed).toBe(true);
    expect(result.sessionId).toBe('session-123');
    expect(result.chatsRemaining).toBe(6); // remaining from atomic operation
    expect(result.toolsRemaining).toBe(8); // 10 - 2
  });
});

describe('getTrialSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null for authenticated users', async () => {
    const result = await getTrialSession(true, 'user-123');
    expect(result).toBeNull();
  });

  it('should return null when no visitor ID cookie exists', async () => {
    const mockCookies = {
      get: vi.fn().mockReturnValue(undefined),
    };
    (cookies as any).mockResolvedValue(mockCookies);

    const result = await getTrialSession(false);
    expect(result).toBeNull();
  });

  it('should return sessionId when visitor ID exists', async () => {
    const mockCookies = {
      get: vi.fn().mockReturnValue({ value: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e' }),
    };
    (cookies as any).mockResolvedValue(mockCookies);

    const mockHeaders = {
      get: vi.fn().mockReturnValue(null),
    };
    (headers as any).mockResolvedValue(mockHeaders);

    (getOrCreateTrialSession as any).mockResolvedValue({
      id: 'session-456',
    });

    const result = await getTrialSession(false);
    expect(result).not.toBeNull();
    expect(result?.sessionId).toBe('session-456');
  });
});
