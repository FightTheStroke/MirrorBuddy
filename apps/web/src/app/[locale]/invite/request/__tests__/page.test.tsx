/**
 * InviteRequestPage — guardian declaration checkbox tests
 * @vitest-environment jsdom
 *
 * COMP-01 (#431): verifies that the submit button is gated behind the
 * guardian self-declaration checkbox, and that guardianDeclared:true is
 * included in the POST body when the form is submitted.
 *
 * AAA: Arrange → Act → Assert. One behavior per test.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InviteRequestPage from '../page';
import { getTranslation, getTranslationRegex } from '@/test/i18n-helpers';

// Bypass the GrownUpGate so the PII form is rendered immediately
vi.mock('@/lib/safety', () => ({
  isGrownUpVerified: () => true,
}));

// Mock GrownUpGate component (safety) — not under test here
vi.mock('@/components/safety/grown-up-gate', () => ({
  GrownUpGate: () => null,
}));

// Mock csrfFetch — capture calls
const mockCsrfFetch = vi.fn();
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return { ...actual, csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args) };
});

// Mock client logger
vi.mock('@/lib/logger/client', () => ({
  clientLogger: { error: vi.fn() },
}));

describe('InviteRequestPage — guardian declaration (COMP-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the guardian-declaration checkbox', () => {
    // Arrange & Act
    render(<InviteRequestPage />);

    // Assert
    expect(
      screen.getByRole('checkbox', {
        name: getTranslationRegex('auth.invite.guardianDeclarationLabel'),
      }),
    ).toBeInTheDocument();
  });

  it('submit button is disabled when guardian checkbox is unchecked', () => {
    // Arrange
    render(<InviteRequestPage />);

    // Act — checkbox starts unchecked
    const submitBtn = screen.getByRole('button', {
      name: getTranslationRegex('auth.invite.submitButtonText'),
    });

    // Assert
    expect(submitBtn).toBeDisabled();
  });

  it('submit button becomes enabled only after checkbox is checked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<InviteRequestPage />);
    const checkbox = screen.getByRole('checkbox', {
      name: getTranslationRegex('auth.invite.guardianDeclarationLabel'),
    });
    const submitBtn = screen.getByRole('button', {
      name: getTranslationRegex('auth.invite.submitButtonText'),
    });

    // Act
    await user.click(checkbox);

    // Assert
    expect(submitBtn).not.toBeDisabled();
  });

  it('includes guardianDeclared:true in POST body when checkbox is checked and form is submitted', async () => {
    // Arrange
    const user = userEvent.setup();
    mockCsrfFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });
    render(<InviteRequestPage />);

    await user.type(
      screen.getByLabelText(getTranslationRegex('auth.invite.nameLabel')),
      'Test Guardian',
    );
    await user.type(
      screen.getByLabelText(getTranslationRegex('auth.invite.emailLabel')),
      'guardian@example.com',
    );
    await user.type(
      screen.getByLabelText(getTranslationRegex('auth.invite.motivationLabel')),
      getTranslation('auth.invite.motivationPlaceholder'),
    );
    await user.click(
      screen.getByRole('checkbox', {
        name: getTranslationRegex('auth.invite.guardianDeclarationLabel'),
      }),
    );

    // Act
    await user.click(
      screen.getByRole('button', { name: getTranslationRegex('auth.invite.submitButtonText') }),
    );

    // Assert
    await waitFor(() => expect(mockCsrfFetch).toHaveBeenCalledTimes(1));
    const [, options] = mockCsrfFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.guardianDeclared).toBe(true);
  });

  it('does NOT call csrfFetch when checkbox is unchecked (button is disabled)', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<InviteRequestPage />);

    await user.type(
      screen.getByLabelText(getTranslationRegex('auth.invite.nameLabel')),
      'Test Guardian',
    );
    await user.type(
      screen.getByLabelText(getTranslationRegex('auth.invite.emailLabel')),
      'guardian@example.com',
    );
    await user.type(
      screen.getByLabelText(getTranslationRegex('auth.invite.motivationLabel')),
      getTranslation('auth.invite.motivationPlaceholder'),
    );
    // checkbox intentionally left unchecked

    // Act — button is disabled; userEvent does not click disabled elements
    const submitBtn = screen.getByRole('button', {
      name: getTranslationRegex('auth.invite.submitButtonText'),
    });
    expect(submitBtn).toBeDisabled();
    await user.click(submitBtn);

    // Assert
    expect(mockCsrfFetch).not.toHaveBeenCalled();
  });
});
