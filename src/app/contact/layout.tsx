import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contattaci | MirrorBuddy",
  description:
    "Contatta MirrorBuddy per qualsiasi domanda o richiesta di supporto. Siamo qui per aiutarti.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
