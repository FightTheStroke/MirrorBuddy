/**
 * Archivio Page - REDIRECT to /supporti (legacy route)
 * Route: /archivio -> /supporti
 */

import { redirect } from "next/navigation";

export const metadata = {
  title: "Zaino | MirrorBuddy",
  description: "Tutti i tuoi materiali di studio salvati",
};

export default function ArchivioPage() {
  redirect("/supporti");
}
