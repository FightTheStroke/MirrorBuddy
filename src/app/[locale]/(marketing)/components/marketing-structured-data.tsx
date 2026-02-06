/**
 * Server component that renders JSON-LD structured data for the marketing page
 * Includes SoftwareApplication, FAQPage, and Organization schemas
 */

import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";
import { generateSoftwareApplicationSchema } from "@/components/structured-data/json-ld-software-app";
import { generateFaqPageSchema } from "@/components/structured-data/json-ld-faq";
import {
  generateEducationalOrganizationSchema,
  serializeSchemaToJson,
} from "@/components/structured-data/json-ld-organization";

interface MarketingStructuredDataProps {
  locale: string;
}

const FAQ_ITEMS_EN = [
  {
    q: "Is MirrorBuddy safe for children?",
    a: "Yes. We are COPPA compliant, GDPR aligned, and all AI conversations are moderated.",
  },
  {
    q: "Does it work with learning differences?",
    a: "MirrorBuddy supports 7 DSA profiles with adaptive interfaces, readable fonts, mind maps, and text-to-speech.",
  },
  {
    q: "What subjects are covered?",
    a: "Mathematics, physics, chemistry, biology, history, literature, philosophy, art, music, and more.",
  },
  {
    q: "Can schools use MirrorBuddy?",
    a: "Yes. We offer school plans with SSO integration, admin dashboards, and bulk student provisioning.",
  },
  {
    q: "Is my data safe?",
    a: "All data is hosted in the EU. We use encryption and follow SOC 2 security practices.",
  },
];

export function MarketingStructuredData({
  locale,
}: MarketingStructuredDataProps) {
  const validLocale: Locale = locales.includes(locale as Locale)
    ? (locale as Locale)
    : "en";

  const appSchema = generateSoftwareApplicationSchema(validLocale);
  const faqSchema = generateFaqPageSchema(FAQ_ITEMS_EN);
  const orgSchema = generateEducationalOrganizationSchema(validLocale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(appSchema),
        }}
        suppressHydrationWarning
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
        suppressHydrationWarning
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeSchemaToJson(orgSchema),
        }}
        suppressHydrationWarning
      />
    </>
  );
}
