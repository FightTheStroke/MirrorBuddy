import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trasparenza sull'Intelligenza Artificiale | MirrorBuddy",
  description:
    "Come MirrorBuddy usa l'IA in modo trasparente e responsabile per supportare il tuo apprendimento. Scopri i 22 Maestri IA, le protezioni, i tuoi diritti e la conformità alle normative europee.",
  keywords: [
    "IA",
    "intelligenza artificiale",
    "trasparenza",
    "AI Act",
    "GDPR",
    "educazione",
  ],
};

export default function AITransparencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
