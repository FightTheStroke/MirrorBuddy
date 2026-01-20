"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { DiagramRequest } from "@/types";

// Mermaid type for ref - avoids static import that bundles the library
type MermaidAPI = {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, code: string) => Promise<{ svg: string }>;
};

// Mermaid configuration - theme-aware
type MermaidTheme = "default" | "dark" | "neutral" | "forest" | "base";
const getMermaidConfig = (isDark: boolean) => ({
  startOnLoad: false,
  theme: (isDark ? "dark" : "default") as MermaidTheme,
  themeVariables: isDark
    ? {
        primaryColor: "#3b82f6",
        primaryTextColor: "#f1f5f9",
        primaryBorderColor: "#64748b",
        lineColor: "#64748b",
        secondaryColor: "#1e293b",
        tertiaryColor: "#0f172a",
        background: "#1e293b",
        mainBkg: "#1e293b",
        nodeBorder: "#64748b",
        clusterBkg: "#0f172a",
        clusterBorder: "#334155",
        titleColor: "#f1f5f9",
        edgeLabelBackground: "#1e293b",
      }
    : {
        primaryColor: "#3b82f6",
        primaryTextColor: "#1e293b",
        primaryBorderColor: "#94a3b8",
        lineColor: "#94a3b8",
        secondaryColor: "#f1f5f9",
        tertiaryColor: "#ffffff",
        background: "#ffffff",
        mainBkg: "#f8fafc",
        nodeBorder: "#cbd5e1",
        clusterBkg: "#f1f5f9",
        clusterBorder: "#e2e8f0",
        titleColor: "#1e293b",
        edgeLabelBackground: "#ffffff",
      },
  flowchart: {
    curve: "basis" as const,
    padding: 20,
  },
  sequence: {
    actorMargin: 80,
    boxMargin: 10,
    boxTextMargin: 5,
    noteMargin: 10,
    messageMargin: 35,
  },
});

interface DiagramRendererProps {
  request: DiagramRequest;
  className?: string;
}

export function DiagramRenderer({ request, className }: DiagramRendererProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const mermaidRef = useRef<MermaidAPI | null>(null);
  const loadingPromiseRef = useRef<Promise<MermaidAPI> | null>(null);
  const lastThemeRef = useRef<boolean | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return;

      try {
        setError(null);
        setRendered(false);
        setIsLoading(true);

        // Lazy load mermaid library with race condition protection
        // Re-initialize if theme changed
        const themeChanged =
          lastThemeRef.current !== null && lastThemeRef.current !== isDark;
        if (!mermaidRef.current || themeChanged) {
          if (!loadingPromiseRef.current || themeChanged) {
            loadingPromiseRef.current = import("mermaid").then((module) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              module.default.initialize(getMermaidConfig(isDark) as any);
              return module.default;
            });
          }
          mermaidRef.current = await loadingPromiseRef.current;
          lastThemeRef.current = isDark;
        }

        // Clear previous content
        containerRef.current.innerHTML = "";

        // Generate unique ID
        const id = `mermaid-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

        // Render diagram
        const { svg } = await mermaidRef.current.render(id, request.code);

        if (containerRef.current) {
          // Sanitize SVG to prevent XSS attacks
          const sanitizedSvg = DOMPurify.sanitize(svg, {
            USE_PROFILES: { svg: true, svgFilters: true },
            ADD_TAGS: ["use"],
          });
          containerRef.current.innerHTML = sanitizedSvg;
          setRendered(true);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
        logger.error("Mermaid render error", { error: String(err) });
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [request.code, isDark]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800",
        className,
      )}
    >
      {/* Title */}
      {request.title && (
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50">
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {request.title}
          </h3>
        </div>
      )}

      {/* Diagram */}
      <div className="p-4">
        {error ? (
          <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            <strong>Diagram Error:</strong> {error}
          </div>
        ) : (
          <div
            ref={containerRef}
            className={cn(
              "flex justify-center items-center min-h-[200px]",
              (isLoading || !rendered) &&
                "animate-pulse bg-slate-200 dark:bg-slate-700/50 rounded-lg",
            )}
          />
        )}
      </div>

      {/* Source code toggle */}
      <details className="border-t border-slate-200 dark:border-slate-700">
        <summary className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50">
          View source
        </summary>
        <pre className="p-4 text-xs text-slate-600 dark:text-slate-400 overflow-x-auto bg-slate-100 dark:bg-slate-900/50">
          {request.code}
        </pre>
      </details>
    </motion.div>
  );
}

// Preset diagram templates
export const diagramTemplates = {
  flowchart: (steps: string[]) => `
flowchart TD
${steps.map((step, i) => `    S${i}["${step}"]`).join("\n")}
${steps
  .slice(0, -1)
  .map((_, i) => `    S${i} --> S${i + 1}`)
  .join("\n")}
`,

  sequence: (
    actors: string[],
    messages: Array<{ from: string; to: string; text: string }>,
  ) => `
sequenceDiagram
${actors.map((a) => `    participant ${a}`).join("\n")}
${messages.map((m) => `    ${m.from}->>+${m.to}: ${m.text}`).join("\n")}
`,

  // Mind maps use MarkMap - see markmap-renderer.tsx and ADR 0001

  classDiagram: (
    classes: Array<{ name: string; attributes: string[]; methods: string[] }>,
  ) => `
classDiagram
${classes
  .map(
    (c) => `    class ${c.name} {
${c.attributes.map((a) => `        ${a}`).join("\n")}
${c.methods.map((m) => `        ${m}()`).join("\n")}
    }`,
  )
  .join("\n")}
`,

  stateDiagram: (
    states: string[],
    transitions: Array<{ from: string; to: string; label?: string }>,
  ) => `
stateDiagram-v2
${transitions.map((t) => `    ${t.from} --> ${t.to}${t.label ? `: ${t.label}` : ""}`).join("\n")}
`,
};
