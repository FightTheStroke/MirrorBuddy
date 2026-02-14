import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import {
  logLocaleUpdate,
  logLocaleDelete,
} from "@/lib/locale/locale-audit-service";
import { localeConfigService } from "@/lib/locale/locale-config-service";

/**
 * GET /api/admin/locales/[id]
 * Get a single locale configuration by country code
 */

export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/admin/locales/:id"),
  withAdmin,
)(async (ctx) => {
  const { id } = await ctx.params;

  const locale = await prisma.localeConfig.findUnique({
    where: { id },
  });

  if (!locale) {
    return NextResponse.json(
      { error: "Locale configuration not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ locale });
});

/**
 * PUT /api/admin/locales/[id]
 * Update a locale configuration
 */
export const PUT = pipe(
  withSentry("/api/admin/locales/:id"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const userId = ctx.userId!;
  const { id } = await ctx.params;
  const body = await ctx.req.json();

  // Check if locale exists
  const existing = await prisma.localeConfig.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Locale configuration not found" },
      { status: 404 },
    );
  }

  // Prepare updated data
  const updatedData = {
    countryName: body.countryName ?? existing.countryName,
    primaryLocale: body.primaryLocale ?? existing.primaryLocale,
    primaryLanguageMaestroId:
      body.primaryLanguageMaestroId ?? existing.primaryLanguageMaestroId,
    secondaryLocales: body.secondaryLocales ?? existing.secondaryLocales,
    enabled: body.enabled ?? existing.enabled,
  };

  // Update locale configuration
  const locale = await prisma.localeConfig.update({
    where: { id },
    data: updatedData,
  });

  // Build change summary for audit
  const changes: Record<string, unknown> = {};
  if (
    body.countryName !== undefined &&
    body.countryName !== existing.countryName
  ) {
    changes.countryName = body.countryName;
  }
  if (
    body.primaryLocale !== undefined &&
    body.primaryLocale !== existing.primaryLocale
  ) {
    changes.primaryLocale = body.primaryLocale;
  }
  if (
    body.primaryLanguageMaestroId !== undefined &&
    body.primaryLanguageMaestroId !== existing.primaryLanguageMaestroId
  ) {
    changes.primaryLanguageMaestroId = body.primaryLanguageMaestroId;
  }
  if (body.secondaryLocales !== undefined) {
    const oldLocales = JSON.stringify(existing.secondaryLocales?.sort() || []);
    const newLocales = JSON.stringify((body.secondaryLocales || []).sort());
    if (oldLocales !== newLocales) {
      changes.secondaryLocales = body.secondaryLocales;
    }
  }
  if (body.enabled !== undefined && body.enabled !== existing.enabled) {
    changes.enabled = body.enabled;
  }

  // Log the audit event only if changes were made
  if (Object.keys(changes).length > 0) {
    await logLocaleUpdate(
      id,
      userId,
      {
        id: existing.id,
        countryName: existing.countryName,
        primaryLocale: existing.primaryLocale,
        primaryLanguageMaestroId: existing.primaryLanguageMaestroId,
        secondaryLocales: existing.secondaryLocales,
        enabled: existing.enabled,
      },
      {
        id: locale.id,
        countryName: locale.countryName,
        primaryLocale: locale.primaryLocale,
        primaryLanguageMaestroId: locale.primaryLanguageMaestroId,
        secondaryLocales: locale.secondaryLocales,
        enabled: locale.enabled,
      },
      `Updated fields: ${Object.keys(changes).join(", ")}`,
    );

    // Invalidate cache to reflect changes immediately
    localeConfigService.invalidateCache();
  }

  return NextResponse.json({ success: true, locale });
});

/**
 * DELETE /api/admin/locales/[id]
 * Delete a locale configuration
 */
export const DELETE = pipe(
  withSentry("/api/admin/locales/:id"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const userId = ctx.userId!;
  const { id } = await ctx.params;

  // Check if locale exists
  const existing = await prisma.localeConfig.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Locale configuration not found" },
      { status: 404 },
    );
  }

  // Delete locale configuration
  await prisma.localeConfig.delete({
    where: { id },
  });

  // Log the audit event
  await logLocaleDelete(
    id,
    userId,
    {
      id: existing.id,
      countryName: existing.countryName,
      primaryLocale: existing.primaryLocale,
      primaryLanguageMaestroId: existing.primaryLanguageMaestroId,
      secondaryLocales: existing.secondaryLocales,
      enabled: existing.enabled,
    },
    "Locale configuration deleted via API",
  );

  // Invalidate cache to reflect deletion immediately
  localeConfigService.invalidateCache();

  return NextResponse.json(
    { success: true, message: "Locale configuration deleted" },
    { status: 200 },
  );
});
