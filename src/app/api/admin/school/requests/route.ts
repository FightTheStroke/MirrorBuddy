/**
 * School registration requests API
 * Returns ContactRequests with type="schools" for admin review
 */

import { NextResponse } from "next/server";
import { pipe, withSentry } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";

const handler = pipe(withSentry("/api/admin/school/requests"))(async () => {
  const requests = await prisma.contactRequest.findMany({
    where: { type: "schools" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ requests });
});

export const GET = handler;
