/**
 * Study Kit Generator Page - DEPRECATED
 * Redirects to /astuccio (school metaphor)
 * Route: /study-kit
 */

import { redirect } from "next/navigation";

export default function StudyKitPage() {
  redirect("/?view=astuccio");
}
