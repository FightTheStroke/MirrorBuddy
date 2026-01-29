import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const stats = await db.researchSimulation.groupBy({
      by: ['maestroId'],
      _avg: {
        scaffoldingScore: true,
        hintingQuality: true,
        misconceptionHandling: true,
        engagementRetained: true
      },
      _count: true
    });

    return NextResponse.json({ stats });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch research stats" }, { status: 500 });
  }
}
