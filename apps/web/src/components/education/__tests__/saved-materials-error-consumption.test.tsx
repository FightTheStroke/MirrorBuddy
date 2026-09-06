import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { setClientIdentity } from '@/lib/auth';
import { IdentityNotice } from '@/components/ui/identity-notice';
import { useDemos } from '@/lib/hooks/use-saved-materials';
import { HTMLSnippetsView } from '../html-snippets-view';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));
vi.mock('../html-preview', () => ({ HTMLPreview: () => null }));
vi.mock('../html-snippets-view/snippet-card', () => ({
  SnippetCard: ({ demo }: { demo: { title: string } }) => <div>{demo.title}</div>,
}));

beforeEach(() => {
  setClientIdentity({ status: 'pending' });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async () =>
      Response.json({
        materials: [
          {
            toolId: 'demo-1',
            title: 'Confirmed owner demo',
            content: { code: '<p>Example</p>' },
            createdAt: '2026-09-06',
          },
        ],
      }),
    ),
  );
});
afterEach(() => {
  cleanup();
  setClientIdentity({ status: 'pending' });
  vi.unstubAllGlobals();
});

describe('actual saved-material error consumption (no production correction)', () => {
  it('pending hook error is internal, not a rendered error or render crash, and reloads after confirmation', async () => {
    const { result } = renderHook(() => useDemos());
    render(
      <>
        <IdentityNotice />
        <HTMLSnippetsView />
      </>,
    );
    await waitFor(() => expect(result.current.error).toBe('MATERIALS_UNAVAILABLE'));

    expect(screen.queryByText('MATERIALS_UNAVAILABLE')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('demoInterattive')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();

    act(() =>
      setClientIdentity({
        status: 'authenticated',
        userId: 'confirmed-material-owner',
        role: 'USER',
        legacyOrigin: false,
        needsLegacyUpgrade: false,
      }),
    );
    await waitFor(() => expect(screen.getByText('Confirmed owner demo')).toBeInTheDocument());
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      '/api/materials?userId=confirmed-material-owner&toolType=demo&status=active',
    );
  });

  it.each(['SESSION_REJECTED', 'SESSION_UNAVAILABLE'])(
    'keeps %s visible through the real global notice',
    async (reason) => {
      setClientIdentity({ status: 'unavailable', reason });
      render(
        <>
          <IdentityNotice />
          <HTMLSnippetsView />
        </>,
      );
      await act(async () => undefined);

      expect(screen.getByRole('alert')).toHaveTextContent('unavailable');
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});
