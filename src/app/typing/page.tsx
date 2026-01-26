import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Scrittura | MirrorBuddy",
};

export default function TypingPage() {
  redirect("/?view=astuccio");
}
