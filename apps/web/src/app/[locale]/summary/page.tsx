import type { Metadata } from "next";
import { redirectLocale } from "@/i18n/navigation";

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Riassunto | MirrorBuddy",
};

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirectLocale("/astuccio", locale);
}
