// Sentry tunnel route to bypass ad-blockers (ADR 0070)
// Manually created because tunnelRoute in next.config.ts doesn't work on Vercel
// See: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#configure-tunneling-to-avoid-ad-blockers

import { NextRequest, NextResponse } from "next/server";

// Extract allowed project ID from the public DSN (already exposed in client bundle)
function getAllowedProjectId(): string | null {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    return url.pathname.replace("/", "");
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const envelope = await request.text();
    const pieces = envelope.split("\n");

    // Parse the envelope header to get DSN info
    const header = JSON.parse(pieces[0]);
    const dsn = new URL(header.dsn);
    const projectId = dsn.pathname.replace("/", "");

    // Validate project ID to prevent abuse (must match configured DSN)
    const allowedProjectId = getAllowedProjectId();
    if (!allowedProjectId || projectId !== allowedProjectId) {
      return NextResponse.json({ error: "Invalid project" }, { status: 403 });
    }

    // Validate host to prevent SSRF — must match configured DSN host
    const allowedDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    const allowedHost = allowedDsn ? new URL(allowedDsn).host : null;
    if (!allowedHost || dsn.host !== allowedHost) {
      return NextResponse.json({ error: "Invalid DSN" }, { status: 403 });
    }

    // Forward to Sentry
    const sentryUrl = `https://${dsn.host}/api/${projectId}/envelope/`;
    const response = await fetch(sentryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
      },
      body: envelope,
    });

    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch {
    // Silently fail - don't break the app if Sentry is down
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}

// Also handle GET for health checks
export async function GET() {
  return NextResponse.json({ status: "ok", tunnel: "sentry" });
}
