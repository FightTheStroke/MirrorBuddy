"use client";

/**
 * Empty State Component
 * Shown when no materials match the current filter
 */

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileText, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOOL_ICONS, TOOL_LABELS, type FilterType } from "./constants";

interface EmptyStateProps {
  filter: FilterType;
}

export function EmptyState({ filter }: EmptyStateProps) {
  const t = useTranslations("education.archive");
  const router = useRouter();
  const Icon =
    filter === "all"
      ? FileText
      : filter === "bookmarked"
        ? BookmarkCheck
        : TOOL_ICONS[filter];
  const label =
    filter === "all"
      ? t("emptyMaterials").split(" ")[1].toLowerCase()
      : filter === "bookmarked"
        ? t("emptyPreferred").split(" ")[1].toLowerCase()
        : TOOL_LABELS[filter].toLowerCase();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
        {filter === "all"
          ? t("emptyMaterials")
          : filter === "bookmarked"
            ? t("emptyPreferred")
            : `Nessun ${label} salvato`}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-4">
        {t("emptyDescription")}
      </p>
      <Button onClick={() => router.push("/")}>{t("startConversation")}</Button>
    </motion.div>
  );
}
