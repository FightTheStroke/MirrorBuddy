// Force dynamic rendering to avoid i18n static generation issues
export const dynamic = "force-dynamic";

import { WelcomeClient } from "./welcome-client";

export default function WelcomePage() {
  return <WelcomeClient />;
}
