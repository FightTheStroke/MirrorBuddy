// Force dynamic rendering to avoid i18n static generation issues
export const dynamic = "force-dynamic";

import { ContactClient } from "./contact-client";

export default function ContactPage() {
  return <ContactClient />;
}
