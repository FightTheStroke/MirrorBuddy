import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { getMaestroById } from "@/data/maestri";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ maestroId: string }> },
) {
  const auth = await validateAdminAuth();
  if (!auth.authenticated || !auth.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { maestroId } = await params;
  const maestro = getMaestroById(maestroId);

  if (!maestro) {
    return NextResponse.json({ error: "Maestro not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: maestro.id,
    displayName: maestro.displayName,
    subject: maestro.subject,
    tools: maestro.tools,
    systemPrompt: maestro.systemPrompt,
  });
}
