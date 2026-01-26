import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Riassunto | MirrorBuddy",
};

export default function SummaryPage() {
  redirect("/?view=astuccio");
}
