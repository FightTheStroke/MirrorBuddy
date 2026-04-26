/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CommunityReviewPage from './page';
import { csrfFetch } from '@/lib/auth';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/auth', () => ({
  csrfFetch: vi.fn(),
}));

describe('CommunityReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('loads pending contributions and renders review actions', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'c-1',
            title: 'Math hack',
            type: 'tip',
            userId: 'student-1',
            content: 'Use colors and memory palaces to remember formulas.',
            createdAt: '2026-01-02T08:00:00.000Z',
          },
        ],
      }),
    } as Response);

    render(<CommunityReviewPage />);

    expect(screen.getByText('loadingPending')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Math hack')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/admin/community/review');
    expect(screen.getByRole('columnheader', { name: 'title' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'type' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'author' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'submitted' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'preview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'reject' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'flag' })).toBeInTheDocument();
  });

  it('patches contribution status when approving', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'c-2',
            title: 'Study card trick',
            type: 'resource',
            userId: 'student-2',
            content: 'Chunk your flashcards into tiny sets.',
            createdAt: '2026-01-03T10:00:00.000Z',
          },
        ],
      }),
    } as Response);
    vi.mocked(csrfFetch).mockResolvedValue({ ok: true } as Response);

    render(<CommunityReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Study card trick')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'approve' }));

    await waitFor(() => {
      expect(csrfFetch).toHaveBeenCalledWith('/api/admin/community/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'c-2', status: 'approved' }),
      });
    });
  });

  it('renders empty state when queue is empty', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    } as Response);

    render(<CommunityReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('noPending')).toBeInTheDocument();
    });
  });
});
