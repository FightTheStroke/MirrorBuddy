/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExperimentCreateForm } from './experiment-form';
import { csrfFetch } from '@/lib/auth';

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return { ...actual, csrfFetch: vi.fn() };
});

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'research.createForm.title': 'Create experiment',
      'research.createForm.name': 'Name',
      'research.createForm.hypothesis': 'Hypothesis',
      'research.createForm.maestroId': 'Maestro',
      'research.createForm.syntheticProfileId': 'Synthetic profile',
      'research.createForm.turns': 'Turns',
      'research.createForm.topic': 'Topic',
      'research.createForm.difficulty': 'Difficulty',
      'research.createForm.difficultyEasy': 'Easy',
      'research.createForm.difficultyMedium': 'Medium',
      'research.createForm.difficultyHard': 'Hard',
      'research.createForm.submit': 'Create',
      'research.createForm.submitting': 'Creating...',
      'research.createForm.success': 'Experiment created',
      'research.createForm.error': 'Failed to create experiment',
      'research.createForm.validationRequired': 'Fill all required fields',
      'research.createForm.validationTurns': 'Turns must be at least 1',
    };

    return translations[key] || key;
  },
}));

const mockCsrfFetch = vi.mocked(csrfFetch);

describe('ExperimentCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    maestros: [{ id: 'm-1', label: 'Maestro One' }],
    syntheticProfiles: [{ id: 's-1', label: 'Profile One' }],
  };

  it('renders required fields', () => {
    render(<ExperimentCreateForm {...defaultProps} />);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Hypothesis')).toBeInTheDocument();
    expect(screen.getByLabelText('Maestro')).toBeInTheDocument();
    expect(screen.getByLabelText('Synthetic profile')).toBeInTheDocument();
    expect(screen.getByLabelText('Turns')).toBeInTheDocument();
  });

  it('shows validation and avoids submit when required fields are missing', async () => {
    const user = userEvent.setup();
    render(<ExperimentCreateForm {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByText('Fill all required fields')).toBeInTheDocument();
    expect(mockCsrfFetch).not.toHaveBeenCalled();
  });

  it('submits valid payload with csrfFetch', async () => {
    const user = userEvent.setup();

    let resolveRequest: ((value: Response | PromiseLike<Response>) => void) | null = null;
    mockCsrfFetch.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );

    render(<ExperimentCreateForm {...defaultProps} />);

    await user.type(screen.getByLabelText('Name'), 'A/B test');
    await user.type(screen.getByLabelText('Hypothesis'), 'Scaffolding improves score');
    await user.selectOptions(screen.getByLabelText('Maestro'), 'm-1');
    await user.selectOptions(screen.getByLabelText('Synthetic profile'), 's-1');
    await user.clear(screen.getByLabelText('Turns'));
    await user.type(screen.getByLabelText('Turns'), '6');
    await user.type(screen.getByLabelText('Topic'), 'fractions');
    await user.selectOptions(screen.getByLabelText('Difficulty'), 'hard');

    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();

    resolveRequest!({
      ok: true,
      json: async () => ({ id: 'exp-1' }),
    } as Response);

    await waitFor(() => {
      expect(mockCsrfFetch).toHaveBeenCalledWith('/api/admin/research/experiments', {
        method: 'POST',
        body: JSON.stringify({
          name: 'A/B test',
          hypothesis: 'Scaffolding improves score',
          maestroId: 'm-1',
          syntheticProfileId: 's-1',
          turns: 6,
          topic: 'fractions',
          difficulty: 'hard',
        }),
      });
    });

    expect(screen.getByText('Experiment created')).toBeInTheDocument();
  });

  it('shows error feedback on failed request', async () => {
    const user = userEvent.setup();

    mockCsrfFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Bad request' }),
    } as Response);

    render(<ExperimentCreateForm {...defaultProps} />);

    await user.type(screen.getByLabelText('Name'), 'A/B test');
    await user.type(screen.getByLabelText('Hypothesis'), 'Scaffolding improves score');
    await user.selectOptions(screen.getByLabelText('Maestro'), 'm-1');
    await user.selectOptions(screen.getByLabelText('Synthetic profile'), 's-1');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(screen.getByText('Bad request')).toBeInTheDocument();
    });
  });
});
