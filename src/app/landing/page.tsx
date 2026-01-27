import { redirect } from "next/navigation";

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

/**
 * /landing route - redirects to /welcome
 * Kept for backwards compatibility with provider-check and proxy redirects.
 */
export default function LandingRedirect() {
  redirect("/welcome");
}
