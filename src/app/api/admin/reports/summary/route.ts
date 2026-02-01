import { NextResponse } from "next/server";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";
import { buildReportContent } from "@/lib/admin/report-generator";
import { generatePDFFromContent } from "@/lib/pdf-generator/generate";

export const GET = pipe(
  withSentry("/api/admin/reports/summary"),
  withAdmin,
)(async () => {
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
});
