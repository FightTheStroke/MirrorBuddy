import { redirect } from "next/navigation";

/**
 * /ai-policy route - redirects to /ai-transparency
 * AI Policy is covered in the AI Transparency document.
 */
export default function AIPolicyRedirect() {
  redirect("/ai-transparency");
}
