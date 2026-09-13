import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { getClientIdentity, setClientIdentity } from '../client-auth';
import { useAdminStatus } from '@/lib/hooks/use-admin-status';
import { getUserId as materialOwner } from '@/lib/hooks/use-saved-materials/utils/user-id';
import { getUserId as flashcardOwner } from '@/components/education/flashcards-view/utils/user-id';
import { getUserId as canvasOwner } from '@/components/tools/tool-canvas/utils';
import { getUserId as voiceOwner } from '@/components/voice/voice-session/helpers';
import { getUserId as callOwner } from '@/components/conversation/components/voice-call-helpers';
import { getOrCreateUserId } from '@/components/conversation/utils/conversation-helpers';
import { fetchMaterials, saveMaterialToAPI } from '@/lib/hooks/use-saved-materials/utils/api';
import { useMindmaps } from '@/lib/hooks/use-saved-materials/hooks/use-mindmaps';

const account = {
  status: 'authenticated' as const,
  userId: 'server-account',
  role: 'USER' as const,
  legacyOrigin: false,
  needsLegacyUpgrade: false,
};
beforeEach(() => {
  setClientIdentity(account);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ materials: [] })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('client identity consumer ownership', () => {
  it.each([materialOwner, flashcardOwner, canvasOwner, voiceOwner, callOwner, getOrCreateUserId])(
    'missing or corrupt hints cannot change the subject selected by %s',
    (owner) => {
      document.cookie = 'mirrorbuddy-user-id-client=%; path=/';
      expect(owner()).toBe(account.userId);
      setClientIdentity({ status: 'unavailable', reason: 'SESSION_UNAVAILABLE' });
      expect(() => owner()).toThrow();
    },
  );
  it('anonymous voice/conversation flows keep null without fabricating material ownership', () => {
    setClientIdentity({ status: 'anonymous' });
    expect(voiceOwner()).toBeNull();
    expect(callOwner()).toBeNull();
    expect(getOrCreateUserId()).toBeNull();
    expect(() => materialOwner()).toThrow();
    expect(() => canvasOwner()).toThrow();
  });
  it('admin status refreshes from confirmed role and exposes backend unavailability', () => {
    const { result } = renderHook(() => useAdminStatus());
    expect(result.current.isAdmin).toBe(false);
    act(() => setClientIdentity({ ...account, role: 'ADMIN' }));
    expect(result.current.isAdmin).toBe(true);
    act(() => setClientIdentity({ status: 'unavailable', reason: 'SESSION_REJECTED' }));
    expect(result.current.error).toBe('SESSION_REJECTED');
    expect(result.current.identityStatus).toBe('unavailable');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('saved-material hooks render unresolved identity safely and retry after confirmation', async () => {
    setClientIdentity({ status: 'pending' });
    const { result } = renderHook(() => useMindmaps());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    act(() => setClientIdentity(account));
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`userId=${account.userId}`));
  });
  it('unavailable writes retain failure rather than sending default-user ownership', async () => {
    setClientIdentity({ status: 'unavailable', reason: 'SESSION_UNAVAILABLE' });
    await expect(saveMaterialToAPI('default-user', 'mindmap', 'Draft', {})).resolves.toBeNull();
    await expect(fetchMaterials('mindmap', 'default-user')).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not apply a material read after identity changes', async () => {
    let release!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        release = resolve;
      }),
    );
    const loading = fetchMaterials('mindmap', account.userId);
    setClientIdentity({ ...account, userId: 'different-account' });
    release(Response.json({ materials: [{ toolId: 'private-material' }] }));
    await expect(loading).rejects.toThrow('identity changed');
    expect(getClientIdentity()).toMatchObject({ userId: 'different-account' });
  });
  it('does not display the former account material cache while the next account loads', async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({
        materials: [
          { toolId: 'account-a-private', title: 'Private', content: {}, createdAt: '2026-09-01' },
        ],
      }),
    );
    const { result } = renderHook(() => useMindmaps());
    await waitFor(() => expect(result.current.mindmaps).toHaveLength(1));
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
    act(() => setClientIdentity({ ...account, userId: 'next-account' }));
    expect(result.current.mindmaps).toEqual([]);
  });
});
