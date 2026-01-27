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
 * NOTE: Uses hardcoded strings because i18n may not be available during errors.
 */

/* eslint-disable local-rules/no-hardcoded-italian */

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
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

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h2 className="mb-4 text-2xl font-bold text-red-600">
          Qualcosa è andato storto
        </h2>
        <p className="mb-6 text-gray-600">
          Si è verificato un errore durante il caricamento della pagina. Puoi
          riprovare o tornare alla pagina precedente.
        </p>
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
            Riprova
          </button>
          <button
            onClick={() => window.history.back()}
            className="rounded border border-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-100"
          >
            Torna indietro
          </button>
        </div>
      </div>
    </div>
  );
}
