"use client";

/**
 * Error Handler for Next.js App Router
 *
 * Catches errors in route segments and displays a recovery UI.
 * Reports errors to Sentry for monitoring.
 *
 * This file handles errors within the app layout - for root layout errors,
 * see global-error.tsx.
 *
 * NOTE: Uses inline translations because i18n provider may not be available
 * during error boundary rendering.
 */

import * as Sentry from "@sentry/nextjs";
import { useEffect, useMemo } from "react";

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
    title: "Something went wrong",
    message:
      "An error occurred while loading the page. You can try again or go back to the previous page.",
    retryButton: "Try Again",
    backButton: "Go Back",
  },
  it: {
    title: "Qualcosa è andato storto",
    message:
      "Si è verificato un errore durante il caricamento della pagina. Puoi riprovare o tornare alla pagina precedente.",
    retryButton: "Riprova",
    backButton: "Torna indietro",
  },
  fr: {
    title: "Quelque chose s'est mal passé",
    message:
      "Une erreur s'est produite lors du chargement de la page. Vous pouvez réessayer ou revenir à la page précédente.",
    retryButton: "Réessayer",
    backButton: "Retour",
  },
  de: {
    title: "Etwas ist schief gelaufen",
    message:
      "Beim Laden der Seite ist ein Fehler aufgetreten. Sie können es erneut versuchen oder zur vorherigen Seite zurückkehren.",
    retryButton: "Erneut versuchen",
    backButton: "Zurück",
  },
  es: {
    title: "Algo salió mal",
    message:
      "Ocurrió un error al cargar la página. Puedes intentarlo de nuevo o volver a la página anterior.",
    retryButton: "Intentar de nuevo",
    backButton: "Volver",
  },
};

function getLocale(): string {
  if (typeof window === "undefined") return "en";

  // Try navigator.language first
  const nav = navigator as Navigator & { userLanguage?: string };
  const navLang = navigator.language || nav.userLanguage || "en";
  const locale = navLang.slice(0, 2).toLowerCase();

  // Fallback to html lang attribute if navigator language not supported
  if (!translations[locale]) {
    const htmlLang = document.documentElement.lang || "en";
    const htmlLocale = htmlLang.slice(0, 2).toLowerCase();
    return translations[htmlLocale] ? htmlLocale : "en";
  }

  return locale;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Report error to Sentry with context
    Sentry.captureException(error, {
      tags: {
        errorType: "route-error",
        digest: error.digest,
      },
      level: "error",
    });
  }, [error]);

  const t = useMemo(() => {
    const locale = getLocale();
    return translations[locale] || translations.en;
  }, []);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h2 className="mb-4 text-2xl font-bold text-red-600">{t.title}</h2>
        <p className="mb-6 text-gray-600">{t.message}</p>
        {process.env.NODE_ENV !== "production" && (
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
          <button
            onClick={() => window.history.back()}
            className="rounded border border-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-100"
          >
            {t.backButton}
          </button>
        </div>
      </div>
    </div>
  );
}
