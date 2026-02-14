import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { logLocaleCreate } from "@/lib/locale/locale-audit-service";
import { localeConfigService } from "@/lib/locale/locale-config-service";

/**
 * GET /api/admin/locales
 * Get all locale configurations
 */

export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/admin/locales"),
  withAdmin,
)(async (_ctx) => {
  const locales = await prisma.localeConfig.findMany({
    orderBy: { countryName: "asc" },
  });

  return NextResponse.json({ locales });
});
/**
 * POST /api/admin/locales
 * Create a new locale configuration
 */
export const POST = pipe(
  withSentry("/api/admin/locales"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body = await ctx.req.json();

  // Validate required fields
  if (
    !body.id ||
    !body.countryName ||
    !body.primaryLocale ||
    !body.primaryLanguageMaestroId
  ) {
    return NextResponse.json(
      {
        error:
          "id, countryName, primaryLocale, and primaryLanguageMaestroId are required",
      },
      { status: 400 },
    );
  }

  // Check if country code already exists
  const existing = await prisma.localeConfig.findUnique({
    where: { id: body.id },
  });

  if (existing) {
    return NextResponse.json(
      {
        error: "A locale configuration with this country code already exists",
      },
      { status: 409 },
    );
  }

  // Create locale configuration
  const locale = await prisma.localeConfig.create({
    data: {
      id: body.id,
      countryName: body.countryName,
      primaryLocale: body.primaryLocale,
      primaryLanguageMaestroId: body.primaryLanguageMaestroId,
      secondaryLocales: body.secondaryLocales || [],
      enabled: body.enabled ?? true,
    },
  });

  // Log the audit event
  await logLocaleCreate(
    locale.id,
    ctx.userId || "unknown",
    {
      id: locale.id,
      countryName: locale.countryName,
      primaryLocale: locale.primaryLocale,
      primaryLanguageMaestroId: locale.primaryLanguageMaestroId,
      secondaryLocales: locale.secondaryLocales,
      enabled: locale.enabled,
    },
    "Locale configuration created via API",
  );

  // Invalidate cache to reflect new locale immediately
  localeConfigService.invalidateCache();

  return NextResponse.json({ success: true, locale }, { status: 201 });
});
