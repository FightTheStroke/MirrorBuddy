/**
 * Tool Internationalization Helper
 *
 * Provides utilities for tools to access their localized names and descriptions
 * at runtime based on the current user's language preference.
 *
 * Usage:
 * ```ts
 * import { getToolLabel, getToolDescription } from '@/lib/tools/tool-i18n';
 *
 * const label = await getToolLabel('mindmap', locale);
 * const description = await getToolDescription('pdf', locale);
 * ```
 */

import type { Locale } from "@/i18n/config";
import { getTranslations } from "next-intl/server";

/**
 * Tool types that have translations available
 */
export type TranslatableToolType =
  | "pdf"
  | "webcam"
  | "homework"
  | "studyKit"
  | "mindmap"
  | "quiz"
  | "flashcard"
  | "demo"
  | "summary"
  | "diagram"
  | "timeline"
  | "formula"
  | "chart"
  | "typing"
  | "search";

/**
 * Tool category types
 */
export type ToolCategory = "upload" | "create" | "search";

/**
 * Get the localized label for a tool
 *
 * @param toolType - The tool type to get the label for
 * @param locale - The locale to use for translation
 * @returns The localized tool label
 */
export async function getToolLabel(
  toolType: TranslatableToolType,
  locale: Locale,
): Promise<string> {
  const t = await getTranslations({ locale, namespace: "tools" });
  return t(`${toolType}.label`);
}

/**
 * Get the localized description for a tool
 *
 * @param toolType - The tool type to get the description for
 * @param locale - The locale to use for translation
 * @returns The localized tool description
 */
export async function getToolDescription(
  toolType: TranslatableToolType,
  locale: Locale,
): Promise<string> {
  const t = await getTranslations({ locale, namespace: "tools" });
  return t(`${toolType}.description`);
}

/**
 * Get the localized category name
 *
 * @param category - The category to translate
 * @param locale - The locale to use for translation
 * @returns The localized category name
 */
export async function getToolCategory(
  category: ToolCategory,
  locale: Locale,
): Promise<string> {
  const t = await getTranslations({ locale, namespace: "tools" });
  return t(`categories.${category}`);
}

/**
 * Get complete localized tool configuration
 *
 * @param toolType - The tool type to get configuration for
 * @param locale - The locale to use for translation
 * @returns Object with label and description
 */
export async function getToolConfig(
  toolType: TranslatableToolType,
  locale: Locale,
): Promise<{ label: string; description: string }> {
  const [label, description] = await Promise.all([
    getToolLabel(toolType, locale),
    getToolDescription(toolType, locale),
  ]);

  return { label, description };
}

/**
 * Client-side hook for accessing tool translations
 *
 * Usage in React components:
 * ```tsx
 * import { useToolTranslations } from '@/lib/tools/tool-i18n';
 *
 * function MyComponent() {
 *   const { getLabel, getDescription } = useToolTranslations();
 *
 *   const label = getLabel('mindmap');
 *   const description = getDescription('mindmap');
 *
 *   return <div>{label}: {description}</div>;
 * }
 * ```
 */
export function useToolTranslations() {
  // This will be implemented when converting to client components
  // For now, use the async server-side functions above

  return {
    getLabel: (_toolType: TranslatableToolType) => {
      // Placeholder - implement with useTranslations hook from next-intl
      throw new Error("Use server-side getToolLabel for now");
    },
    getDescription: (_toolType: TranslatableToolType) => {
      // Placeholder - implement with useTranslations hook from next-intl
      throw new Error("Use server-side getToolDescription for now");
    },
  };
}
