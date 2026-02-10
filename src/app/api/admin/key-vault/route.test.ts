/**
 * Tests for Key Vault API error handling categorization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { prisma } from '@/lib/db';
import * as encryption from '@/lib/admin/key-vault-encryption';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    secretVault: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/admin/key-vault-encryption', () => ({
  decryptSecret: vi.fn(),
  maskValue: vi.fn(),
}));

vi.mock('@/lib/api/middlewares', () => ({
  pipe: (..._handlers: any[]) => {
    return (handler: any) => handler;
  },
  withSentry: () => (ctx: any) => ctx,
  withAdmin: () => (ctx: any) => ctx,
  withCSRF: () => (ctx: any) => ctx,
}));

describe('Key Vault API Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return encryption_not_configured when TOKEN_ENCRYPTION_KEY is missing', async () => {
    // Mock encryption to throw "TOKEN_ENCRYPTION_KEY" error
    vi.mocked(prisma.secretVault.findMany).mockRejectedValue(
      new Error('TOKEN_ENCRYPTION_KEY is not set'),
    );

    const response = await GET({} as any);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('encryption_not_configured');
    expect(data.message).toContain('TOKEN_ENCRYPTION_KEY');
  });

  it('should return encryption_not_configured when key is too short', async () => {
    vi.mocked(prisma.secretVault.findMany).mockRejectedValue(
      new Error('Encryption key must be at least 32 char'),
    );

    const response = await GET({} as any);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('encryption_not_configured');
  });

  it('should return database_error for Prisma connection failures', async () => {
    vi.mocked(prisma.secretVault.findMany).mockRejectedValue(
      new Error("Can't reach database server"),
    );

    const response = await GET({} as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('database_error');
    expect(data.message).toContain('database');
  });

  it('should return decryption_failed when individual record decryption fails', async () => {
    // Mock DB to return records
    vi.mocked(prisma.secretVault.findMany).mockResolvedValue([
      {
        id: '1',
        service: 'test-service',
        keyName: 'test-key',
        encrypted: 'encrypted-data',
        iv: 'iv-data',
        authTag: 'auth-tag',
        status: 'active',
        lastUsed: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Mock decryption to fail
    vi.mocked(encryption.decryptSecret).mockImplementation(() => {
      throw new Error('Invalid authentication tag');
    });

    const response = await GET({} as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.secrets[0].maskedValue).toContain('ERROR');
  });

  it('should successfully decrypt and mask secrets when everything works', async () => {
    vi.mocked(prisma.secretVault.findMany).mockResolvedValue([
      {
        id: '1',
        service: 'test-service',
        keyName: 'test-key',
        encrypted: 'encrypted-data',
        iv: 'iv-data',
        authTag: 'auth-tag',
        status: 'active',
        lastUsed: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    vi.mocked(encryption.decryptSecret).mockReturnValue('secret-value');
    vi.mocked(encryption.maskValue).mockReturnValue('sec***lue');

    const response = await GET({} as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.secrets[0].maskedValue).toBe('sec***lue');
  });
});
