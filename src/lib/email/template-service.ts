/**
 * Email Template Service
 * Manages email templates with variable substitution and XSS prevention.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  SUPPORTED_VARIABLES,
  type SupportedVariable,
  type EmailTemplate,
  type TemplateListFilters,
  type CreateTemplateData,
  type UpdateTemplateData,
} from "./template-types";

// Re-export types and constants for backwards compatibility
export {
  SUPPORTED_VARIABLES,
  type SupportedVariable,
  type EmailTemplate,
  type TemplateListFilters,
  type CreateTemplateData,
  type UpdateTemplateData,
};

// Escape HTML entities to prevent XSS (&, <, >, ", ')
export function escapeHtml(text: string): string {
  const escapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, (char) => escapeMap[char] || char);
}

// Parse variables JSON field to array
function parseVariables(variables: unknown): string[] {
  return Array.isArray(variables)
    ? (variables as string[])
    : JSON.parse(variables as string);
}

// Validate that template variables are all supported
function validateVariables(variables: string[]): void {
  const unsupported = variables.filter(
    (v) => !SUPPORTED_VARIABLES.includes(v as SupportedVariable),
  );
  if (unsupported.length > 0) {
    throw new Error(
      `Unsupported template variables: ${unsupported.join(", ")}. ` +
        `Supported: ${SUPPORTED_VARIABLES.join(", ")}`,
    );
  }
}

// List email templates with optional filters
export async function listTemplates(
  filters?: TemplateListFilters,
): Promise<EmailTemplate[]> {
  try {
    const where: { category?: string; isActive?: boolean } = {};
    if (filters?.category) where.category = filters.category;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return templates.map((t) => ({
      ...t,
      variables: parseVariables(t.variables),
    }));
  } catch (error) {
    logger.error("Error listing email templates", {
      filters,
      error: String(error),
    });
    throw error;
  }
}

// Get a single email template by ID
export async function getTemplate(id: string): Promise<EmailTemplate | null> {
  try {
    const template = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!template) return null;
    return { ...template, variables: parseVariables(template.variables) };
  } catch (error) {
    logger.error("Error fetching email template", { id, error: String(error) });
    throw error;
  }
}

// Create a new email template with variable validation
export async function createTemplate(
  data: CreateTemplateData,
): Promise<EmailTemplate> {
  try {
    validateVariables(data.variables);
    const template = await prisma.emailTemplate.create({
      data: {
        name: data.name,
        subject: data.subject,
        htmlBody: data.htmlBody,
        textBody: data.textBody,
        category: data.category,
        variables: data.variables,
        isActive: data.isActive ?? true,
      },
    });
    logger.info("Email template created", {
      id: template.id,
      name: template.name,
      category: template.category,
    });
    return { ...template, variables: parseVariables(template.variables) };
  } catch (error) {
    logger.error("Error creating email template", {
      data,
      error: String(error),
    });
    throw error;
  }
}

// Update an existing email template with variable validation
export async function updateTemplate(
  id: string,
  data: UpdateTemplateData,
): Promise<EmailTemplate> {
  try {
    if (data.variables) validateVariables(data.variables);
    const template = await prisma.emailTemplate.update({ where: { id }, data });
    logger.info("Email template updated", {
      id: template.id,
      name: template.name,
      updates: Object.keys(data),
    });
    return { ...template, variables: parseVariables(template.variables) };
  } catch (error) {
    logger.error("Error updating email template", {
      id,
      data,
      error: String(error),
    });
    throw error;
  }
}

// Delete an email template
export async function deleteTemplate(id: string): Promise<EmailTemplate> {
  try {
    const template = await prisma.emailTemplate.delete({ where: { id } });
    logger.info("Email template deleted", {
      id: template.id,
      name: template.name,
    });
    return { ...template, variables: parseVariables(template.variables) };
  } catch (error) {
    logger.error("Error deleting email template", { id, error: String(error) });
    throw error;
  }
}

// Render template by replacing {{variables}} with escaped values
export async function renderTemplate(
  templateId: string,
  variables: Record<string, string>,
): Promise<{ subject: string; htmlBody: string; textBody: string }> {
  try {
    const template = await getTemplate(templateId);
    if (!template) throw new Error(`Template not found: ${templateId}`);

    // Escape all variable values to prevent XSS
    const escapedVars: Record<string, string> = {};
    for (const [key, value] of Object.entries(variables)) {
      escapedVars[key] = escapeHtml(value);
    }

    // Replace {{variableName}} with escaped values
    const replaceVariables = (text: string): string =>
      text.replace(
        /\{\{(\w+)\}\}/g,
        (match, varName) => escapedVars[varName] ?? match,
      );

    return {
      subject: replaceVariables(template.subject),
      htmlBody: replaceVariables(template.htmlBody),
      textBody: replaceVariables(template.textBody),
    };
  } catch (error) {
    logger.error("Error rendering email template", {
      templateId,
      error: String(error),
    });
    throw error;
  }
}
