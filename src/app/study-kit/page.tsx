/**
 * Study Kit Generator Page - DEPRECATED
 * Redirects to /astuccio (school metaphor)
 * Route: /study-kit
 */

import { redirect } from "next/navigation";

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

export default function StudyKitPage() {
  redirect("/?view=astuccio");
}
