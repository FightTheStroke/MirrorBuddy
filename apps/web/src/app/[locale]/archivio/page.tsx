/**
 * Archivio Page - REDIRECT to /supporti (legacy route)
 * Route: /archivio -> /supporti
 */

import { redirectLocale } from "@/i18n/navigation";

export const metadata = {
  title: "Zaino | MirrorBuddy",
  description: "Tutti i tuoi materiali di studio salvati",
};

export default async function ArchivioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirectLocale("/supporti", locale);
}
