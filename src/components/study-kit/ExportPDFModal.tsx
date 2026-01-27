"use client";

/**
 * ExportPDFModal Component
 * Modal for exporting Study Kit as accessible PDF with DSA profile selection
 * Wave 3: PDF-Accessibile-DSA UI Integration
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X, Download, Loader2, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { csrfFetch } from "@/lib/auth/csrf-client";
import toast from "@/components/ui/toast";
import { DSA_PROFILES, type DSAProfile } from "./dsa-profiles";
import type { StudyKit } from "@/types/study-kit";

interface ExportPDFModalProps {
  studyKit: StudyKit;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportPDFModal({
  studyKit,
  isOpen,
  onClose,
}: ExportPDFModalProps) {
  const t = useTranslations("studyKit.exportModal");
  const [selectedProfile, setSelectedProfile] =
    useState<DSAProfile>("dyslexia");
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState<"A4" | "Letter">("A4");

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await csrfFetch("/api/pdf-generator", {
        method: "POST",
        body: JSON.stringify({
          kitId: studyKit.id,
          profile: selectedProfile,
          format,
        }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "Export failed" }));
        throw new Error(error.error || "Export failed");
      }

      // Get filename from header or generate one
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${studyKit.title}_DSA.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+?)"/);
        if (match) filename = match[1];
      }

      // Check if saved to Zaino
      const savedToZaino = response.headers.get("X-Saved-To-Zaino") === "true";

      // Download the PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show success message
      if (savedToZaino) {
        toast.success(t("success.withZaino"));
      } else {
        toast.success(t("success.default"));
      }

      onClose();
    } catch (error) {
      logger.error("PDF export failed", { error: String(error) });
      toast.error(error instanceof Error ? error.message : t("error"));
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {t("title")}
              </h2>
              <p className="text-sm text-slate-500">{t("description")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={t("closeLabel")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Study Kit info */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="font-medium text-slate-900 dark:text-white">
              {studyKit.title}
            </p>
            {studyKit.subject && (
              <p className="text-sm text-slate-500">{studyKit.subject}</p>
            )}
          </div>

          {/* DSA Profile Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              {t("profileLabel")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DSA_PROFILES.map((profile) => (
                <button
                  key={profile.value}
                  type="button"
                  onClick={() => setSelectedProfile(profile.value)}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all",
                    selectedProfile === profile.value
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm",
                      selectedProfile === profile.value
                        ? "bg-green-500 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                    )}
                  >
                    {profile.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {profile.label}
                      </span>
                      {selectedProfile === profile.value && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {profile.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              {t("formatLabel")}
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormat("A4")}
                className={cn(
                  "flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all",
                  format === "A4"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300",
                )}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setFormat("Letter")}
                className={cn(
                  "flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all",
                  format === "Letter"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300",
                )}
              >
                Letter (US)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("generating")}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {t("export")}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
