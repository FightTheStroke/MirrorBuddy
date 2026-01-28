import type { Metadata } from "next";
import { redirect } from "next/navigation";

// Force dynamic rendering to avoid prerender errors with useSearchParams
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trial Verify | MirrorBuddy",
};

export default function TrialVerifyPage() {
  redirect("/landing");
}
