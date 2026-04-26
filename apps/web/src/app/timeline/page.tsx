import type { Metadata } from "next";
import { redirect } from "next/navigation";

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Timeline | MirrorBuddy",
};

export default function TimelinePage() {
  redirect("/landing");
}
