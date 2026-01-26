// Force dynamic rendering to avoid i18n static generation issues
export const dynamic = "force-dynamic";

import { CookiesClient } from "./cookies-client";

export default function CookiesPage() {
  return <CookiesClient />;
}
