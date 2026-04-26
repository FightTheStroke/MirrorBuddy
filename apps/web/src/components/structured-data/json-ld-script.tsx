/**
 * JSON-LD Script Component
 * Server component that renders structured data in page head
 * Safe injection of JSON-LD into HTML
 *
 * Usage in layout.tsx:
 * ```tsx
 * import { JsonLdScript } from '@/components/structured-data/json-ld-script';
 * import type { Locale } from '@/i18n/config';
 *
 * export default function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
 *   return (
 *     <html>
 *       <head>
 *         <JsonLdScript locale={locale} variant="educational" />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 */

import type { Locale } from "@/i18n/config";
import {
  generateOrganizationSchema,
  generateEducationalOrganizationSchema,
  serializeSchemaToJson,
} from "./json-ld-organization";

interface JsonLdScriptProps {
  /** Locale for locale-specific descriptions */
  locale: Locale;
  /** Schema variant: "organization" or "educational" */
  variant?: "organization" | "educational";
}

/**
 * Server component that renders JSON-LD structured data
 * Injects script tag into page head for search engine optimization
 *
 * F-76: Pages have structured data for rich search results
 *
 * @component
 * @example
 * // In root layout - use Organization
 * <JsonLdScript locale="it" variant="organization" />
 *
 * @example
 * // In home page - use EducationalOrganization
 * <JsonLdScript locale="en" variant="educational" />
 */
export function JsonLdScript({
  locale,
  variant = "educational",
}: JsonLdScriptProps) {
  const schema =
    variant === "educational"
      ? generateEducationalOrganizationSchema(locale)
      : generateOrganizationSchema(locale);

  const jsonContent = serializeSchemaToJson(schema);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonContent }}
      suppressHydrationWarning
    />
  );
}
