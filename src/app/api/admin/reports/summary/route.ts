import { NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { buildReportContent } from "@/lib/admin/report-generator";
import { generatePDFFromContent } from "@/lib/pdf-generator/generate";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "admin-reports" });

export async function GET() {
  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const content = await buildReportContent();

    // Use ADHD profile for clean, distraction-free layout
    const { buffer, filename } = await generatePDFFromContent(
      content,
      "adhd",
      "A4",
    );

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8 = new Uint8Array(buffer);

    return new NextResponse(uint8, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(uint8.byteLength),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    log.error("Failed to generate admin report", { error: msg });
    return NextResponse.json(
      { error: `Failed to generate report: ${msg}` },
      { status: 500 },
    );
  }
}
