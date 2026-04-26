"use client";

import { useTranslations } from "next-intl";
import { FileText, ZoomIn, ZoomOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_PDF_PAGES } from "@/lib/pdf";
import type { ViewMode } from "./use-pdf-preview";

interface PDFPreviewHeaderProps {
  fileName: string;
  totalPages?: number;
  truncated?: boolean;
  viewMode: ViewMode;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onClose: () => void;
}

export function PDFPreviewHeader({
  fileName,
  totalPages,
  truncated,
  viewMode,
  zoom,
  onZoomIn,
  onZoomOut,
  onClose,
}: PDFPreviewHeaderProps) {
  const t = useTranslations("tools.pdf.preview");

  return (
    <div className="p-4 border-b border-slate-700 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
          <FileText className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="font-semibold">{fileName}</h3>
          {totalPages !== undefined && (
            <p className="text-sm text-slate-400">
              {totalPages} {totalPages === 1 ? t("page") : t("pages")}
              {truncated && (
                <span className="text-amber-400 ml-2">
                  ({t("truncatedInfo")} {MAX_PDF_PAGES})
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {viewMode === "preview" && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={onZoomOut}
              disabled={zoom <= 0.5}
              className="border-slate-600"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-400 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={onZoomIn}
              disabled={zoom >= 2}
              className="border-slate-600"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
