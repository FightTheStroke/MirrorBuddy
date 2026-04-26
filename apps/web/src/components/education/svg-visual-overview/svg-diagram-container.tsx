"use client";

import { useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface SVGDiagramContainerProps {
  isLoading: boolean;
  error: string | null;
  theme: "light" | "dark";
  useMermaid: boolean;
  onDiagramReady?: (container: HTMLDivElement) => void;
}

export function SVGDiagramContainer({
  isLoading,
  error,
  theme,
  useMermaid,
  onDiagramReady,
}: SVGDiagramContainerProps) {
  const t = useTranslations("education.svgDiagram");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && !isLoading && !error) {
      onDiagramReady?.(containerRef.current);
    }
  }, [isLoading, error, onDiagramReady]);

  return (
    <div className="p-4">
      {error ? (
        <div
          className={cn(
            "p-4 rounded-lg text-sm",
            theme === "dark"
              ? "bg-red-900/20 border border-red-800 text-red-400"
              : "bg-red-50 border border-red-200 text-red-600",
          )}
          role="alert"
        >
          <strong>{t("error")}</strong> {error}
        </div>
      ) : (
        <div
          ref={containerRef}
          className={cn(
            "flex justify-center items-center overflow-x-auto min-h-[400px]",
            isLoading && "animate-pulse rounded-lg",
            isLoading &&
              (theme === "dark" ? "bg-slate-700/50" : "bg-slate-200/50"),
          )}
        />
      )}

      {/* Mermaid fallback indicator */}
      {useMermaid && !error && (
        <div
          className={cn(
            "px-4 py-2 border-t text-xs",
            theme === "dark"
              ? "border-slate-700 text-slate-500 bg-slate-900/30"
              : "border-slate-200 text-slate-400 bg-slate-50",
          )}
        >
          {t("visualizzazioneSemplificataMermaid")}
        </div>
      )}
    </div>
  );
}
