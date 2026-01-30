"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Search,
  Filter,
  GraduationCap,
  Ruler,
  Atom,
  FlaskConical,
  Dna,
  ScrollText,
  Globe,
  BookOpen,
  Languages,
  Palette,
  Music,
  Scale,
  TrendingUp,
  Monitor,
  Heart,
  Lightbulb,
  Globe2,
  Mic,
  Drama,
  Waves,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MaestroCard } from "./maestro-card";
import { PageHeader } from "@/components/ui/page-header";
import { maestri, subjectNames, subjectColors, getAllSubjects } from "@/data";
import { cn } from "@/lib/utils";
import type { Maestro, Subject } from "@/types";

// Map subjects to Lucide icon components
const subjectLucideIcons: Record<Subject, LucideIcon> = {
  mathematics: Ruler,
  physics: Atom,
  chemistry: FlaskConical,
  biology: Dna,
  history: ScrollText,
  geography: Globe,
  italian: BookOpen,
  english: Languages,
  spanish: Languages,
  art: Palette,
  music: Music,
  civics: Scale,
  economics: TrendingUp,
  computerScience: Monitor,
  health: Heart,
  philosophy: Lightbulb,
  internationalLaw: Globe2,
  storytelling: Mic,
  supercazzola: Drama,
  sport: Waves,
};

type SessionMode = "voice" | "chat";

interface MaestriGridProps {
  onMaestroSelect?: (maestro: Maestro, mode: SessionMode) => void;
}

export function MaestriGrid({ onMaestroSelect }: MaestriGridProps) {
  const t = useTranslations("education.maestros.grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<Subject | "all">(
    "all",
  );

  const subjects = getAllSubjects();

  // Memoize filtered and sorted maestri to avoid recalculation on every render
  const filteredMaestri = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return maestri
      .filter((m) => {
        const matchesSearch =
          m.name.toLowerCase().includes(query) ||
          m.specialty.toLowerCase().includes(query) ||
          subjectNames[m.subject].toLowerCase().includes(query);

        const matchesSubject =
          selectedSubject === "all" || m.subject === selectedSubject;

        return matchesSearch && matchesSubject;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "it"));
  }, [searchQuery, selectedSubject]);

  // Memoize click handler
  const handleSelect = useCallback(
    (maestro: Maestro) => {
      if (onMaestroSelect) {
        onMaestroSelect(maestro, "voice");
      }
    },
    [onMaestroSelect],
  );

  return (
    <div className="space-y-4">
      <PageHeader icon={GraduationCap} title={t("title")} />

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-10 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            aria-label={t("searchAriaLabel")}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-11 w-11 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              aria-label="Cancella ricerca"
              type="button"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={() => setSelectedSubject("all")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
            selectedSubject === "all"
              ? "bg-violet-600 text-white"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
          )}
        >
          {t("allButton")}
        </button>
        {subjects.map((subject) => {
          const isSelected = selectedSubject === subject;
          const SubjectIcon = subjectLucideIcons[subject];
          return (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                isSelected
                  ? "text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
              )}
              style={
                isSelected
                  ? { backgroundColor: subjectColors[subject] }
                  : undefined
              }
              aria-pressed={isSelected}
            >
              <SubjectIcon className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">{subjectNames[subject]}</span>
            </button>
          );
        })}
      </div>

      {/* Grid - compact cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {filteredMaestri.map((maestro, index) => (
          <MaestroCard
            key={maestro.id}
            maestro={maestro}
            onSelect={handleSelect}
            index={index}
          />
        ))}
      </div>

      {/* Empty state */}
      {filteredMaestri.length === 0 && (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">
            {t("emptyTitle")}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {t("emptyDescription")}
          </p>
        </div>
      )}
    </div>
  );
}
