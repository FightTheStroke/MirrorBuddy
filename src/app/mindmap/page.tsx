import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Mappa Mentale | MirrorBuddy",
};

export default function MindmapPage() {
  redirect("/astuccio");
}
