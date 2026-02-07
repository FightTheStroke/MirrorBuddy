import Image from "next/image";
import { ChevronRight, Heart, Users, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility";
import { ROLE_INFO } from "../constants";
import type { Character } from "../types";

const ICON_MAP = {
  Heart,
  Users,
  GraduationCap,
};

interface CharacterCardProps {
  character: Character;
  isSelected: boolean;
  onClick: () => void;
}

export function CharacterCard({
  character,
  isSelected,
  onClick,
}: CharacterCardProps) {
  const { settings } = useAccessibilityStore();
  const roleInfo = ROLE_INFO[character.role];
  const Icon = ICON_MAP[roleInfo.iconName];

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative p-3 rounded-xl text-left transition-all group",
        isSelected
          ? "ring-2 ring-offset-2"
          : settings.highContrast
            ? "bg-gray-800 hover:bg-gray-700 border border-gray-600"
            : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700",
      )}
      style={
        isSelected
          ? ({ "--tw-ring-color": character.color } as React.CSSProperties)
          : undefined
      }
    >
      {isSelected && (
        <div
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs"
          style={{ backgroundColor: character.color }}
        >
          ✓
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 transition-transform group-hover:scale-105"
          style={{ boxShadow: `0 0 0 2px ${character.color}` }}
        >
          <Image
            src={character.avatar}
            alt={character.name}
            width={48}
            height={48}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span
              className={cn(
                "font-medium text-sm truncate",
                settings.highContrast
                  ? "text-white"
                  : "text-slate-900 dark:text-white",
              )}
            >
              {character.name}
            </span>
          </div>
          <span
            className={cn("text-xs flex items-center gap-1", roleInfo.color)}
          >
            <Icon className="w-4 h-4" />
            {roleInfo.label}
          </span>
          {character.specialty && (
            <p
              className={cn(
                "text-xs mt-1 line-clamp-1",
                settings.highContrast ? "text-gray-400" : "text-slate-500",
              )}
            >
              {character.specialty}
            </p>
          )}
        </div>

        <ChevronRight
          className={cn(
            "w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0",
            settings.highContrast ? "text-yellow-400" : "text-slate-400",
          )}
        />
      </div>
    </button>
  );
}
