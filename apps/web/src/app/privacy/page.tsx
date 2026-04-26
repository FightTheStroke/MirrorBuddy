import type { Metadata } from "next";
import { redirect } from "next/navigation";

// Force dynamic rendering to avoid i18n static generation issues
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy | MirrorBuddy",
};

export default function PrivacyPage() {
  redirect("/landing");
}
