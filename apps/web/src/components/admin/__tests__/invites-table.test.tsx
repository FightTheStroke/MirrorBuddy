/**
 * Unit tests for InvitesTable component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InvitesTable, type InviteRequest } from '../invites-table';
import { getTranslation } from '@/test/i18n-helpers';

const mockInvites: InviteRequest[] = [
  {
    id: 'inv-1',
    email: 'user1@test.com',
    name: 'User One',
    motivation: 'I want to learn math',
    status: 'PENDING',
    trialSessionId: null,
    createdAt: '2026-01-15T10:00:00Z',
    reviewedAt: null,
    rejectionReason: null,
    generatedUsername: null,
  },
  {
    id: 'inv-2',
    email: 'user2@test.com',
    name: 'User Two',
    motivation: 'For my child',
    status: 'APPROVED',
    trialSessionId: 'trial-123',
    createdAt: '2026-01-14T10:00:00Z',
    reviewedAt: '2026-01-15T12:00:00Z',
    rejectionReason: null,
    generatedUsername: 'usertwo1a2b',
  },
  {
    id: 'inv-3',
    email: 'user3@test.com',
    name: 'User Three',
    motivation: 'Testing',
    status: 'REJECTED',
    trialSessionId: null,
    createdAt: '2026-01-13T10:00:00Z',
    reviewedAt: '2026-01-14T10:00:00Z',
    rejectionReason: 'Not eligible',
    generatedUsername: null,
    isDirect: true,
  },
];

describe('InvitesTable', () => {
  it('renders all invites', () => {
    render(
      <InvitesTable invites={mockInvites} selectedIds={new Set()} onSelectionChange={vi.fn()} />,
    );

    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('User Two')).toBeInTheDocument();
    expect(screen.getByText('User Three')).toBeInTheDocument();
  });

  it('displays status badges correctly', () => {
    render(
      <InvitesTable invites={mockInvites} selectedIds={new Set()} onSelectionChange={vi.fn()} />,
    );

    expect(screen.getByText(getTranslation('admin.invites.statusPending'))).toBeInTheDocument();
    expect(screen.getByText(getTranslation('admin.invites.statusApproved'))).toBeInTheDocument();
    expect(screen.getByText(getTranslation('admin.invites.statusRejected'))).toBeInTheDocument();
  });

  it('shows checkbox only for pending invites', () => {
    render(
      <InvitesTable
        invites={mockInvites}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
        showCheckboxes={true}
      />,
    );

    // Only 1 pending invite should have a checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    // Header checkbox + 1 pending invite checkbox
    expect(checkboxes.length).toBe(2);
  });

  it('calls onSelectionChange when checkbox clicked', () => {
    const onSelectionChange = vi.fn();
    render(
      <InvitesTable
        invites={mockInvites}
        selectedIds={new Set()}
        onSelectionChange={onSelectionChange}
      />,
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // Click first row checkbox (not header)

    expect(onSelectionChange).toHaveBeenCalled();
  });

  it('selects all pending when header checkbox clicked', () => {
    const onSelectionChange = vi.fn();
    render(
      <InvitesTable
        invites={mockInvites}
        selectedIds={new Set()}
        onSelectionChange={onSelectionChange}
      />,
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Click header checkbox

    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['inv-1']));
  });

  it('expands row to show motivation on click', () => {
    render(
      <InvitesTable invites={mockInvites} selectedIds={new Set()} onSelectionChange={vi.fn()} />,
    );

    // Motivation should not be visible initially
    expect(screen.queryByText('I want to learn math')).not.toBeInTheDocument();

    // Click on the row to expand
    const expandButton = screen.getByText('User One').closest('button');
    fireEvent.click(expandButton!);

    // Now motivation should be visible
    expect(screen.getByText('I want to learn math')).toBeInTheDocument();
  });

  it('shows empty state when no invites', () => {
    render(<InvitesTable invites={[]} selectedIds={new Set()} onSelectionChange={vi.fn()} />);

    // Empty state message - check for text pattern instead of hardcoded Italian
    const emptyState = screen.getByText(/richiesta|request/i);
    expect(emptyState).toBeInTheDocument();
  });

  it('shows generated username for approved invites', () => {
    render(
      <InvitesTable invites={mockInvites} selectedIds={new Set()} onSelectionChange={vi.fn()} />,
    );

    // Expand approved invite
    const expandButton = screen.getByText('User Two').closest('button');
    fireEvent.click(expandButton!);

    expect(screen.getByText('Username: usertwo1a2b')).toBeInTheDocument();
  });

  it('shows rejection reason for rejected invites', () => {
    render(
      <InvitesTable invites={mockInvites} selectedIds={new Set()} onSelectionChange={vi.fn()} />,
    );

    // Expand rejected invite
    const expandButton = screen.getByText('User Three').closest('button');
    fireEvent.click(expandButton!);

    // Check for rejection reason text (contains the reason value)
    expect(screen.getByText(/Not eligible/)).toBeInTheDocument();
  });

  it('shows direct invite label when isDirect is true', () => {
    render(
      <InvitesTable invites={mockInvites} selectedIds={new Set()} onSelectionChange={vi.fn()} />,
    );

    const expandButton = screen.getByText('User Three').closest('button');
    fireEvent.click(expandButton!);

    // Check for direct invite indicator (contains "diretto" or "direct")
    expect(screen.getByText(/diretto|direct/i)).toBeInTheDocument();
  });

  it('hides checkboxes when showCheckboxes is false', () => {
    render(
      <InvitesTable
        invites={mockInvites}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
        showCheckboxes={false}
      />,
    );

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('highlights selected rows', () => {
    const { container } = render(
      <InvitesTable
        invites={mockInvites}
        selectedIds={new Set(['inv-1'])}
        onSelectionChange={vi.fn()}
      />,
    );

    // Selected row should have indigo background
    const selectedRow = container.querySelector('.bg-indigo-50');
    expect(selectedRow).toBeInTheDocument();
  });
});
