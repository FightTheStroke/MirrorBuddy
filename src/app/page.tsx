// Force dynamic rendering to avoid i18n static generation issues
export const dynamic = "force-dynamic";

import { HomeClient } from "./home-client";

export default function Home() {
  return <HomeClient />;
}
