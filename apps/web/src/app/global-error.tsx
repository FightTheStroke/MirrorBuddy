"use client";

/* eslint-disable @next/next/no-html-link-for-pages */

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

const messages: Record<string, { title: string; body: string; retry: string; home: string }> = {
  it: { title: "Errore Critico", body: "Si è verificato un errore imprevisto. Il nostro team è stato notificato automaticamente.", retry: "Riprova", home: "Torna alla Home" },
  en: { title: "Critical Error", body: "An unexpected error occurred. Our team has been automatically notified.", retry: "Retry", home: "Back to Home" },
  fr: { title: "Erreur Critique", body: "Une erreur inattendue s'est produite. Notre équipe a été automatiquement notifiée.", retry: "Réessayer", home: "Retour à l'accueil" },
  de: { title: "Kritischer Fehler", body: "Ein unerwarteter Fehler ist aufgetreten. Unser Team wurde automatisch benachrichtigt.", retry: "Erneut versuchen", home: "Zurück zur Startseite" },
  es: { title: "Error Crítico", body: "Se ha producido un error inesperado. Nuestro equipo ha sido notificado automáticamente.", retry: "Reintentar", home: "Volver al Inicio" },
};

function detectLocale(): string {
  if (typeof window === "undefined") return "it";
  const path = window.location.pathname;
  const match = path.match(/^\/(it|en|fr|de|es)(\/|$)/);
  if (match) return match[1];
  const cookieMatch = document.cookie.match(/NEXT_LOCALE=(\w{2})/);
  if (cookieMatch && messages[cookieMatch[1]]) return cookieMatch[1];
  return "it";
}

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const locale = detectLocale();
  const t = messages[locale] ?? messages.it;

  useEffect(() => {
    Sentry.captureException(error, {
      tags: { errorType: "global-error", digest: error.digest },
      level: "fatal",
    });
  }, [error]);

  return (
    <html lang={locale}>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md text-center" role="alert" aria-live="assertive">
            <h1 className="mb-4 text-4xl font-bold text-red-600">
              {t.title}
            </h1>
            <p className="mb-6 text-gray-600">{t.body}</p>
            {process.env.NODE_ENV !== "production" && (
              <pre className="mb-6 max-w-full overflow-auto rounded bg-gray-100 p-4 text-left text-xs text-gray-800">
                {error.message}
                {error.digest && `\nDigest: ${error.digest}`}
              </pre>
            )}
            <div className="space-x-4">
              <button
                onClick={reset}
                className="rounded bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
              >
                {t.retry}
              </button>
              <a
                href="/"
                className="inline-block rounded border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-100"
              >
                {t.home}
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
