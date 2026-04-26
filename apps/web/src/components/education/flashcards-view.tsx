"use client";

import { AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "@/components/error-boundary";
import { ToolMaestroSelectionDialog } from "./tool-maestro-selection-dialog";
import { cn } from "@/lib/utils";
import { useFlashcardsView } from "./flashcards-view/hooks/use-flashcards-view";
import { FlashcardsHeader } from "./flashcards-view/components/flashcards-header";
import { DecksGrid } from "./flashcards-view/components/decks-grid";
import { StudyModal } from "./flashcards-view/components/study-modal";
import { DeckEditor } from "./flashcards-view/components/deck-editor";

interface FlashcardsViewProps {
  className?: string;
  initialMaestroId?: string | null;
  initialMode?: "voice" | "chat" | null;
}

export function FlashcardsView({
  className,
  initialMaestroId,
  initialMode,
}: FlashcardsViewProps) {
  const {
    decks,
    loading,
    selectedDeck,
    isStudying,
    showCreateModal,
    editingDeck,
    showMaestroDialog,
    setSelectedDeck,
    setIsStudying,
    setShowCreateModal,
    setEditingDeck,
    setShowMaestroDialog,
    handleMaestroConfirm,
    handleRating,
    handleStudyComplete,
    deleteDeck,
    closeStudyModal,
    closeCreateModal,
    saveDecks,
  } = useFlashcardsView({ initialMaestroId, initialMode });

  return (
    <ErrorBoundary>
      <div className={cn("space-y-6", className)}>
        <FlashcardsHeader
          onMaestroClick={() => setShowMaestroDialog(true)}
          onManualClick={() => setShowCreateModal(true)}
        />

        <DecksGrid
          loading={loading}
          decks={decks}
          onSelect={setSelectedDeck}
          onEdit={(deck) => {
            setEditingDeck(deck);
            setShowCreateModal(true);
          }}
          onDelete={deleteDeck}
          onStudy={(deck) => {
            setSelectedDeck(deck);
            setIsStudying(true);
          }}
          onCreate={() => setShowCreateModal(true)}
        />

        <StudyModal
          show={isStudying}
          deck={selectedDeck}
          onRating={handleRating}
          onComplete={handleStudyComplete}
          onClose={closeStudyModal}
        />

        <AnimatePresence>
          {showCreateModal && (
            <DeckEditor
              deck={editingDeck}
              onSave={(deck) => {
                if (editingDeck) {
                  saveDecks(decks.map((d) => (d.id === deck.id ? deck : d)));
                } else {
                  saveDecks([...decks, deck]);
                }
                setShowCreateModal(false);
                setEditingDeck(null);
              }}
              onClose={closeCreateModal}
            />
          )}
        </AnimatePresence>

        <ToolMaestroSelectionDialog
          isOpen={showMaestroDialog}
          toolType="flashcard"
          onConfirm={handleMaestroConfirm}
          onClose={() => setShowMaestroDialog(false)}
        />
      </div>
    </ErrorBoundary>
  );
}
