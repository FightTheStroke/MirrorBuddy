import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Benvenuto | MirrorBuddy",
};

/**
 * /landing route - redirects to /welcome
 * Kept for backwards compatibility with provider-check and proxy redirects.
 */
export default function LandingRedirect() {
  redirect("/welcome");
}
