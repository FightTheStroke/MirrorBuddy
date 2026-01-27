import { redirect } from "next/navigation";

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

export default function QuizPage() {
  redirect("/astuccio");
}
