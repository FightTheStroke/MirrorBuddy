// Force dynamic rendering to avoid i18n static generation issues
export const dynamic = "force-dynamic";

import { PrivacyClient } from "./privacy-client";

export default function PrivacyPage() {
  return <PrivacyClient />;
}
