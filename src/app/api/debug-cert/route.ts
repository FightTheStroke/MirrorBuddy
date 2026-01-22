import { NextResponse } from "next/server";

export async function GET() {
  const cert = process.env.SUPABASE_CA_CERT;

  if (!cert) {
    return NextResponse.json({ error: "SUPABASE_CA_CERT not set" });
  }

  return NextResponse.json({
    length: cert.length,
    firstChars: cert.substring(0, 50),
    hasBackslashN: cert.includes("\\n"),
    hasRealNewline: cert.includes("\n"),
    matchCount: (cert.match(/\\n/g) || []).length,
  });
}
