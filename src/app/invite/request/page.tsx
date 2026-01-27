// Force dynamic rendering to avoid i18n static generation issues
export const dynamic = "force-dynamic";

import { InviteRequestClient } from "./invite-request-client";

export default function InviteRequestPage() {
  return <InviteRequestClient />;
}
