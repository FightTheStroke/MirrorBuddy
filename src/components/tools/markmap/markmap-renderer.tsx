"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import type { Markmap } from "markmap-view";
import {
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  Accessibility,
  RotateCcw,
  Maximize,
  Minimize,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility";
import type { MarkMapRendererProps } from "./types";
import { useZoom, useFullscreen, useExport, useMarkmapRender } from "./hooks";

export function MarkMapRenderer({
  title,
  markdown,
  nodes,
  className,
}: MarkMapRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markmapRef = useRef<Markmap | null>(null);
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const t = useTranslations("tools.markmap");

  const { settings } = useAccessibilityStore();

  // Hooks for functionality
  const { zoom, handleZoomIn, handleZoomOut, handleReset } =
    useZoom(markmapRef);
  const { isFullscreen, handleFullscreen } = useFullscreen(
    containerRef,
    markmapRef,
  );
  const { handlePrint, handleDownload } = useExport(svgRef, title, settings);
  const { error, rendered } = useMarkmapRender({
    svgRef,
    containerRef,
    markmapRef,
    markdown,
    nodes,
    title,
    settings,
    accessibilityMode,
  });

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "rounded-xl border overflow-hidden",
        settings.highContrast
          ? "border-white bg-black"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800",
        isFullscreen && "fixed inset-0 z-50 rounded-none",
        className,
      )}
      role="region"
      aria-label={t("mindmapDescription", { title })}
    >
      {/* Toolbar */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2 border-b",
          settings.highContrast
            ? "border-white bg-black"
            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50",
        )}
      >
        <h3
          className={cn(
            "font-semibold",
            settings.dyslexiaFont && "tracking-wide",
            settings.highContrast
              ? "text-yellow-400"
              : "text-slate-700 dark:text-slate-200",
          )}
          style={{ fontSize: `${14 * (settings.largeText ? 1.2 : 1)}px` }}
        >
          {title}
        </h3>

        <div className="flex items-center gap-2">
          {/* Accessibility toggle */}
          <button
            onClick={() => setAccessibilityMode(!accessibilityMode)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              accessibilityMode
                ? "bg-accent-themed text-white"
                : settings.highContrast
                  ? "bg-yellow-400 text-black hover:bg-yellow-300"
                  : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600",
            )}
            title={t("accessibility.title")}
            aria-label={t("accessibility.ariaLabel")}
          >
            <Accessibility className="w-4 h-4" />
          </button>

          {/* Reset view */}
          <button
            onClick={handleReset}
            className={cn(
              "p-2 rounded-lg transition-colors",
              settings.highContrast
                ? "bg-yellow-400 text-black hover:bg-yellow-300"
                : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600",
            )}
            title={t("resetView.title")}
            aria-label={t("resetView.ariaLabel")}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Zoom controls */}
          <button
            onClick={handleZoomOut}
            className={cn(
              "p-2 rounded-lg transition-colors",
              settings.highContrast
                ? "bg-yellow-400 text-black hover:bg-yellow-300"
                : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600",
            )}
            title={t("zoomOut.title")}
            aria-label={t("zoomOut.ariaLabel")}
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span
            className={cn(
              "text-sm min-w-[4rem] text-center",
              settings.highContrast
                ? "text-white"
                : "text-slate-600 dark:text-slate-400",
            )}
          >
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            className={cn(
              "p-2 rounded-lg transition-colors",
              settings.highContrast
                ? "bg-yellow-400 text-black hover:bg-yellow-300"
                : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600",
            )}
            title={t("zoomIn.title")}
            aria-label={t("zoomIn.ariaLabel")}
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={handleFullscreen}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isFullscreen
                ? "bg-green-500 text-white hover:bg-green-600"
                : settings.highContrast
                  ? "bg-yellow-400 text-black hover:bg-yellow-300"
                  : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600",
            )}
            title={isFullscreen ? t("fullscreen.exit") : t("fullscreen.enter")}
            aria-label={
              isFullscreen
                ? t("fullscreen.ariaLabelExit")
                : t("fullscreen.ariaLabelEnter")
            }
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className={cn(
              "p-2 rounded-lg transition-colors",
              settings.highContrast
                ? "bg-yellow-400 text-black hover:bg-yellow-300"
                : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600",
            )}
            title={t("download.title")}
            aria-label={t("download.ariaLabel")}
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className={cn(
              "p-2 rounded-lg transition-colors",
              settings.highContrast
                ? "bg-yellow-400 text-black hover:bg-yellow-300"
                : "bg-accent-themed text-white hover:brightness-110",
            )}
            title={t("print.title")}
            aria-label={t("print.ariaLabel")}
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mindmap container - centered with pan/zoom support */}
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden relative",
          settings.highContrast ? "bg-black" : "bg-white dark:bg-slate-900",
          isFullscreen && "flex-1",
        )}
        style={{
          height: isFullscreen ? "calc(100vh - 60px)" : "500px",
          minHeight: isFullscreen ? "calc(100vh - 60px)" : "400px",
        }}
      >
        {error ? (
          <div
            className={cn(
              "p-4 rounded-lg text-sm",
              settings.highContrast
                ? "bg-red-900 border-2 border-red-500 text-white"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400",
            )}
            role="alert"
          >
            <strong>{t("error")}</strong> {error}
          </div>
        ) : (
          <>
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              className={cn(
                "absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing",
                !rendered && "animate-pulse rounded-lg",
                !rendered &&
                  (settings.highContrast
                    ? "bg-gray-800"
                    : "bg-slate-100 dark:bg-slate-700/50"),
              )}
              style={{
                touchAction: "none",
                minWidth: "400px",
                minHeight: "300px",
              }}
            />
            {rendered && (
              <div className="absolute bottom-2 left-2 text-xs text-slate-400 dark:text-slate-500 pointer-events-none select-none">
                {t("instructions")}
              </div>
            )}
          </>
        )}
      </div>

      {/* Screen reader description */}
      <div className="sr-only" aria-live="polite">
        {rendered && t("successMessage", { title })}
      </div>
    </motion.div>
  );
}

// Backward compatibility alias (old name was MindmapRenderer)
export { MarkMapRenderer as MindmapRenderer };
