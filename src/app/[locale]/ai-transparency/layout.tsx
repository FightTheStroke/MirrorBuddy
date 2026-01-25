import type { Metadata } from "next";
import { generateCanonicalUrl } from "@/lib/canonical-urls";
import type { Locale } from "@/i18n/config";

/**
 * Generate metadata for AI transparency page
 * Ensures canonical URL is set for each locale version
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: "Trasparenza sull'Intelligenza Artificiale | MirrorBuddy",
    description:
      "Come MirrorBuddy usa l'IA in modo trasparente e responsabile per supportare il tuo apprendimento. Scopri i 22 Maestri IA, le protezioni, i tuoi diritti e la conformità alle normative europee.",
    keywords: [
      "IA",
      "intelligenza artificiale",
      "trasparenza",
      "AI Act",
      "GDPR",
      "educazione",
    ],
    alternates: {
      canonical: generateCanonicalUrl(locale as Locale, "/ai-transparency"),
    },
  };
}

export default function AITransparencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
