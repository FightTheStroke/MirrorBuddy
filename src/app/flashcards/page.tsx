import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Flashcards | MirrorBuddy",
};

export default function FlashcardsPage() {
  redirect("/astuccio");
}
