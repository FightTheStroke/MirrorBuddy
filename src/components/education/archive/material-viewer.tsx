"use client";

/**
 * Material Viewer Modal
 * Shows the selected material content in an overlay
 *
 * Updated in Phase 6 (Task 6.06) to use the Knowledge Hub renderer registry
 * instead of showing raw JSON for structured content types.
 */

import { useEffect, Suspense, lazy, useMemo } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { X, FileText, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/zaino/print-button";
import { TOOL_ICONS, TOOL_LABELS } from "./constants";
import { formatDate } from "./utils";
import type { ArchiveItem } from "./types";
import type { PrintableContentType } from "@/lib/tools/accessible-print";
import { RelatedMaterials } from "@/components/education/knowledge-hub/components/related-materials";
import {
  getRendererImport,
  hasRenderer,
  FallbackRenderer,
  type BaseRendererProps,
} from "@/components/education/knowledge-hub/renderers";

interface MaterialViewerProps {
  item: ArchiveItem;
  onClose: () => void;
  onNavigate?: (toolId: string) => void;
}

export function MaterialViewer({
  item,
  onClose,
  onNavigate,
}: MaterialViewerProps) {
  const t = useTranslations("education.materialViewer");
  const Icon = TOOL_ICONS[item.toolType];
  const label = TOOL_LABELS[item.toolType];

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Create lazy component for the renderer if available
  const LazyRenderer = useMemo(() => {
    if (!hasRenderer(item.toolType)) return null;
    const importFn = getRendererImport(item.toolType);
    if (!importFn) return null;
    return lazy(importFn);
  }, [item.toolType]);

  // Loading fallback for lazy-loaded renderers
  const LoadingFallback = (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  // Render content based on tool type
  const renderContent = () => {
    const content = item.content;

    if (!content) {
      return (
        <div className="text-center text-slate-500 dark:text-slate-400 py-8">
          {t("noContent")}
        </div>
      );
    }

    // Image content (webcam captures) - handle specially for base64 data
    if (
      item.toolType === "webcam" &&
      typeof content === "object" &&
      "imageData" in content
    ) {
      return (
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- User-captured data URL */}
          <img
            src={(content as { imageData: string }).imageData}
            alt={item.title || "Foto catturata"}
            className="max-w-full max-h-[60vh] rounded-lg shadow-lg"
          />
        </div>
      );
    }

    // PDF content - handle specially for external URL
    if (
      item.toolType === "pdf" &&
      typeof content === "object" &&
      "url" in content
    ) {
      return (
        <div className="flex flex-col items-center gap-4">
          <FileText className="w-16 h-16 text-slate-400" />
          <p className="text-slate-600 dark:text-slate-300">
            {(content as { filename?: string }).filename || "Documento PDF"}
          </p>
          <Button
            onClick={() =>
              window.open((content as { url: string }).url, "_blank")
            }
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Apri PDF
          </Button>
        </div>
      );
    }

    // Use Knowledge Hub renderer if available for structured content
    if (typeof content === "object" && LazyRenderer) {
      const rendererProps: BaseRendererProps = {
        data: content as Record<string, unknown>,
        readOnly: true,
        className: "max-h-[60vh] overflow-auto",
      };

      return (
        <Suspense fallback={LoadingFallback}>
          <LazyRenderer {...rendererProps} />
        </Suspense>
      );
    }

    // Fallback for object content without a specific renderer
    if (typeof content === "object") {
      return (
        <FallbackRenderer
          data={content as Record<string, unknown>}
          className="max-h-[50vh] overflow-auto"
        />
      );
    }

    // String content
    return (
      <div className="prose dark:prose-invert max-w-none">
        {String(content)}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {item.title || `${label} del ${formatDate(item.createdAt)}`}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {label} • {formatDate(item.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Print button - only show for printable content types */}
            {item.content && !["webcam", "pdf"].includes(item.toolType) && (
              <PrintButton
                title={
                  item.title || `${label} del ${formatDate(item.createdAt)}`
                }
                contentType={item.toolType as PrintableContentType}
                content={item.content}
                variant="outline"
                size="sm"
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Chiudi"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
          {renderContent()}

          <RelatedMaterials
            materialToolId={item.toolId}
            onNavigate={onNavigate}
            className="mt-6"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
