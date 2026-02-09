"use client";
/**
 * Study Workspace Toolbar
 * View mode switcher and status indicators
 */

import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeft, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility";
import { Button } from "@/components/ui/button";
import type { ViewMode } from "./types";
import { useTranslations } from "next-intl";

interface StudyWorkspaceToolbarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isToolActive: boolean;
}

export function StudyWorkspaceToolbar({
  viewMode,
  setViewMode,
  isToolActive,
}: StudyWorkspaceToolbarProps) {
  const t = useTranslations("education");
  const { settings } = useAccessibilityStore();

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2 border-b shrink-0",
        settings.highContrast
          ? "border-yellow-400 bg-black"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
      )}
    >
      <div className="flex items-center gap-2">
        {/* View mode buttons */}
        <div
          className={cn(
            "flex rounded-lg p-1",
            settings.highContrast
              ? "bg-gray-900"
              : "bg-slate-100 dark:bg-slate-800",
          )}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("conversation")}
            className={cn(
              "gap-1",
              viewMode === "conversation" &&
                (settings.highContrast
                  ? "bg-yellow-400 text-black"
                  : "bg-white dark:bg-slate-700 shadow-sm"),
            )}
          >
            <PanelLeftClose className="w-4 h-4" />
            <span className="hidden sm:inline">{t("chat")}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("split")}
            className={cn(
              "gap-1",
              viewMode === "split" &&
                (settings.highContrast
                  ? "bg-yellow-400 text-black"
                  : "bg-white dark:bg-slate-700 shadow-sm"),
            )}
          >
            <PanelLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t("split")}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("canvas")}
            disabled={!isToolActive}
            className={cn(
              "gap-1",
              viewMode === "canvas" &&
                (settings.highContrast
                  ? "bg-yellow-400 text-black"
                  : "bg-white dark:bg-slate-700 shadow-sm"),
            )}
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t("canvas")}</span>
          </Button>
        </div>

        {/* Tool status indicator */}
        {isToolActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
              settings.highContrast
                ? "bg-yellow-400/20 text-yellow-400"
                : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
            )}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            {t("strumentoInCostruzione")}
          </motion.div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {viewMode === "canvas" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("split")}
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
