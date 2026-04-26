// Force dynamic rendering to avoid i18n static generation issues
export const dynamic = "force-dynamic";

import { AccessibilityClient } from "./accessibility-client";

export default function AccessibilityPage() {
  return <AccessibilityClient />;
}
