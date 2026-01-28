import type { Metadata } from "next";
import { redirect } from "next/navigation";

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Grafici | MirrorBuddy",
};

export default function ChartPage() {
  redirect("/landing");
}
