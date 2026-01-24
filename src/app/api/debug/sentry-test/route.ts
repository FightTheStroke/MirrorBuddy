// Endpoint di test per verificare che Sentry funzioni
// Genera un errore intenzionale per testare l'integrazione
// DA RIMUOVERE dopo aver verificato che Sentry funziona

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  // Cattura un messaggio di test
  Sentry.captureMessage("Sentry test message - manual verification", "info");

  // Genera un errore intenzionale
  const testError = new Error("Sentry test error - manual verification");
  Sentry.captureException(testError);

  return NextResponse.json({
    success: true,
    message: "Test error sent to Sentry. Check your Sentry dashboard.",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    sentryEnabled: process.env.NODE_ENV === "production",
  });
}

export async function POST() {
  // Questo genera un errore non catturato - dovrebbe apparire automaticamente in Sentry
  throw new Error("Sentry uncaught test error - automatic capture");
}
