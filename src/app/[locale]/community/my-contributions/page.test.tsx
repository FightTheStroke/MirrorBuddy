/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MyContributionsPage from './page';

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    if (namespace !== 'community.myContributions') {
      return key;
    }

    const labels: Record<string, string> = {
      title: 'My contributions',
      noContributions: "You haven't submitted any contributions yet.",
      statusPending: 'Pending',
      statusApproved: 'Approved',
      statusRejected: 'Rejected',
      rejectionReason: 'Rejection reason',
      viewDetails: 'View details',
      submittedOn: 'Submitted on',
    };

    return labels[key] ?? key;
  },
}));

type TestContribution = {
  id: string;
  title: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  voteCount: number;
  createdAt: string;
  moderationNote?: string;
};

function createResponse(items: TestContribution[]): Response {
  return {
    ok: true,
    json: async () => ({ items }),
  } as Response;
}

describe('MyContributionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders contributions list with title, type, vote count and submitted date', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      createResponse([
        {
          id: 'contribution-1',
          title: 'Study cards for algebra',
          type: 'flashcards',
          status: 'approved',
          voteCount: 7,
          createdAt: '2026-02-20T10:00:00.000Z',
        },
      ]),
    );

    render(<MyContributionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Study cards for algebra')).toBeInTheDocument();
    });

    expect(screen.getByText('flashcards')).toBeInTheDocument();
    expect(screen.getByText('👍 7')).toBeInTheDocument();
    expect(screen.getByText(/Submitted on/)).toBeInTheDocument();
  });

  it('renders pending, approved and rejected status badges with expected colors', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      createResponse([
        {
          id: 'pending-1',
          title: 'Pending item',
          type: 'tip',
          status: 'pending',
          voteCount: 0,
          createdAt: '2026-02-20T10:00:00.000Z',
        },
        {
          id: 'approved-1',
          title: 'Approved item',
          type: 'resource',
          status: 'approved',
          voteCount: 3,
          createdAt: '2026-02-19T10:00:00.000Z',
        },
        {
          id: 'rejected-1',
          title: 'Rejected item',
          type: 'question',
          status: 'rejected',
          voteCount: 1,
          createdAt: '2026-02-18T10:00:00.000Z',
          moderationNote: 'Needs sources',
        },
      ]),
    );

    render(<MyContributionsPage />);

    const pendingBadge = await screen.findByText('Pending');
    const approvedBadge = screen.getByText('Approved');
    const rejectedBadge = screen.getByText('Rejected');

    expect(pendingBadge).toHaveClass('bg-yellow-100');
    expect(approvedBadge).toHaveClass('bg-green-100');
    expect(rejectedBadge).toHaveClass('bg-red-100');
  });

  it('shows rejection reason only after expanding rejected contribution details', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      createResponse([
        {
          id: 'rejected-2',
          title: 'Rejected contribution',
          type: 'summary',
          status: 'rejected',
          voteCount: 0,
          createdAt: '2026-02-18T10:00:00.000Z',
          moderationNote: 'Please add more detailed references.',
        },
      ]),
    );

    render(<MyContributionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Rejected contribution')).toBeInTheDocument();
    });

    expect(screen.queryByText('Rejection reason')).not.toBeInTheDocument();
    expect(screen.queryByText('Please add more detailed references.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View details' }));

    expect(screen.getByText(/Rejection reason/)).toBeInTheDocument();
    expect(screen.getByText(/Please add more detailed references\./)).toBeInTheDocument();
  });
});
