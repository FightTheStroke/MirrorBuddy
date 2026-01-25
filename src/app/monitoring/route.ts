// Sentry tunnel route to bypass ad-blockers (ADR 0070)
// Manually created because tunnelRoute in next.config.ts doesn't work on Vercel
// See: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#configure-tunneling-to-avoid-ad-blockers

import { NextRequest, NextResponse } from "next/server";

const SENTRY_PROJECT_IDS = [
  "4510764469321728", // mirrorbuddy project
];

export async function POST(request: NextRequest) {
  try {
    const envelope = await request.text();
    const pieces = envelope.split("\n");

    // Parse the envelope header to get DSN info
    const header = JSON.parse(pieces[0]);
    const dsn = new URL(header.dsn);
    const projectId = dsn.pathname.replace("/", "");

    // Validate project ID to prevent abuse
    if (!SENTRY_PROJECT_IDS.includes(projectId)) {
      return NextResponse.json({ error: "Invalid project" }, { status: 403 });
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
