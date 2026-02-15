/**
 * GET /api/admin/email-templates/[id]
 * PUT /api/admin/email-templates/[id]
 * DELETE /api/admin/email-templates/[id]
 *
 * Admin endpoints for managing individual email templates.
 * Requires admin authentication and CSRF protection (mutations only).
 *
 * Reference: ADR 0113 (Composable API Handler Pattern)
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAdmin, withAdminReadOnly } from '@/lib/api/middlewares';
import { getTemplate, updateTemplate, deleteTemplate } from '@/lib/email/template-service';
import { logAdminAction, getClientIp } from '@/lib/admin/audit-service';

/**
 * GET /api/admin/email-templates/[id]
 * Fetch a single email template by ID
 */

export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/admin/email-templates/:id'),
  withAdminReadOnly,
)(async (ctx) => {
  try {
    const { id } = await ctx.params;
    const template = await getTemplate(id);

    if (!template) {
      return NextResponse.json({ error: 'Email template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to fetch email template: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
});

/**
 * PUT /api/admin/email-templates/[id]
 * Update an email template
 */
export const PUT = pipe(
  withSentry('/api/admin/email-templates/:id'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const { id } = await ctx.params;

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
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  try {
    // Update template
    const template = await updateTemplate(id, body);

    // Log admin action
    if (ctx.userId) {
      await logAdminAction({
        action: 'UPDATE_EMAIL_TEMPLATE',
        entityType: 'EmailTemplate',
        entityId: id,
        adminId: ctx.userId,
        details: body,
        ipAddress: getClientIp(ctx.req),
      });
    }

    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to update email template: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
});

/**
 * DELETE /api/admin/email-templates/[id]
 * Delete an email template
 */
export const DELETE = pipe(
  withSentry('/api/admin/email-templates/:id'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const { id } = await ctx.params;

  try {
    // Delete template
    const template = await deleteTemplate(id);

    // Log admin action
    if (ctx.userId) {
      await logAdminAction({
        action: 'DELETE_EMAIL_TEMPLATE',
        entityType: 'EmailTemplate',
        entityId: id,
        adminId: ctx.userId,
        details: { name: template.name },
        ipAddress: getClientIp(ctx.req),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Email template deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to delete email template: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
});
