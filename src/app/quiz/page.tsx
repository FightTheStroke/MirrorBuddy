import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Quiz | MirrorBuddy",
};

export default function QuizPage() {
  redirect("/astuccio");
}
