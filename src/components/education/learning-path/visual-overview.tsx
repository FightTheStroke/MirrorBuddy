"use client";

/**
 * Learning Path Visual Overview
 * Renders a Mermaid flowchart showing the learning path progression
 * Plan 8 MVP - Wave 2 [F-11]
 */

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import mermaid from "mermaid";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { LearningPathTopic } from "@/types";
import { generateMermaidCode, STATUS_COLORS } from "./visual-overview-utils";
import { initializeMermaidConfig } from "./mermaid-config";

interface VisualOverviewProps {
  topics: LearningPathTopic[];
  title?: string;
  onTopicClick?: (topicId: string) => void;
  className?: string;
  compact?: boolean;
}

// Initialize mermaid on module load
initializeMermaidConfig();

export function VisualOverview({
  topics,
  title,
  onTopicClick,
  className,
  compact = false,
}: VisualOverviewProps) {
  const t = useTranslations("education.learning-path");
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Store click handlers for proper cleanup (prevent memory leak)
    const clickHandlers: Array<{ node: Element; handler: () => void }> = [];

    const renderDiagram = async () => {
      if (!containerRef.current) return;

      try {
        if (!cancelled) {
          setError(null);
          setRendered(false);
        }

        // Clear previous content
        containerRef.current.innerHTML = "";

        // Generate unique ID
        const id = `lp-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

        // Generate and render diagram
        const code = generateMermaidCode(topics, compact);
        const { svg } = await mermaid.render(id, code);

        if (containerRef.current && !cancelled) {
          // Sanitize SVG to prevent XSS attacks
          const sanitizedSvg = DOMPurify.sanitize(svg, {
            USE_PROFILES: { svg: true, svgFilters: true },
            ADD_TAGS: ["use"],
          });
          containerRef.current.innerHTML = sanitizedSvg;
          setRendered(true);

          // Add click handlers to nodes if callback provided
          if (onTopicClick) {
            const svgElement = containerRef.current.querySelector("svg");
            if (svgElement) {
              const nodes = svgElement.querySelectorAll(".node");
              nodes.forEach((node, index) => {
                const topic = topics[index];
                if (topic && topic.status !== "locked") {
                  node.classList.add("cursor-pointer", "hover:opacity-80");
                  const handler = () => onTopicClick(topic.id);
                  node.addEventListener("click", handler);
                  // Store reference for cleanup
                  clickHandlers.push({ node, handler });
                }
              });
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          setError(errorMsg);
          logger.error("Learning path diagram render error", {
            error: String(err),
          });
        }
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
      // Clean up click handlers to prevent memory leak
      for (const { node, handler } of clickHandlers) {
        node.removeEventListener("click", handler);
      }
    };
  }, [topics, compact, onTopicClick]);

  // Calculate progress
  const completedCount = topics.filter((t) => t.status === "completed").length;
  const progressPercent =
    topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-800",
        className,
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-200">
            {title || t("visual-title")}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {completedCount}/{topics.length} {t("topics-completed-count")}
          </p>
        </div>
        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-300">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Diagram */}
      <div className="p-4">
        {error ? (
          <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-400 text-sm">
            <strong>{t("error")}</strong> {error}
          </div>
        ) : (
          <div
            ref={containerRef}
            className={cn(
              "flex justify-center items-center overflow-x-auto",
              compact ? "min-h-[150px]" : "min-h-[250px]",
              !rendered && "animate-pulse bg-slate-700/50 rounded-lg",
            )}
          />
        )}
      </div>

      {/* Legend */}
      {!compact && (
        <div className="px-4 py-2 border-t border-slate-700 bg-slate-900/30">
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded"
                style={{ backgroundColor: STATUS_COLORS.locked.bg }}
              />
              <span>{t("locked")}</span>
            </div>
            <div className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded"
                style={{ backgroundColor: STATUS_COLORS.unlocked.bg }}
              />
              <span>{t("unlocked")}</span>
            </div>
            <div className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded"
                style={{ backgroundColor: STATUS_COLORS.in_progress.bg }}
              />
              <span>{t("in-progress-legend")}</span>
            </div>
            <div className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded"
                style={{ backgroundColor: STATUS_COLORS.completed.bg }}
              />
              <span>{t("completed-legend")}</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export { generateMermaidCode };
