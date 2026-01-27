/**
 * @file deck-editor.tsx
 * @brief Deck editor component
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, X, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { subjectNames, subjectIcons, subjectColors } from "@/data";
import type { FlashcardDeck, Flashcard, Subject } from "@/types";

interface DeckEditorProps {
  deck: FlashcardDeck | null;
  onSave: (deck: FlashcardDeck) => void;
  onClose: () => void;
}

export function DeckEditor({ deck, onSave, onClose }: DeckEditorProps) {
  const t = useTranslations("education.flashcards");
  const [name, setName] = useState(deck?.name || "");
  const [subject, setSubject] = useState<Subject>(
    deck?.subject || "mathematics",
  );
  const [cards, setCards] = useState<Array<{ front: string; back: string }>>(
    deck?.cards.map((c) => ({ front: c.front, back: c.back })) || [
      { front: "", back: "" },
    ],
  );

  const subjects = Object.keys(subjectNames) as Subject[];

  const addCard = () => {
    setCards([...cards, { front: "", back: "" }]);
  };

  const removeCard = (index: number) => {
    setCards(cards.filter((_, i) => i !== index));
  };

  const updateCard = (
    index: number,
    field: "front" | "back",
    value: string,
  ) => {
    setCards(
      cards.map((card, i) =>
        i === index ? { ...card, [field]: value } : card,
      ),
    );
  };

  const handleSave = () => {
    if (!name.trim() || cards.length === 0) return;

    const validCards = cards.filter((c) => c.front.trim() && c.back.trim());
    if (validCards.length === 0) return;

    const newDeck: FlashcardDeck = {
      id: deck?.id || crypto.randomUUID(),
      name: name.trim(),
      subject,
      cards: validCards.map(
        (c, i): Flashcard => ({
          id: deck?.cards[i]?.id || crypto.randomUUID(),
          deckId: deck?.id || "",
          front: c.front.trim(),
          back: c.back.trim(),
          state: "new",
          stability: 0,
          difficulty: 0,
          elapsedDays: 0,
          scheduledDays: 0,
          reps: 0,
          lapses: 0,
          nextReview: new Date(),
        }),
      ),
      createdAt: deck?.createdAt || new Date(),
      lastStudied: deck?.lastStudied,
    };

    onSave(newDeck);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">
            {deck ? t("editDeckTitle") : t("newDeckTitle")}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            {t("deckNameLabel")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("deckNamePlaceholder")}
            className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            {t("subjectLabel")}
          </label>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-colors",
                  subject === s
                    ? "text-white"
                    : "bg-slate-100 dark:bg-slate-800",
                )}
                style={
                  subject === s ? { backgroundColor: subjectColors[s] } : {}
                }
              >
                {subjectIcons[s]} {subjectNames[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            {t("cardsLabel", { count: cards.length })}
          </label>
          <div className="space-y-3 max-h-[40vh] overflow-y-auto">
            {cards.map((card, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-start gap-3">
                  <span className="text-sm text-slate-500 mt-2">
                    {index + 1}
                  </span>
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={card.front}
                      onChange={(e) =>
                        updateCard(index, "front", e.target.value)
                      }
                      placeholder={t("cardFrontPlaceholder")}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm"
                    />
                    <input
                      type="text"
                      value={card.back}
                      onChange={(e) =>
                        updateCard(index, "back", e.target.value)
                      }
                      placeholder={t("cardBackPlaceholder")}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm"
                    />
                  </div>
                  <button
                    onClick={() => removeCard(index)}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20"
                    disabled={cards.length === 1}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={addCard} className="mt-3 w-full">
            <Plus className="w-4 h-4 mr-2" />
            {t("addCardButton")}
          </Button>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {t("cancelButton")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || cards.every((c) => !c.front.trim())}
          >
            <Save className="w-4 h-4 mr-2" />
            {t("saveButton")}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
