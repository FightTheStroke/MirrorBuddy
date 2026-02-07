import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility";
import type { Character } from "../types";

interface CharacterChipProps {
  character: Character;
  isSelected: boolean;
  onClick: () => void;
}

export function CharacterChip({
  character,
  isSelected,
  onClick,
}: CharacterChipProps) {
  const { settings } = useAccessibilityStore();

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-full transition-all flex-shrink-0",
        isSelected
          ? "ring-2 ring-offset-2"
          : settings.highContrast
            ? "bg-gray-800 hover:bg-gray-700"
            : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700",
      )}
      style={
        isSelected
          ? ({ "--tw-ring-color": character.color } as React.CSSProperties)
          : undefined
      }
    >
      <div
        className="w-6 h-6 rounded-full overflow-hidden"
        style={{ boxShadow: `0 0 0 2px ${character.color}` }}
      >
        <Image
          src={character.avatar}
          alt={character.name}
          width={24}
          height={24}
          className="w-full h-full object-cover"
        />
      </div>
      <span
        className={cn(
          "text-sm font-medium",
          settings.highContrast
            ? "text-white"
            : "text-slate-700 dark:text-slate-300",
        )}
      >
        {character.name}
      </span>
    </button>
  );
}
