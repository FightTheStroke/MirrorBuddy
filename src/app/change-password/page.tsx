// Force dynamic rendering to avoid i18n static generation issues
export const dynamic = "force-dynamic";

import { ChangePasswordClient } from "./change-password-client";

export default function ChangePasswordPage() {
  return <ChangePasswordClient />;
}
