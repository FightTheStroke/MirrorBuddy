"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Pencil, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { csrfFetch } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface CharacterData {
  id: string;
  name: string;
  displayName: string;
  type: "MAESTRO" | "COACH" | "BUDDY";
  isEnabled: boolean;
  avatar: string;
  subject?: string;
  color: string;
  tools: string[];
  displayNameOverride?: string | null;
  descriptionOverride?: string | null;
  configId?: string;
}

interface CharacterCardProps {
  character: CharacterData;
  onEdit: () => void;
  onToggle: () => void;
}

const TYPE_COLORS = {
  MAESTRO:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  COACH:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  BUDDY: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

export function CharacterCard({
  character,
  onEdit,
  onToggle,
}: CharacterCardProps) {
  const t = useTranslations("admin");
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await csrfFetch(`/api/admin/characters/${character.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !character.isEnabled }),
      });
      onToggle();
    } catch {
      // Silently fail, user sees no change
    } finally {
      setToggling(false);
    }
  };

  const displayName = character.displayNameOverride || character.displayName;
  const avatarPath = character.avatar.startsWith("/")
    ? character.avatar
    : `/${character.avatar}`;

  return (
    <div
      className={cn(
        "relative rounded-xl border p-4 transition-all",
        character.isEnabled
          ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          : "bg-slate-50 dark:bg-slate-950 border-slate-200/60 dark:border-slate-800/60 opacity-60",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative h-12 w-12 shrink-0 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          <Image
            src={avatarPath}
            alt={displayName}
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
              {displayName}
            </h3>
            <Badge
              className={cn(
                "text-[10px] px-1.5 py-0",
                TYPE_COLORS[character.type],
              )}
            >
              {character.type}
            </Badge>
          </div>
          {character.subject && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {character.subject}
            </p>
          )}
          {character.tools.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <Wrench className="h-3 w-3 text-slate-400" />
              <span className="text-[10px] text-slate-400 truncate">
                {character.tools.length} {t("characters.tools")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="text-xs h-8"
        >
          <Pencil className="h-3 w-3 mr-1" />
          {t("characters.edit")}
        </Button>
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            character.isEnabled
              ? "bg-green-500"
              : "bg-slate-300 dark:bg-slate-600",
          )}
          aria-label={
            character.isEnabled
              ? t("characters.disable")
              : t("characters.enable")
          }
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-sm",
              character.isEnabled && "translate-x-5",
            )}
          />
        </button>
      </div>
    </div>
  );
}
