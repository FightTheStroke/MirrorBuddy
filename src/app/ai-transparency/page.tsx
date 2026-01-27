// Force dynamic rendering to avoid i18n static generation issues
export const dynamic = "force-dynamic";

import { AITransparencyClient } from "./ai-transparency-client";

export default function AITransparencyPage() {
  return <AITransparencyClient />;
}
