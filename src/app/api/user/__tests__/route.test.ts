/**
 * Tests for GET /api/user - User management with production security guard
 * ADR 0151: In production, unauthenticated requests return 401 (no auto-creation)
 * Plan 073: T4-07 - Update registration flow: default to Base tier (dev mode)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from '../route';

// Mock Prisma and helper
const mockUserCreate = vi.fn();
const mockUserFindUnique = vi.fn();
const mockAssignBaseTierToNewUser = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      create: () => mockUserCreate(),
      findUnique: () => mockUserFindUnique(),
    },
  },
  isDatabaseNotInitialized: vi.fn(() => false),
}));

vi.mock('@/lib/tier/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tier/server')>();
  return {
    ...actual,
    assignBaseTierToNewUser: (userId: string) => mockAssignBaseTierToNewUser(userId),
  };
});

// Mock dependencies
vi.mock('@/lib/auth/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/server')>();
  return {
    ...actual,
    validateAuth: vi.fn(),
    signCookieValue: vi.fn(() => ({
      signed: 'signed-value',
      raw: 'raw-value',
    })),
  };
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      set: vi.fn(),
    }),
  ),
}));

vi.mock('@/lib/helpers/publish-admin-counts', () => ({
  calculateAndPublishAdminCounts: vi.fn(() => Promise.resolve()),
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

describe('GET /api/user', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error -- NODE_ENV override for testing
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    // @ts-expect-error -- NODE_ENV restore
    process.env.NODE_ENV = originalEnv;
  });

  describe('Production security guard (ADR 0151)', () => {
    it('should return 401 for unauthenticated requests in production', async () => {
      // @ts-expect-error -- NODE_ENV override for testing
      process.env.NODE_ENV = 'production';

      const { validateAuth } = await import('@/lib/auth/server');
      vi.mocked(validateAuth).mockResolvedValue({
        authenticated: false,
        userId: null,
      });

      const request = new Request('http://localhost:3000/api/user');
      const response = (await GET(request as any)) as unknown as Response;

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.guest).toBe(true);
      expect(mockUserCreate).not.toHaveBeenCalled();
    });

    it('should return user data for authenticated requests in production', async () => {
      // @ts-expect-error -- NODE_ENV override for testing
      process.env.NODE_ENV = 'production';

      const { validateAuth } = await import('@/lib/auth/server');
      const mockUser = {
        id: 'user-prod',
        profile: {},
        settings: {},
        progress: {},
      };

      vi.mocked(validateAuth).mockResolvedValue({
        authenticated: true,
        userId: mockUser.id,
      });
      mockUserFindUnique.mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/user');
      const response = (await GET(request as any)) as unknown as Response;

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe('user-prod');
    });
  });

  describe('Dev mode - Base tier assignment on registration', () => {
    it('should create user with Base tier in dev mode', async () => {
      const { validateAuth } = await import('@/lib/auth/server');
      vi.mocked(validateAuth).mockResolvedValue({
        authenticated: false,
        userId: null,
      });

      const mockUser = {
        id: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        profile: {},
        settings: {},
        progress: {},
      };

      mockUserCreate.mockResolvedValue(mockUser);
      mockAssignBaseTierToNewUser.mockResolvedValue({
        id: 'sub-123',
        tierId: 'tier-base-123',
      });

      const request = new Request('http://localhost:3000/api/user');
      const response = (await GET(request as any)) as unknown as Response;
      const data = await response.json();

      expect(data).toHaveProperty('id');
      expect(mockUserCreate).toHaveBeenCalled();
      expect(mockAssignBaseTierToNewUser).toHaveBeenCalledWith(mockUser.id);
    });

    it('should not create duplicate subscription for existing user', async () => {
      const { validateAuth } = await import('@/lib/auth/server');
      const mockUser = {
        id: 'user-existing',
        createdAt: new Date(),
        updatedAt: new Date(),
        profile: {},
        settings: {},
        progress: {},
      };

      vi.mocked(validateAuth).mockResolvedValue({
        authenticated: true,
        userId: mockUser.id,
      });
      mockUserFindUnique.mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/user');
      await GET(request as any);

      expect(mockAssignBaseTierToNewUser).not.toHaveBeenCalled();
    });

    it('should handle missing Base tier gracefully', async () => {
      const { validateAuth } = await import('@/lib/auth/server');
      vi.mocked(validateAuth).mockResolvedValue({
        authenticated: false,
        userId: null,
      });

      const mockUser = {
        id: 'user-456',
        createdAt: new Date(),
        updatedAt: new Date(),
        profile: {},
        settings: {},
        progress: {},
      };

      mockUserCreate.mockResolvedValue(mockUser);
      mockAssignBaseTierToNewUser.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/user');
      const response = (await GET(request as any)) as unknown as Response;
      const data = await response.json();

      expect(data).toHaveProperty('id');
      expect(mockUserCreate).toHaveBeenCalled();
      expect(mockAssignBaseTierToNewUser).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
