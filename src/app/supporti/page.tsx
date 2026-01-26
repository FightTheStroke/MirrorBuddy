// Force dynamic rendering to avoid i18n static generation issues
export const dynamic = "force-dynamic";

import { SupportiPageClient } from "./supporti-page-client";

export default function SupportiPage() {
  return <SupportiPageClient />;
}
