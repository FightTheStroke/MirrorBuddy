/**
 * Shared email template types and constants.
 * Safe for both client and server components (no server-only imports).
 */

export const SUPPORTED_VARIABLES = [
  "name",
  "email",
  "username",
  "tier",
  "schoolLevel",
  "gradeLevel",
  "age",
  "language",
  "appUrl",
  "unsubscribeUrl",
  "currentDate",
  "currentYear",
] as const;

export type SupportedVariable = (typeof SUPPORTED_VARIABLES)[number];

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  category: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateListFilters {
  category?: string;
  isActive?: boolean;
}

export interface CreateTemplateData {
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  category: string;
  variables: string[];
  isActive?: boolean;
}

export interface UpdateTemplateData {
  name?: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  category?: string;
  variables?: string[];
  isActive?: boolean;
}
