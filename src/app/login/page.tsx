// Force dynamic rendering to avoid i18n static generation issues
export const dynamic = "force-dynamic";

import { LoginClient } from "./login-client";

export default function LoginPage() {
  return <LoginClient />;
}
