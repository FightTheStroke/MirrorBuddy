import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { setClientIdentity, type ClientIdentity } from '@/lib/auth';
import { ZainoView } from '../zaino-view';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/education/archive', () => ({
  MaterialViewer: () => null,
  updateMaterialInteraction: vi.fn(),
}));
vi.mock('../components/filter-chips', () => ({ FilterChips: () => null }));
vi.mock('../components/search-controls', () => ({ SearchControls: () => null }));
vi.mock('../components/learning-paths-view', () => ({ LearningPathsView: () => null }));
vi.mock('../components/empty-state-tips', () => ({ EmptyStateTips: () => null }));
vi.mock('../components/results-section', () => ({
  ResultsSection: ({
    isLoading,
    filtered,
  }: {
    isLoading: boolean;
    filtered: { toolId: string; title: string }[];
  }) => (
    <div>
      {isLoading && <span>loading</span>}
      {filtered.map((material) => (
        <span key={material.toolId}>{material.title}</span>
      ))}
    </div>
  ),
}));

const account: ClientIdentity = {
  status: 'authenticated',
  userId: 'archive-owner',
  role: 'USER',
  legacyOrigin: false,
  needsLegacyUpgrade: false,
};
const materials = [
  {
    toolId: 'private-map',
    title: 'Confirmed archive material',
    toolType: 'mindmap',
    createdAt: '2026-09-06',
    isBookmarked: false,
  },
];

beforeEach(() => {
  setClientIdentity({ status: 'pending' });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async () => Response.json({ materials })),
  );
});
afterEach(() => {
  cleanup();
  setClientIdentity({ status: 'pending' });
  vi.unstubAllGlobals();
});

describe('reachable Zaino archive identity loading', () => {
  it('keeps pending as loading rather than a persistent visible error and loads after confirmation', async () => {
    render(<ZainoView />);
    await act(async () => undefined);
    expect(screen.queryByText('errorTitle')).not.toBeInTheDocument();
    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();

    act(() => setClientIdentity(account));
    await waitFor(() => expect(screen.getByText('Confirmed archive material')).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith('/api/materials?userId=archive-owner&status=active');
    expect(screen.queryByText('errorTitle')).not.toBeInTheDocument();
  });

  it.each(['SESSION_REJECTED', 'SESSION_UNAVAILABLE'])(
    'retains the visible error for %s without an anonymous read',
    async (reason) => {
      setClientIdentity({ status: 'unavailable', reason });
      render(<ZainoView />);
      await waitFor(() => expect(screen.getByText('errorTitle')).toBeInTheDocument());
      expect(fetch).not.toHaveBeenCalled();

      act(() => setClientIdentity({ status: 'pending' }));
      expect(screen.queryByText('errorTitle')).not.toBeInTheDocument();
      act(() => setClientIdentity(account));
      await waitFor(() =>
        expect(screen.getByText('Confirmed archive material')).toBeInTheDocument(),
      );
    },
  );

  it('does not issue an owner read for confirmed anonymous identity', async () => {
    setClientIdentity({ status: 'anonymous' });
    render(<ZainoView />);
    await act(async () => undefined);
    expect(screen.queryByText('loading')).not.toBeInTheDocument();
    expect(screen.queryByText('errorTitle')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps a real materials transport failure visible', async () => {
    setClientIdentity(account);
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }));
    render(<ZainoView />);
    await waitFor(() => expect(screen.getByText('errorTitle')).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('hides former ownership during refresh and rejects an in-flight former owner response', async () => {
    setClientIdentity(account);
    render(<ZainoView />);
    await waitFor(() => expect(screen.getByText('Confirmed archive material')).toBeInTheDocument());

    let release: (response: Response) => void = () => {
      throw new Error('No pending request');
    };
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );
    act(() => setClientIdentity({ ...account, userId: 'next-owner' }));
    expect(fetch).toHaveBeenCalledTimes(2);
    act(() => setClientIdentity({ status: 'pending' }));
    await act(async () => {
      release(Response.json({ materials }));
    });

    expect(screen.queryByText('Confirmed archive material')).not.toBeInTheDocument();
    expect(screen.queryByText('errorTitle')).not.toBeInTheDocument();
    expect(screen.getByText('loading')).toBeInTheDocument();
  });
});
