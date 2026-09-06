import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  create: vi.fn(),
  account: vi.fn(),
  encrypt: vi.fn(async (value: string) => value),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mocks.user, upsert: mocks.create },
    googleAccount: { upsert: mocks.account },
  },
}));
vi.mock('@/lib/security', () => ({ encryptToken: mocks.encrypt, decryptToken: mocks.encrypt }));
import { saveGoogleAccount } from '@/lib/google/oauth';

const tokens = {
  access_token: 'synthetic',
  expires_in: 3600,
  token_type: 'Bearer',
  scope: 'drive.readonly',
};
const profile = {
  id: 'provider-subject',
  email: 'fixture@example.com',
  name: 'Fixture',
  verified_email: true,
};
beforeEach(() => vi.clearAllMocks());

it('cannot resurrect a deleted identity from an outstanding Drive OAuth callback', async () => {
  mocks.user.mockResolvedValue(null);
  await expect(saveGoogleAccount('deleted-owner', tokens, profile)).rejects.toThrow();
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.account).not.toHaveBeenCalled();
});
it('retains ordinary provider linking for an existing enabled owner without issuing auth', async () => {
  mocks.user.mockResolvedValue({ id: 'owner', disabled: false });
  await saveGoogleAccount('owner', tokens, profile);
  expect(mocks.account).toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
});
