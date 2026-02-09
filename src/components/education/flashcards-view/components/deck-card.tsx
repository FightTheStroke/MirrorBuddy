"use client";

/**
 * @file deck-card.tsx
 * @brief Deck card component
 */

import { Play, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { subjectNames, subjectIcons, subjectColors } from '@/data';
import { getDeckStats } from '../utils/deck-utils';
import type { FlashcardDeck } from '@/types';
import { useTranslations } from "next-intl";

interface DeckCardProps {
  deck: FlashcardDeck;
  onSelect: (deck: FlashcardDeck) => void;
  onEdit: (deck: FlashcardDeck) => void;
  onDelete: (deckId: string) => void;
  onStudy: (deck: FlashcardDeck) => void;
}

export function DeckCard({
  deck,
  onSelect,
  onEdit,
  onDelete,
  onStudy,
}: DeckCardProps) {
  const t = useTranslations("education");
  const stats = getDeckStats(deck);

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onSelect(deck)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ backgroundColor: `${subjectColors[deck.subject]}20` }}
            >
              {subjectIcons[deck.subject]}
            </div>
            <div>
              <CardTitle className="text-lg">{deck.name}</CardTitle>
              <p className="text-sm text-slate-500">
                {subjectNames[deck.subject]}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(deck);
              }}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Edit className="w-4 h-4 text-slate-500" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(deck.id);
              }}
              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2 mb-4 text-center">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <p className="text-lg font-bold text-blue-600">{stats.newCards}</p>
            <p className="text-xs text-blue-600/80">{t("nuove")}</p>
          </div>
          <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
            <p className="text-lg font-bold text-orange-600">
              {stats.learning}
            </p>
            <p className="text-xs text-orange-600/80">{t("learning")}</p>
          </div>
          <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
            <p className="text-lg font-bold text-green-600">{stats.review}</p>
            <p className="text-xs text-green-600/80">{t("review")}</p>
          </div>
          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
            <p className="text-lg font-bold text-purple-600">
              {stats.dueToday}
            </p>
            <p className="text-xs text-purple-600/80">{t("oggi")}</p>
          </div>
        </div>

        {stats.dueToday > 0 && (
          <Button
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onStudy(deck);
            }}
          >
            <Play className="w-4 h-4 mr-2" />
            {t("studia")}{stats.dueToday} {t("carte")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

