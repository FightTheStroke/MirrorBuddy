/**
 * Archivio Page
 * Route: /archivio
 *
 * Unified archive view for all saved materials (mindmaps, quizzes, flashcards, etc.)
 * T-18: Unified Archive page
 */

import { ArchiveView } from '@/components/education/archive-view';

export const metadata = {
  title: 'Archivio | MirrorBuddy',
  description: 'Tutti i tuoi materiali di studio salvati',
};

export default function ArchivioPage() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <ArchiveView />
    </main>
  );
}
