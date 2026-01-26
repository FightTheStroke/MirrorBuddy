// Force dynamic rendering to avoid i18n static generation issues
export const dynamic = "force-dynamic";

import { AstuccioPageClient } from "./astuccio-page-client";

export default function AstuccioPage() {
  return <AstuccioPageClient />;
}
