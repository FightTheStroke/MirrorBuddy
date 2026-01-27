/**
 * @file flashcards-header.tsx
 * @brief Flashcards header component
 */

import { Plus, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface FlashcardsHeaderProps {
  onMaestroClick: () => void;
  onManualClick: () => void;
}

export function FlashcardsHeader({
  onMaestroClick,
  onManualClick,
}: FlashcardsHeaderProps) {
  const t = useTranslations("education.flashcards");

  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("title")}
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          {t("fsrsDescription")}
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onMaestroClick}>
          <MessageSquare className="w-4 h-4 mr-2" />
          {t("createWithProfessor")}
        </Button>
        <Button variant="outline" onClick={onManualClick}>
          <Plus className="w-4 h-4 mr-2" />
          {t("manualMode")}
        </Button>
      </div>
    </div>
  );
}
