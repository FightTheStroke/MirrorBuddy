/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return { ...actual, csrfFetch: vi.fn() };
});

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const t: Record<string, string> = {
      'abTesting.manageTitle': 'Manage A/B Experiments',
      'abTesting.manageDescription': 'Create, edit, and manage the status of A/B experiments',
      'abTesting.createExperiment': 'Create experiment',
      'abTesting.deleteExperiment': 'Delete experiment',
      'abTesting.confirmDelete': 'Are you sure you want to delete this experiment?',
      'abTesting.cannotDeleteActive': 'Cannot delete an active experiment',
      'abTesting.activate': 'Activate',
      'abTesting.complete': 'Complete',
      'abTesting.statusDraft': 'Draft',
      'abTesting.statusActive': 'Active',
      'abTesting.statusCompleted': 'Completed',
      'abTesting.experimentName': 'Experiment name',
      'abTesting.saveChanges': 'Save changes',
      'abTesting.deleteSuccess': 'Experiment deleted successfully',
      'abTesting.activateSuccess': 'Experiment activated successfully',
      'abTesting.completeSuccess': 'Experiment completed successfully',
      'abTesting.loading': 'Loading...',
      'abTesting.noExperiments': 'No experiments available yet.',
    };
    return t[key] ?? key;
  },
}));

import { csrfFetch } from '@/lib/auth';
import ABTestingManagePage from './page';

const mockCsrfFetch = vi.mocked(csrfFetch);

const DRAFT_EXPERIMENT = {
  id: 'ab-1',
  name: 'Draft Exp',
  status: 'draft',
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: null,
  bucketConfigs: [
    {
      id: 'bc-1',
      bucketLabel: 'control',
      percentage: 50,
      modelProvider: 'azure',
      modelName: 'gpt-4o',
      extraConfig: {},
    },
    {
      id: 'bc-2',
      bucketLabel: 'variant',
      percentage: 50,
      modelProvider: 'azure',
      modelName: 'gpt-4o-mini',
      extraConfig: {},
    },
  ],
};

const ACTIVE_EXPERIMENT = {
  id: 'ab-2',
  name: 'Active Exp',
  status: 'active',
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: null,
  bucketConfigs: [],
};

function setupFetchList(experiments: unknown[]) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => experiments,
  } as Response);
}

describe('ABTestingManagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', async () => {
    setupFetchList([]);
    render(<ABTestingManagePage />);
    expect(screen.getByText('Manage A/B Experiments')).toBeInTheDocument();
  });

  it('lists experiments after load', async () => {
    setupFetchList([DRAFT_EXPERIMENT]);
    render(<ABTestingManagePage />);
    await waitFor(() => {
      expect(screen.getByText('Draft Exp')).toBeInTheDocument();
    });
  });

  it('shows empty state when no experiments', async () => {
    setupFetchList([]);
    render(<ABTestingManagePage />);
    await waitFor(() => {
      expect(screen.getByText('No experiments available yet.')).toBeInTheDocument();
    });
  });

  it('shows Activate button for draft experiments', async () => {
    setupFetchList([DRAFT_EXPERIMENT]);
    render(<ABTestingManagePage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Activate' })).toBeInTheDocument();
    });
  });

  it('shows Complete button for active experiments', async () => {
    setupFetchList([ACTIVE_EXPERIMENT]);
    render(<ABTestingManagePage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Complete' })).toBeInTheDocument();
    });
  });

  it('calls PATCH when Activate is clicked', async () => {
    setupFetchList([DRAFT_EXPERIMENT]);
    mockCsrfFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ...DRAFT_EXPERIMENT, status: 'active' }),
    } as Response);

    render(<ABTestingManagePage />);
    await waitFor(() => screen.getByRole('button', { name: 'Activate' }));
    await userEvent.click(screen.getByRole('button', { name: 'Activate' }));

    expect(mockCsrfFetch).toHaveBeenCalledWith(
      `/api/admin/research/ab-experiments/${DRAFT_EXPERIMENT.id}`,
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('shows delete button for non-active experiments', async () => {
    setupFetchList([DRAFT_EXPERIMENT]);
    render(<ABTestingManagePage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete experiment' })).toBeInTheDocument();
    });
  });

  it('shows confirmation dialog when delete is clicked', async () => {
    setupFetchList([DRAFT_EXPERIMENT]);
    render(<ABTestingManagePage />);
    await waitFor(() => screen.getByRole('button', { name: 'Delete experiment' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete experiment' }));
    expect(
      screen.getByText('Are you sure you want to delete this experiment?'),
    ).toBeInTheDocument();
  });

  it('calls DELETE after confirming delete dialog', async () => {
    setupFetchList([DRAFT_EXPERIMENT]);
    mockCsrfFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ deleted: true, id: DRAFT_EXPERIMENT.id }),
    } as Response);

    render(<ABTestingManagePage />);
    await waitFor(() => screen.getByRole('button', { name: 'Delete experiment' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete experiment' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete experiment' }));

    expect(mockCsrfFetch).toHaveBeenCalledWith(
      `/api/admin/research/ab-experiments/${DRAFT_EXPERIMENT.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('hides delete button for active experiments', async () => {
    setupFetchList([ACTIVE_EXPERIMENT]);
    render(<ABTestingManagePage />);
    await waitFor(() => screen.getByText('Active Exp'));
    expect(screen.queryByRole('button', { name: 'Delete experiment' })).not.toBeInTheDocument();
  });

  it('renders create experiment form', async () => {
    setupFetchList([]);
    render(<ABTestingManagePage />);
    expect(screen.getByRole('button', { name: 'Create experiment' })).toBeInTheDocument();
  });
});
