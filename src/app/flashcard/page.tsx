import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Flashcard | MirrorBuddy",
};

export default function FlashcardPage() {
  redirect("/astuccio");
}
