"use client";

/**
 * Individual diary entry card component
 */

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  ChevronDown,
  Lightbulb,
  TrendingUp,
  Star,
  Clock,
  Phone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMaestroById, SUBJECT_NAMES } from "@/data/maestri";
import {
  getParentSuggestion,
  getMaestroSubject,
} from "@/lib/profile/parent-suggestions";
import { CATEGORY_LABELS } from "./constants";
import type { DiaryEntry } from "./types";
import { useTranslations } from "next-intl";

interface DiaryEntryCardProps {
  entry: DiaryEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onTalkToMaestro?: (maestroId: string, maestroName: string) => void;
  delay?: number;
}

export function DiaryEntryCard({
  entry,
  isExpanded,
  onToggle,
  onTalkToMaestro,
  delay = 0,
}: DiaryEntryCardProps) {
  const t = useTranslations("settings");
  const maestro = getMaestroById(entry.maestroId);
  const suggestion = getParentSuggestion(entry.category);
  const subjectName =
    SUBJECT_NAMES[entry.subject] ||
    getMaestroSubject(entry.maestroId) ||
    entry.subject;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card
        className={cn(
          "overflow-hidden transition-all duration-200",
          entry.isStrength
            ? "border-amber-200 dark:border-amber-800"
            : "border-blue-200 dark:border-blue-800",
        )}
      >
        <CardContent className="p-0">
          {/* Header with Maestro info */}
          <div
            role="button"
            tabIndex={0}
            className={cn(
              "p-4 cursor-pointer",
              entry.isStrength
                ? "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20"
                : "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
            )}
            onClick={onToggle}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle();
              }
            }}
          >
            <div className="flex items-start gap-4">
              {/* Maestro avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
                  <Image
                    src={maestro?.avatar || `/maestri/${entry.maestroId}.webp`}
                    alt={maestro?.displayName || entry.maestroName}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div
                  className={cn(
                    "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
                    entry.isStrength ? "bg-amber-400" : "bg-blue-400",
                  )}
                >
                  {entry.isStrength ? (
                    <Star className="w-3 h-3 text-white" />
                  ) : (
                    <TrendingUp className="w-3 h-3 text-white" />
                  )}
                </div>
              </div>

              {/* Entry content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    {maestro?.displayName || entry.maestroName}
                  </h4>
                  <span className="text-xs text-slate-500">-</span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {subjectName}
                  </span>
                </div>
                <p className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                  &ldquo;{entry.observation}&rdquo;
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs text-slate-500">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full",
                      entry.isStrength
                        ? "bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200"
                        : "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200",
                    )}
                  >
                    {CATEGORY_LABELS[entry.category]}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {entry.occurrences}x
                  </span>
                  <span className="hidden sm:inline">
                    {t("confidenza")} {Math.round(entry.confidence * 100)}%
                  </span>
                  <span className="sm:hidden">
                    {Math.round(entry.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Expand indicator */}
              <ChevronDown
                className={cn(
                  "w-5 h-5 text-slate-400 transition-transform",
                  isExpanded && "rotate-180",
                )}
              />
            </div>
          </div>

          {/* Expanded suggestion for parents */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                      <Lightbulb className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <h5 className="font-semibold text-slate-800 dark:text-slate-200">
                        {t("suggerimentiPerIGenitori")}
                      </h5>

                      <div className="space-y-2 text-sm">
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                          <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {t("attivitaACasa")}
                          </p>
                          <p className="text-slate-600 dark:text-slate-400">
                            {suggestion.homeActivity}
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                          <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {t("comeComunicare")}
                          </p>
                          <p className="text-slate-600 dark:text-slate-400">
                            {suggestion.communicationTip}
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                          <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {t("ambienteDiStudio")}
                          </p>
                          <p className="text-slate-600 dark:text-slate-400">
                            {suggestion.environmentTip}
                          </p>
                        </div>
                      </div>

                      {/* Talk to Maestro button - Issue #63 */}
                      {onTalkToMaestro && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTalkToMaestro(
                                entry.maestroId,
                                maestro?.displayName || entry.maestroName,
                              );
                            }}
                            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
                          >
                            <Phone className="w-4 h-4 mr-2" />
                            {t("parlaCon")}{" "}
                            {maestro?.displayName || entry.maestroName}
                          </Button>
                          <p className="text-xs text-slate-500 mt-2">
                            {t("avviaUnaConversazioneDirettaConIlProfessorePerDisc")}

                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
