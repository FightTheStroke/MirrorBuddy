// Force dynamic rendering to avoid i18n static generation issues
export const dynamic = "force-dynamic";

import { TermsClient } from "./terms-client";

export default function TermsPage() {
  return <TermsClient />;
}
