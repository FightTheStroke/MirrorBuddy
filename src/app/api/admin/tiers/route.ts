/**
 * Admin Tier CRUD API
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";


export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/admin/tiers"),
  withAdmin,
)(async (_ctx) => {
  const tiers = await prisma.tierDefinition.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ tiers });
});

export const POST = pipe(
  withSentry("/api/admin/tiers"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body = await ctx.req.json();
  const tier = await prisma.tierDefinition.create({
    data: {
      code: body.code,
      name: body.name,
      description: body.description,
      monthlyPriceEur: body.monthlyPriceEur,
      sortOrder: body.sortOrder || 0,
    },
  });
  return NextResponse.json({ tier });
});
