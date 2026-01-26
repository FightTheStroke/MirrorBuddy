/**
 * Study Kit Generator Page - DEPRECATED
 * Redirects to /astuccio (school metaphor)
 * Route: /study-kit
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Study Kit | MirrorBuddy",
};

export default function StudyKitPage() {
  redirect("/?view=astuccio");
}
