"use client";

/**
 * StudyKitView Component
 * Inline view for Study Kit (no page wrapper)
 * Integrates with main app layout
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Upload as UploadIcon } from "lucide-react";
import { StudyKitUpload } from "./StudyKitUpload";
import { StudyKitList } from "./StudyKitList";
import { StudyKitViewer } from "./StudyKitViewer";
import { Button } from "@/components/ui/button";
import type { StudyKit } from "@/types/study-kit";

export function StudyKitView() {
  const t = useTranslations("tools.studyKit.view");
  const [view, setView] = useState<"list" | "upload" | "viewer">("list");
  const [selectedKit, setSelectedKit] = useState<StudyKit | null>(null);

  const handleUploadComplete = (_studyKitId: string) => {
    setView("list");
  };

  const handleSelectKit = (kit: StudyKit) => {
    setSelectedKit(kit);
    setView("viewer");
  };

  const handleDelete = () => {
    setView("list");
    setSelectedKit(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <FileText className="w-7 h-7 text-accent-themed" />
            {t("header")}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {t("subtitle")}
          </p>
        </div>

        {view !== "upload" && (
          <Button onClick={() => setView("upload")} className="gap-2">
            <UploadIcon className="w-4 h-4" />
            {t("newKit")}
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        {view === "upload" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t("uploadTitle")}
              </h2>
              <Button variant="ghost" onClick={() => setView("list")}>
                {t("backToList")}
              </Button>
            </div>
            <StudyKitUpload onUploadComplete={handleUploadComplete} />
          </div>
        )}

        {view === "list" && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
              {t("myKits")}
            </h2>
            <StudyKitList onSelect={handleSelectKit} />
          </div>
        )}

        {view === "viewer" && selectedKit && (
          <div>
            <Button
              variant="ghost"
              onClick={() => setView("list")}
              className="mb-4"
            >
              {t("back")}
            </Button>
            <StudyKitViewer studyKit={selectedKit} onDelete={handleDelete} />
          </div>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
          <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
            {t("features.summary.title")}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {t("features.summary.description")}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
          <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
            {t("features.mindmap.title")}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {t("features.mindmap.description")}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
          <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
            {t("features.demo.title")}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {t("features.demo.description")}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
          <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
            {t("features.quiz.title")}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {t("features.quiz.description")}
          </p>
        </div>
      </div>
    </div>
  );
}
