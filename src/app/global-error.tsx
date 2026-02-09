"use client";

/**
 * Global Error Handler for Next.js App Router
 *
 * This component catches errors that occur in the root layout.
 * It must include its own <html> and <body> tags because it replaces
 * the entire root layout when an error occurs.
 *
 * CRITICAL: This file sends errors to Sentry for monitoring.
 *
 * NOTE: This file intentionally uses hardcoded strings and native HTML elements
 * because during a critical error, i18n and Next.js components may not be available.
 */

 
/* eslint-disable @next/next/no-html-link-for-pages */

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const t = useTranslations("errors");
  useEffect(() => {
    // Report error to Sentry
    Sentry.captureException(error, {
      tags: {
        errorType: "global-error",
        digest: error.digest,
      },
      level: "fatal",
    });
  }, [error]);

  return (
    <html lang="it">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md text-center">
            <h1 className="mb-4 text-4xl font-bold text-red-600">
              {t("erroreCritico")}
            </h1>
            <p className="mb-6 text-gray-600">
              {t("siEVerificatoUnErroreImprevistoIlNostroTeamEStato")}
              {t("notificatoAutomaticamente")}
            </p>
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
                {t("riprova")}
              </button>
              <a
                href="/"
                className="inline-block rounded border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-100"
              >
                {t("tornaAllaHome")}
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
