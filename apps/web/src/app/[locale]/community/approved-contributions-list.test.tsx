/**
 * @vitest-environment jsdom
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { csrfFetch, isAuthenticated } from '@/lib/auth';

import { ApprovedContributionsList } from './approved-contributions-list';

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...actual,
    csrfFetch: vi.fn(),
    isAuthenticated: vi.fn(),
  };
});

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, values?: { count?: number }) => {
    if (namespace !== 'community.votes') {
      return key;
    }

    if (key === 'voteButton') {
      return 'Vote';
    }

    if (key === 'removeVote') {
      return 'Remove vote';
    }

    if (key === 'voteCount') {
      return `${values?.count ?? 0} votes`;
    }

    if (key === 'loginToVote') {
      return 'Log in to vote';
    }

    if (key === 'voteError') {
      return 'Unable to record your vote.';
    }

    return key;
  },
}));

const mockCsrfFetch = vi.mocked(csrfFetch);
const mockIsAuthenticated = vi.mocked(isAuthenticated);

function createListResponse(voteCount = 2) {
  return {
    ok: true,
    json: async () => ({
      items: [
        {
          id: 'contribution-1',
          title: 'Memory Palace Tips',
          content: 'Create vivid locations for concepts.',
          type: 'tip',
          voteCount,
          createdAt: '2026-02-01T10:00:00.000Z',
        },
      ],
    }),
  } as Response;
}

describe('ApprovedContributionsList vote toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
    global.fetch = vi.fn().mockResolvedValue(createListResponse());
    mockCsrfFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ voted: true, newVoteCount: 3 }),
    } as Response);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders vote button with translated aria label and vote count', async () => {
    render(
      <ApprovedContributionsList
        endpoint="/api/community/list"
        title="Approved"
        loadingLabel="Loading"
        emptyLabel="Empty"
      />,
    );

    expect(await screen.findByRole('button', { name: 'Vote' })).toBeInTheDocument();
    expect(screen.getByText('2 votes')).toBeInTheDocument();
  });

  it('optimistically toggles vote and calls vote endpoint after 300ms debounce', async () => {
    const user = userEvent.setup();

    render(
      <ApprovedContributionsList
        endpoint="/api/community/list"
        title="Approved"
        loadingLabel="Loading"
        emptyLabel="Empty"
      />,
    );

    const button = await screen.findByRole('button', { name: 'Vote' });
    await user.click(button);

    // Optimistic update is immediate (before debounce fires)
    expect(screen.getByRole('button', { name: 'Remove vote' })).toBeInTheDocument();
    expect(screen.getByText('3 votes')).toBeInTheDocument();
    expect(mockCsrfFetch).not.toHaveBeenCalled();

    // After debounce (300ms), the API call fires
    await waitFor(
      () => {
        expect(mockCsrfFetch).toHaveBeenCalledWith('/api/community/vote', {
          method: 'POST',
          body: JSON.stringify({ contributionId: 'contribution-1' }),
        });
      },
      { timeout: 1000 },
    );
  });

  it('shows login prompt when user is not authenticated', async () => {
    const user = userEvent.setup();
    mockIsAuthenticated.mockReturnValue(false);

    render(
      <ApprovedContributionsList
        endpoint="/api/community/list"
        title="Approved"
        loadingLabel="Loading"
        emptyLabel="Empty"
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Vote' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Log in to vote');
    expect(mockCsrfFetch).not.toHaveBeenCalled();
  });

  it('reverts optimistic update and shows translated error when vote request fails', async () => {
    const user = userEvent.setup();
    mockCsrfFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'failed' }),
    } as Response);

    render(
      <ApprovedContributionsList
        endpoint="/api/community/list"
        title="Approved"
        loadingLabel="Loading"
        emptyLabel="Empty"
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Vote' }));

    expect(screen.getByText('3 votes')).toBeInTheDocument();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 320));
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Unable to record your vote.');
    });

    expect(screen.getByRole('button', { name: 'Vote' })).toBeInTheDocument();
    expect(screen.getByText('2 votes')).toBeInTheDocument();
  });
});
