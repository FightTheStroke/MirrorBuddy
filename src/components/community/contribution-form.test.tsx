/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { csrfFetch } from '@/lib/auth';
import { ContributionForm } from './contribution-form';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return { ...actual, csrfFetch: vi.fn() };
});

const mockCsrfFetch = vi.mocked(csrfFetch);

describe('ContributionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows default MirrorBucks preview and updates when type changes', async () => {
    const user = userEvent.setup();
    render(<ContributionForm />);

    expect(screen.getByText('rewardPreview 10')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('contributionType'), 'resource');
    expect(screen.getByText('rewardPreview 30')).toBeInTheDocument();
  });

  it('submits payload with csrfFetch and shows success status', async () => {
    const user = userEvent.setup();
    mockCsrfFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 'contrib-1' }),
    } as Response);

    render(<ContributionForm />);

    await user.selectOptions(screen.getByLabelText('contributionType'), 'tip');
    await user.type(screen.getByLabelText('contributionTitle'), 'Helpful trick');
    await user.type(screen.getByLabelText('contributionContent'), 'Use spaced repetition every day.');
    await user.click(screen.getByRole('button', { name: 'submitButton' }));

    await waitFor(() => {
      expect(mockCsrfFetch).toHaveBeenCalledWith('/api/community/submit', {
        method: 'POST',
        body: JSON.stringify({
          type: 'tip',
          title: 'Helpful trick',
          content: 'Use spaced repetition every day.',
        }),
      });
    });

    expect(screen.getByRole('status')).toHaveTextContent('Contribution submitted successfully.');
  });

  it('shows moderation flag feedback for 422 response', async () => {
    const user = userEvent.setup();
    mockCsrfFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ flags: ['content:unsafe'] }),
    } as Response);

    render(<ContributionForm />);

    await user.type(screen.getByLabelText('contributionTitle'), 'Unsafe post');
    await user.type(screen.getByLabelText('contributionContent'), 'Bad content');
    await user.click(screen.getByRole('button', { name: 'submitButton' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Flagged for moderation: content:unsafe');
    });
  });

  it('shows generic error feedback for non-moderation errors', async () => {
    const user = userEvent.setup();
    mockCsrfFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    } as Response);

    render(<ContributionForm />);

    await user.type(screen.getByLabelText('contributionTitle'), 'Post title');
    await user.type(screen.getByLabelText('contributionContent'), 'Post content');
    await user.click(screen.getByRole('button', { name: 'submitButton' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server error');
    });
  });
});
