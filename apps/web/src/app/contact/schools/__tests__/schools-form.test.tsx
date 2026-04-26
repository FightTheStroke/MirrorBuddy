/**
 * Unit tests for Schools Contact Form
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SchoolsContactForm } from '../schools-form';
import { getTranslationRegex } from '@/test/i18n-helpers';

// Mock csrfFetch
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return { ...actual, csrfFetch: vi.fn() };
});

// Mock next-intl - return the key if translation not found
const mockTranslations: Record<string, string> = {
  title: 'Contattaci - Scuole',
  nameLabel: 'Nome',
  emailLabel: 'Email',
  roleLabel: 'Ruolo',
  schoolNameLabel: 'Nome Scuola',
  schoolTypeLabel: 'Tipo Scuola',
  studentCountLabel: 'Numero Studenti',
  specificNeedsLabel: 'Esigenze Specifiche',
  messagePlaceholder: 'Messaggio',
  submitButtonDefault: 'Invia Richiesta',
  submitButtonLoading: 'Invio in corso...',
  successTitle: 'Richiesta Inviata',
  successMessage: 'La tua richiesta è stata inviata con successo.',
  errorMessage: "Errore durante l'invio",
  errorDefault: "Errore durante l'invio",
  errorConnection: 'Errore di connessione',
  solutions: 'Soluzioni',
  'features.curriculum': 'Personalizzazione curricolare e didattica innovativa',
  'features.management': 'Gestione classi e monitoraggio progressi',
  'features.reporting': 'Reportistica dettagliata per docenti',
  'features.support': 'Supporto tecnico dedicato',
  'options.roles.dirigente': 'Dirigente Scolastico',
  'options.roles.docente': 'Docente',
  'options.roles.segreteria': 'Segreteria',
  'options.roles.altro': 'Altro',
  'options.schoolTypes.primaria': 'Primaria',
  'options.schoolTypes.secondariaI': 'Secondaria I Grado',
  'options.schoolTypes.secondariaII': 'Secondaria II Grado',
  'options.schoolTypes.universita': 'Università',
  'options.studentCounts.lessThan100': 'Meno di 100',
  'options.studentCounts.100to500': '100-500',
  'options.studentCounts.500to1000': '500-1000',
  'options.studentCounts.moreThan1000': 'Più di 1000',
};

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => mockTranslations[key] || key,
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useLocale: () => 'it',
  useMessages: () => ({}),
}));

import { csrfFetch } from '@/lib/auth';

const mockCsrfFetch = csrfFetch as any;

describe('SchoolsContactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('renders all required form fields', () => {
      render(<SchoolsContactForm />);

      expect(screen.getByLabelText(/^nome$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/ruolo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/nome scuola/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tipo scuola/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/numero studenti/i)).toBeInTheDocument();
    });

    it('renders optional fields', () => {
      render(<SchoolsContactForm />);

      expect(screen.getByLabelText(/esigenze specifiche/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/messaggio/i)).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<SchoolsContactForm />);

      expect(
        screen.getByRole('button', {
          name: getTranslationRegex('compliance.contact.schools_form.submitButtonDefault'),
        }),
      ).toBeInTheDocument();
    });

    it('renders intro text about school customization', () => {
      render(<SchoolsContactForm />);

      expect(screen.getByText(/personalizzazione curricolare/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('does not submit when required fields are empty', async () => {
      const user = userEvent.setup();
      render(<SchoolsContactForm />);

      const submitButton = screen.getByRole('button', {
        name: getTranslationRegex('compliance.contact.schools_form.submitButtonDefault'),
      });
      await user.click(submitButton);

      expect(mockCsrfFetch).not.toHaveBeenCalled();
    });

    it('displays error when email is invalid', async () => {
      const user = userEvent.setup();
      render(<SchoolsContactForm />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      await user.type(emailInput, 'invalid-email');
      await user.click(
        screen.getByRole('button', {
          name: getTranslationRegex('compliance.contact.schools_form.submitButtonDefault'),
        }),
      );

      await waitFor(() => {
        expect(mockCsrfFetch).not.toHaveBeenCalled();
      });
    });

    it('enables submit button when all required fields are filled', async () => {
      const user = userEvent.setup();
      render(<SchoolsContactForm />);

      await user.type(screen.getByLabelText(/^nome$/i), 'Mario Rossi');
      await user.type(screen.getByLabelText(/email/i), 'mario@example.com');
      await user.selectOptions(screen.getByLabelText(/ruolo/i), 'docente');
      await user.type(screen.getByLabelText(/nome scuola/i), 'Scuola XYZ');
      await user.selectOptions(screen.getByLabelText(/tipo scuola/i), 'secondaria-i');
      await user.selectOptions(screen.getByLabelText(/numero studenti/i), '500-1000');

      const submitButton = screen.getByRole('button', {
        name: getTranslationRegex('compliance.contact.schools_form.submitButtonDefault'),
      });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Form Submission', () => {
    it('submits form with correct data structure', async () => {
      const user = userEvent.setup();
      mockCsrfFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<SchoolsContactForm />);

      await user.type(screen.getByLabelText(/^nome$/i), 'Mario Rossi');
      await user.type(screen.getByLabelText(/email/i), 'mario@example.com');
      await user.selectOptions(screen.getByLabelText(/ruolo/i), 'docente');
      await user.type(screen.getByLabelText(/nome scuola/i), 'Scuola XYZ');
      await user.selectOptions(screen.getByLabelText(/tipo scuola/i), 'secondaria-i');
      await user.selectOptions(screen.getByLabelText(/numero studenti/i), '500-1000');
      await user.type(screen.getByLabelText(/esigenze specifiche/i), 'Abbiamo studenti con DSA');

      await user.click(
        screen.getByRole('button', {
          name: getTranslationRegex('compliance.contact.schools_form.submitButtonDefault'),
        }),
      );

      await waitFor(() => {
        expect(mockCsrfFetch).toHaveBeenCalledWith('/api/contact', {
          method: 'POST',
          body: expect.stringContaining('type'),
        });
      });

      const callBody = JSON.parse((mockCsrfFetch.mock.calls[0]?.[1]?.body as string) || '{}');
      expect(callBody).toEqual(
        expect.objectContaining({
          type: 'schools',
          name: 'Mario Rossi',
          email: 'mario@example.com',
          role: 'docente',
          schoolName: 'Scuola XYZ',
          schoolType: 'secondaria-i',
          studentCount: '500-1000',
          specificNeeds: 'Abbiamo studenti con DSA',
        }),
      );
    });

    it('shows success message after successful submission', async () => {
      const user = userEvent.setup();
      mockCsrfFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<SchoolsContactForm />);

      await user.type(screen.getByLabelText(/^nome$/i), 'Mario Rossi');
      await user.type(screen.getByLabelText(/email/i), 'mario@example.com');
      await user.selectOptions(screen.getByLabelText(/ruolo/i), 'docente');
      await user.type(screen.getByLabelText(/nome scuola/i), 'Scuola XYZ');
      await user.selectOptions(screen.getByLabelText(/tipo scuola/i), 'secondaria-i');
      await user.selectOptions(screen.getByLabelText(/numero studenti/i), '500-1000');

      await user.click(
        screen.getByRole('button', {
          name: getTranslationRegex('compliance.contact.schools_form.submitButtonDefault'),
        }),
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /richiesta inviata/i })).toBeInTheDocument();
      });
    });

    it('shows error message on submission failure', async () => {
      const user = userEvent.setup();
      mockCsrfFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, message: 'Server error' }),
      });

      render(<SchoolsContactForm />);

      await user.type(screen.getByLabelText(/^nome$/i), 'Mario Rossi');
      await user.type(screen.getByLabelText(/email/i), 'mario@example.com');
      await user.selectOptions(screen.getByLabelText(/ruolo/i), 'docente');
      await user.type(screen.getByLabelText(/nome scuola/i), 'Scuola XYZ');
      await user.selectOptions(screen.getByLabelText(/tipo scuola/i), 'secondaria-i');
      await user.selectOptions(screen.getByLabelText(/numero studenti/i), '500-1000');

      await user.click(
        screen.getByRole('button', {
          name: getTranslationRegex('compliance.contact.schools_form.submitButtonDefault'),
        }),
      );

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Select Options', () => {
    it('renders correct role options', async () => {
      render(<SchoolsContactForm />);

      const roleSelect = screen.getByLabelText(/ruolo/i) as HTMLSelectElement;
      const options = Array.from(roleSelect.options).map((o) => o.value);

      expect(options).toContain('dirigente');
      expect(options).toContain('docente');
      expect(options).toContain('segreteria');
      expect(options).toContain('altro');
    });

    it('renders correct school type options', async () => {
      render(<SchoolsContactForm />);

      const typeSelect = screen.getByLabelText(/tipo scuola/i) as HTMLSelectElement;
      const options = Array.from(typeSelect.options).map((o) => o.value);

      expect(options).toContain('primaria');
      expect(options).toContain('secondaria-i');
      expect(options).toContain('secondaria-ii');
      expect(options).toContain('università');
    });

    it('renders correct student count options', async () => {
      render(<SchoolsContactForm />);

      const countSelect = screen.getByLabelText(/numero studenti/i) as HTMLSelectElement;
      const options = Array.from(countSelect.options).map((o) => o.value);

      expect(options).toContain('100');
      expect(options).toContain('100-500');
      expect(options).toContain('500-1000');
      expect(options).toContain('1000+');
    });
  });
});
