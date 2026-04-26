import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTranslation, getTranslationRegex } from '@/test/i18n-helpers';
import ErrorPage from './error';

describe('Error Component', () => {
  const mockReset = vi.fn();
  const mockError = Object.assign(new globalThis.Error('Test error message'), {
    digest: undefined,
  }) as globalThis.Error & { digest?: string };

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).history;
    window.history = { back: vi.fn() } as any;
  });

  describe('Multi-language support', () => {
    it('should display English text when navigator.language is "en"', () => {
      Object.defineProperty(window.navigator, 'language', {
        value: 'en',
        configurable: true,
      });

      render(<ErrorPage error={mockError} reset={mockReset} />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/An error occurred while loading the page/i)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Go Back')).toBeInTheDocument();
    });

    it('should display Italian text when navigator.language is "it"', () => {
      Object.defineProperty(window.navigator, 'language', {
        value: 'it',
        configurable: true,
      });

      render(<ErrorPage error={mockError} reset={mockReset} />);

      expect(screen.getByText(getTranslation('errors.errorPage.title'))).toBeInTheDocument();
      expect(screen.getByText(getTranslationRegex('errors.errorPage.message'))).toBeInTheDocument();
      expect(screen.getByText(getTranslation('errors.errorPage.retryButton'))).toBeInTheDocument();
      expect(screen.getByText(getTranslation('errors.errorPage.backButton'))).toBeInTheDocument();
    });

    it('should display French text when navigator.language is "fr"', () => {
      Object.defineProperty(window.navigator, 'language', {
        value: 'fr',
        configurable: true,
      });

      render(<ErrorPage error={mockError} reset={mockReset} />);

      expect(
        screen.getByText(getTranslation('errors.errorPage.title', undefined, 'fr')),
      ).toBeInTheDocument();
      expect(screen.getByText(/Une erreur s'est produite lors du chargement/i)).toBeInTheDocument();
      expect(
        screen.getByText(getTranslation('errors.errorPage.retryButton', undefined, 'fr')),
      ).toBeInTheDocument();
      expect(screen.getByText('Retour')).toBeInTheDocument();
    });

    it('should display German text when navigator.language is "de"', () => {
      Object.defineProperty(window.navigator, 'language', {
        value: 'de',
        configurable: true,
      });

      render(<ErrorPage error={mockError} reset={mockReset} />);

      expect(screen.getByText('Etwas ist schief gelaufen')).toBeInTheDocument();
      expect(
        screen.getByText(/Beim Laden der Seite ist ein Fehler aufgetreten/i),
      ).toBeInTheDocument();
      expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
      expect(screen.getByText('Zurück')).toBeInTheDocument();
    });

    it('should display Spanish text when navigator.language is "es"', () => {
      Object.defineProperty(window.navigator, 'language', {
        value: 'es',
        configurable: true,
      });

      render(<ErrorPage error={mockError} reset={mockReset} />);

      expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
      expect(screen.getByText(/Ocurrió un error al cargar la página/i)).toBeInTheDocument();
      expect(screen.getByText('Intentar de nuevo')).toBeInTheDocument();
      expect(screen.getByText('Volver')).toBeInTheDocument();
    });

    it('should fallback to English for unsupported locale', () => {
      Object.defineProperty(window.navigator, 'language', {
        value: 'ja',
        configurable: true,
      });

      render(<ErrorPage error={mockError} reset={mockReset} />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/An error occurred while loading the page/i)).toBeInTheDocument();
    });

    it('should handle locale variants like "en-US" by extracting base locale', () => {
      Object.defineProperty(window.navigator, 'language', {
        value: 'en-US',
        configurable: true,
      });

      render(<ErrorPage error={mockError} reset={mockReset} />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should fallback to English if navigator.language is undefined', () => {
      Object.defineProperty(window.navigator, 'language', {
        value: undefined,
        configurable: true,
      });

      render(<ErrorPage error={mockError} reset={mockReset} />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Error boundary functionality', () => {
    it('should call reset function when Try Again button is clicked', async () => {
      const user = userEvent.setup();
      render(<ErrorPage error={mockError} reset={mockReset} />);

      const retryButton = screen.getByRole('button', {
        // eslint-disable-next-line security/detect-non-literal-regexp -- safe: controlled test string from i18n helper
        name: new RegExp(`try again|${getTranslation('errors.errorPage.retryButton')}`, 'i'),
      });
      await user.click(retryButton);

      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    it('should call window.history.back when Go Back button is clicked', async () => {
      const user = userEvent.setup();
      render(<ErrorPage error={mockError} reset={mockReset} />);

      const backButton = screen.getByRole('button', {
        // eslint-disable-next-line security/detect-non-literal-regexp -- safe: controlled test string from i18n helper
        name: new RegExp(`go back|${getTranslation('errors.errorPage.backButton')}`, 'i'),
      });
      await user.click(backButton);

      expect(window.history.back).toHaveBeenCalledTimes(1);
    });

    it('should display error message in development mode', () => {
      vi.stubEnv('NODE_ENV', 'development');

      render(<ErrorPage error={mockError} reset={mockReset} />);

      expect(screen.getByText('Test error message')).toBeInTheDocument();

      vi.unstubAllEnvs();
    });

    it('should display error digest if provided', () => {
      vi.stubEnv('NODE_ENV', 'development');
      const errorWithDigest = Object.assign(new Error('Test error'), {
        digest: 'abc123',
      });

      render(<ErrorPage error={errorWithDigest} reset={mockReset} />);

      expect(screen.getByText(/Digest: abc123/)).toBeInTheDocument();

      vi.unstubAllEnvs();
    });
  });
});
