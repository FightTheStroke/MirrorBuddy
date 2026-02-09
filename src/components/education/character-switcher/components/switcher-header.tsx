"use client";

import { Search, X, Heart, Users, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility";
import { ROLE_INFO } from "../constants";
import type { CharacterRole } from "../types";
import { useTranslations } from "next-intl";

const ICON_MAP = {
  Heart,
  Users,
  GraduationCap,
};

interface SwitcherHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedRole: CharacterRole | "all";
  onRoleChange: (role: CharacterRole | "all") => void;
  onClose: () => void;
}

export function SwitcherHeader({
  searchQuery,
  onSearchChange,
  selectedRole,
  onRoleChange,
  onClose,
}: SwitcherHeaderProps) {
  const t = useTranslations("education");
  const { settings } = useAccessibilityStore();

  return (
    <div
      className={cn(
        "sticky top-0 z-10 px-4 py-3 border-b",
        settings.highContrast
          ? "border-yellow-400 bg-black"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900",
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h2
          className={cn(
            "text-lg font-semibold",
            settings.highContrast
              ? "text-yellow-400"
              : "text-slate-900 dark:text-white",
          )}
        >
          {t("scegliConChiStudiare")}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label={t("chiudi")}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="relative">
        <Search
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
            settings.highContrast ? "text-yellow-400" : "text-slate-400",
          )}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("cerca")}
          className={cn(
            "w-full pl-9 pr-4 py-2 rounded-lg text-sm",
            settings.highContrast
              ? "bg-gray-900 text-white border border-yellow-400"
              : "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
          )}
        />
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onRoleChange("all")}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            selectedRole === "all"
              ? settings.highContrast
                ? "bg-yellow-400 text-black"
                : "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
              : settings.highContrast
                ? "bg-gray-800 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
          )}
        >
          {t("tutti")}
        </button>
        {Object.entries(ROLE_INFO).map(([role, info]) => {
          const Icon = ICON_MAP[info.iconName];
          return (
            <button
              key={role}
              onClick={() => onRoleChange(role as CharacterRole)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5",
                selectedRole === role
                  ? settings.highContrast
                    ? "bg-yellow-400 text-black"
                    : "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                  : settings.highContrast
                    ? "bg-gray-800 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
              )}
            >
              <Icon className="w-4 h-4" />
              {info.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
