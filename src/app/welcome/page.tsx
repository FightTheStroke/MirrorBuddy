import type { Metadata } from "next";
import { redirect } from "next/navigation";

// Force dynamic rendering to avoid i18n static generation issues
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Welcome | MirrorBuddy",
};

export default function WelcomePage() {
  redirect("/landing");
}
