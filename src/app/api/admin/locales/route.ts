import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { logLocaleCreate } from "@/lib/locale/locale-audit-service";
import { localeConfigService } from "@/lib/locale/locale-config-service";

/**
 * GET /api/admin/locales
 * Get all locale configurations
 */
export async function GET(_request: NextRequest) {
  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const locales = await prisma.localeConfig.findMany({
      orderBy: { countryName: "asc" },
    });

    return NextResponse.json({ locales });
  } catch (error) {
    logger.error("Error fetching locales", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to fetch locales" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/locales
 * Create a new locale configuration
 */
export async function POST(request: NextRequest) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

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
      auth.userId || "unknown",
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
  } catch (error) {
    logger.error("Error creating locale", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to create locale configuration" },
      { status: 500 },
    );
  }
}
