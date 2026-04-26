"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ActiveCharacter } from "@/lib/stores/conversation-flow-store";
import { CHARACTER_AVATARS } from "./constants";

interface CharacterAvatarProps {
  character: ActiveCharacter;
  size?: "sm" | "md" | "lg" | "xl";
  showStatus?: boolean;
  isActive?: boolean;
}

/**
 * Character avatar with photo or fallback.
 */
export function CharacterAvatar({
  character,
  size = "md",
  showStatus = false,
  isActive = false,
}: CharacterAvatarProps) {
  const sizeClasses = {
    sm: "w-7 h-7 xs:w-8 xs:h-8",
    md: "w-10 h-10 xs:w-12 xs:h-12",
    lg: "w-14 h-14 xs:w-16 xs:h-16",
    xl: "w-20 h-20 xs:w-24 xs:h-24",
  };

  const sizePx = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  };

  const avatarPath = CHARACTER_AVATARS[character.id];
  const hasPhoto = !!avatarPath;

  return (
    <div className="relative">
      <div
        className={cn(
          "rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900",
          sizeClasses[size],
        )}
        style={{ borderColor: character.color }}
      >
        {hasPhoto ? (
          <Image
            src={avatarPath}
            alt={`Avatar di ${character.name}`}
            width={sizePx[size]}
            height={sizePx[size]}
            className="w-full h-full object-cover"
            priority={size === "xl" || size === "lg"}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white font-bold text-xs xs:text-sm"
            style={{ backgroundColor: character.color }}
          >
            {character.name.charAt(0)}
          </div>
        )}
      </div>
      {showStatus && (
        <div
          className={cn(
            "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900",
            isActive ? "bg-green-500 animate-pulse" : "bg-gray-400",
          )}
        />
      )}
    </div>
  );
}
