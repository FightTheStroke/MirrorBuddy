import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    schoolSSOConfig: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/security', () => ({
  hashPII: vi.fn((val: string) => Promise.resolve(`hashed_${val}`)),
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

import { handleSSOCallback } from './sso-callback-handler';
import { prisma } from '@/lib/db';
import { hashPII } from '@/lib/security';
import type { OIDCUserInfo } from './oidc-provider';

const mockFindFirst = vi.mocked(prisma.user.findFirst);
const mockCreate = vi.mocked(prisma.user.create);

describe('handleSSOCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should find existing user by emailHash (F-01)', async () => {
    // Arrange
    const userInfo: OIDCUserInfo = {
      sub: '123',
      email: 'test@school.edu',
      name: 'Test User',
    };
    mockFindFirst.mockResolvedValue({
      id: 'user-1',
      role: 'USER',
    } as never);

    // Act
    const result = await handleSSOCallback(userInfo, 'google');

    // Assert
    expect(hashPII).toHaveBeenCalledWith('test@school.edu');
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ emailHash: 'hashed_test@school.edu' }, { email: 'test@school.edu' }],
      },
    });
    expect(result.userId).toBe('user-1');
    expect(result.isNewUser).toBe(false);
  });

  it('should assign USER role to new SSO users (F-03)', async () => {
    // Arrange - email with "admin" substring should still get USER
    const userInfo: OIDCUserInfo = {
      sub: '456',
      email: 'admin@school.edu',
      name: 'Admin User',
    };
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'user-new' } as never);

    // Act
    const result = await handleSSOCallback(userInfo, 'google');

    // Assert - role must be USER, not ADMIN
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'USER',
        }),
      }),
    );
    expect(result.isNewUser).toBe(true);
  });

  it('should assign USER role even with Microsoft admin roles claim', async () => {
    // Arrange
    const userInfo: OIDCUserInfo = {
      sub: '789',
      email: 'dirigente@school.edu',
      name: 'Dirigente',
      roles: ['Admin', 'GlobalAdmin'],
    };
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'user-dir' } as never);

    // Act
    const result = await handleSSOCallback(userInfo, 'microsoft');

    // Assert
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'USER',
        }),
      }),
    );
    expect(result.isNewUser).toBe(true);
  });

  it('should preserve existing user role from DB', async () => {
    // Arrange - existing admin user should keep ADMIN role
    const userInfo: OIDCUserInfo = {
      sub: '111',
      email: 'boss@school.edu',
      name: 'Boss',
    };
    mockFindFirst.mockResolvedValue({
      id: 'user-admin',
      role: 'ADMIN',
    } as never);

    // Act
    const result = await handleSSOCallback(userInfo, 'google');

    // Assert - no role override for existing users
    expect(result.userId).toBe('user-admin');
    expect(result.isNewUser).toBe(false);
  });
});
