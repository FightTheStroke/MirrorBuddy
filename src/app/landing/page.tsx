import { redirect } from "next/navigation";

/**
 * /landing route - redirects to /welcome
 * Kept for backwards compatibility with provider-check and proxy redirects.
 */
export default function LandingRedirect() {
  redirect("/welcome");
}
