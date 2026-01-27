import type { Metadata } from "next";
import { TrialVerifyClient } from "./trial-verify-client";

// Force dynamic rendering to avoid prerender errors with useSearchParams
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verifica Email | MirrorBuddy",
  description: "Verifica la tua email per sbloccare gli strumenti della prova",
};

export default function TrialVerifyPage() {
  return <TrialVerifyClient />;
}
