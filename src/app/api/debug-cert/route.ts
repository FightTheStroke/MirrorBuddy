import { NextResponse } from "next/server";
import { pipe, withSentry } from "@/lib/api/middlewares";

export const GET = pipe(withSentry("/api/debug-cert"))(async () => {
  const cert = process.env.SUPABASE_CA_CERT;

  if (!cert) {
    return NextResponse.json({ error: "SUPABASE_CA_CERT not set" });
  }

  return NextResponse.json({
    length: cert.length,
    firstChars: cert.substring(0, 50),
    lastChars: cert.substring(cert.length - 50),
    hasBegin: cert.includes("-----BEGIN CERTIFICATE-----"),
    hasEnd: cert.includes("-----END CERTIFICATE-----"),
    hasBackslashN: cert.includes("\\n"),
    hasRealNewline: cert.includes("\n"),
    matchCount: (cert.match(/\\n/g) || []).length,
  });
});
