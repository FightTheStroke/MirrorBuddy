import { NextResponse } from "next/server";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";
import { getMaestroById } from "@/data/maestri";


export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/admin/knowledge/:maestroId"),
  withAdmin,
)(async (ctx) => {
  const { maestroId } = await ctx.params;
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
});
