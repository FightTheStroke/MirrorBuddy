/**
 * Unit tests for WaitlistForm component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WaitlistForm } from '../waitlist-form';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'it',
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('WaitlistForm', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('renders email field with required label', () => {
    render(<WaitlistForm />);
    expect(screen.getByLabelText(/emailLabel/i)).toBeInTheDocument();
  });

  it('renders name field (optional)', () => {
    render(<WaitlistForm />);
    expect(screen.getByLabelText(/nameLabel/i)).toBeInTheDocument();
  });

  it('renders GDPR consent checkbox', () => {
    render(<WaitlistForm />);
    const gdprCheckbox = screen.getByRole('checkbox', { name: /gdprConsent/i });
    expect(gdprCheckbox).toBeInTheDocument();
  });

  it('renders marketing opt-in checkbox', () => {
    render(<WaitlistForm />);
    const marketingCheckbox = screen.getByRole('checkbox', { name: /marketingConsent/i });
    expect(marketingCheckbox).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<WaitlistForm />);
    expect(screen.getByRole('button', { name: /submitButton/i })).toBeInTheDocument();
  });

  it('shows error when submitting without email', async () => {
    render(<WaitlistForm />);
    fireEvent.click(screen.getByRole('button', { name: /submitButton/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('shows error when submitting without GDPR consent', async () => {
    render(<WaitlistForm />);
    fireEvent.change(screen.getByLabelText(/emailLabel/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submitButton/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('submits with correct JSON body including locale and gdprConsentVersion', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'ok' }),
    });

    render(<WaitlistForm />);
    fireEvent.change(screen.getByLabelText(/emailLabel/i), {
      target: { value: 'user@example.com' },
    });
    const gdpr = screen.getByRole('checkbox', { name: /gdprConsent/i });
    fireEvent.click(gdpr);

    fireEvent.click(screen.getByRole('button', { name: /submitButton/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/waitlist/signup',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.email).toBe('user@example.com');
      expect(body.locale).toBe('it');
      expect(body.gdprConsentVersion).toBe('1.0');
    });
  });

  it('shows success message after successful submission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'ok' }),
    });

    render(<WaitlistForm />);
    fireEvent.change(screen.getByLabelText(/emailLabel/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /gdprConsent/i }));
    fireEvent.click(screen.getByRole('button', { name: /submitButton/i }));

    await waitFor(() => {
      expect(screen.getByText(/successTitle/i)).toBeInTheDocument();
    });
  });

  it('shows duplicate error on 409', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'duplicate' }),
    });

    render(<WaitlistForm />);
    fireEvent.change(screen.getByLabelText(/emailLabel/i), {
      target: { value: 'existing@example.com' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /gdprConsent/i }));
    fireEvent.click(screen.getByRole('button', { name: /submitButton/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('shows rate limit error on 429', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: 'rate limit' }),
    });

    render(<WaitlistForm />);
    fireEvent.change(screen.getByLabelText(/emailLabel/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /gdprConsent/i }));
    fireEvent.click(screen.getByRole('button', { name: /submitButton/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('has privacy link on GDPR consent label', () => {
    render(<WaitlistForm />);
    const privacyLink = screen.getByRole('link', { name: /privacy/i });
    expect(privacyLink).toHaveAttribute('href', '/privacy');
  });

  it('has aria-live region for error announcements', () => {
    render(<WaitlistForm />);
    const liveRegion = document.querySelector('[aria-live]');
    expect(liveRegion).toBeInTheDocument();
  });
});
