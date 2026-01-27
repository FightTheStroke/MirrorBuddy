import type { Metadata } from "next";
import { redirect } from "next/navigation";

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Politica AI | MirrorBuddy",
};

/**
 * /ai-policy route - redirects to /ai-transparency
 * AI Policy is covered in the AI Transparency document.
 */
export default function AIPolicyRedirect() {
  redirect("/ai-transparency");
}
