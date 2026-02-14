'use client';

/**
 * Error boundary for maestro session pages.
 * Catches SSR/hydration errors with a contextual recovery UI.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect, useMemo } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

interface ErrorTranslations {
  title: string;
  message: string;
  retryButton: string;
  backButton: string;
}

const translations: Record<string, ErrorTranslations> = {
  en: {
    title: 'Session error',
    message:
      'An error occurred while loading the session. You can try again or go back to the maestri list.',
    retryButton: 'Try Again',
    backButton: 'All Maestri',
  },
  it: {
    title: 'Errore nella sessione',
    message:
      'Si è verificato un errore durante il caricamento della sessione. Puoi riprovare o tornare alla lista dei maestri.',
    retryButton: 'Riprova',
    backButton: 'Tutti i Maestri',
  },
  fr: {
    title: 'Erreur de session',
    message:
      "Une erreur s'est produite lors du chargement de la session. Vous pouvez réessayer ou revenir à la liste.",
    retryButton: 'Réessayer',
    backButton: 'Tous les Maestri',
  },
  de: {
    title: 'Sitzungsfehler',
    message:
      'Beim Laden der Sitzung ist ein Fehler aufgetreten. Sie können es erneut versuchen oder zur Liste zurückkehren.',
    retryButton: 'Erneut versuchen',
    backButton: 'Alle Maestri',
  },
  es: {
    title: 'Error de sesión',
    message:
      'Ocurrió un error al cargar la sesión. Puedes intentarlo de nuevo o volver a la lista.',
    retryButton: 'Intentar de nuevo',
    backButton: 'Todos los Maestri',
  },
};

function getLocale(): string {
  if (typeof window === 'undefined') return 'en';
  const pathLocale = window.location.pathname.split('/')[1];
  if (pathLocale && translations[pathLocale]) return pathLocale;
  const navLang = navigator.language?.slice(0, 2).toLowerCase();
  return translations[navLang] ? navLang : 'en';
}

export default function MaestroError({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        errorType: 'maestro-session-error',
        digest: error.digest,
      },
      level: 'error',
    });
  }, [error]);

  const locale = useMemo(() => getLocale(), []);
  const t = translations[locale] || translations.en;

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h2 className="mb-4 text-2xl font-bold text-red-600">{t.title}</h2>
        <p className="mb-6 text-gray-600">{t.message}</p>
        {process.env.NODE_ENV !== 'production' && (
          <pre className="mb-6 max-w-full overflow-auto rounded bg-gray-100 p-4 text-left text-xs text-gray-800">
            {error.message}
            {error.digest && `\nDigest: ${error.digest}`}
          </pre>
        )}
        <div className="flex justify-center gap-4">
          <button
            onClick={reset}
            className="rounded bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700"
          >
            {t.retryButton}
          </button>
          <a
            href={`/${locale}/maestri`}
            className="rounded border border-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-100"
          >
            {t.backButton}
          </a>
        </div>
      </div>
    </div>
  );
}
