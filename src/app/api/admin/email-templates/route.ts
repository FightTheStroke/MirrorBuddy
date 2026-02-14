/**
 * GET /api/admin/email-templates
 * POST /api/admin/email-templates
 *
 * Admin endpoints for managing email templates.
 * Requires admin authentication and CSRF protection (mutations only).
 *
 * Reference: ADR 0113 (Composable API Handler Pattern)
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { listTemplates, createTemplate } from "@/lib/email/template-service";
import { logAdminAction, getClientIp } from "@/lib/admin/audit-service";

/**
 * GET /api/admin/email-templates
 * List all email templates with optional category filter
 */

export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/admin/email-templates"),
  withAdmin,
)(async (ctx) => {
  try {
    const { searchParams } = new URL(ctx.req.url);
    const category = searchParams.get("category");

    const filters = category ? { category } : undefined;
    const templates = await listTemplates(filters);

    return NextResponse.json({ templates });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to list email templates: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
});

/**
 * POST /api/admin/email-templates
 * Create a new email template
 */
export const POST = pipe(
  withSentry("/api/admin/email-templates"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  // Parse request body
  let body: {
    name?: string;
    subject?: string;
    htmlBody?: string;
    textBody?: string;
    category?: string;
    variables?: string[];
    isActive?: boolean;
  };

  try {
    body = await ctx.req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 },
    );
  }

  // Validate required fields
  if (
    !body.name ||
    !body.subject ||
    !body.htmlBody ||
    !body.textBody ||
    !body.category
  ) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: name, subject, htmlBody, textBody, category are required",
      },
      { status: 400 },
    );
  }

  // Variables default to empty array if not provided
  const variables = body.variables || [];

  try {
    // Create template
    const template = await createTemplate({
      name: body.name,
      subject: body.subject,
      htmlBody: body.htmlBody,
      textBody: body.textBody,
      category: body.category,
      variables,
      isActive: body.isActive,
    });

    // Log admin action
    if (ctx.userId) {
      await logAdminAction({
        action: "CREATE_EMAIL_TEMPLATE",
        entityType: "EmailTemplate",
        entityId: template.id,
        adminId: ctx.userId,
        details: { name: template.name, category: template.category },
        ipAddress: getClientIp(ctx.req),
      });
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to create email template: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
});
