/**
 * Rendering hook for Interactive MarkMap
 *
 * Handles MarkMap instance creation and rendering
 */

import { useEffect, useState, RefObject, MutableRefObject } from "react";
import type { Markmap } from "markmap-view";
import { logger } from "@/lib/logger";
import type { AccessibilitySettings } from "@/lib/accessibility/accessibility-store";
import type { MindmapNode } from "../types";
import { nodesToMarkdown } from "../helpers";

export interface UseMarkmapRendererProps {
  nodes: MindmapNode[];
  title: string;
  svgRef: RefObject<SVGSVGElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  markmapRef: MutableRefObject<Markmap | null>;
  settings: AccessibilitySettings;
  accessibilityMode: boolean;
}

export function useMarkmapRenderer({
  nodes,
  title,
  svgRef,
  containerRef,
  markmapRef,
  settings,
  accessibilityMode,
}: UseMarkmapRendererProps) {
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Capture ref value for cleanup (React hooks/exhaustive-deps rule)
    const svgElement = svgRef.current;

    const renderMindmap = async () => {
      if (cancelled) return;
      if (!svgRef.current || !containerRef.current) return;

      // FIX BUG 16: Check container dimensions before rendering to prevent SVGLength error
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        // Container not yet laid out, wait for next frame
        requestAnimationFrame(() => {
          if (!cancelled) renderMindmap();
        });
        return;
      }

      try {
        setError(null);
        setRendered(false);

        // CRITICAL: Destroy existing markmap BEFORE clearing SVG
        // This ensures proper cleanup of event listeners and internal state
        if (markmapRef.current) {
          markmapRef.current.destroy();
          markmapRef.current = null;
        }

        // Now clear SVG content
        svgRef.current.innerHTML = "";

        if (cancelled) return;

        // Set explicit dimensions on SVG to prevent SVGLength error
        svgRef.current.setAttribute("width", String(rect.width));
        svgRef.current.setAttribute("height", String(rect.height - 60)); // Account for toolbar

        // Lazy-load markmap-lib to reduce bundle size
        const { Transformer } = await import("markmap-lib");
        if (cancelled) return;

        const transformer = new Transformer();

        // Get markdown from nodes
        const content = nodesToMarkdown(nodes, title);
        const { root } = transformer.transform(content);

        // Determine font family based on accessibility settings
        const fontFamily =
          settings.dyslexiaFont || accessibilityMode
            ? "OpenDyslexic, Comic Sans MS, sans-serif"
            : "Arial, Helvetica, sans-serif";

        // Determine colors based on accessibility settings
        const isHighContrast = settings.highContrast || accessibilityMode;

        if (cancelled) return;

        // Lazy-load markmap-view to reduce bundle size
        const { Markmap: MarkmapClass } = await import("markmap-view");
        if (cancelled) return;

        markmapRef.current = MarkmapClass.create(
          svgRef.current,
          {
            autoFit: true,
            duration: 300,
            maxWidth: 280,
            paddingX: 16,
            spacingVertical: 8,
            spacingHorizontal: 100,
            initialExpandLevel: 3, // Start with first 3 levels expanded, rest collapsed
            zoom: true, // Enable zoom/pan
            pan: true, // Enable panning
            color: (node) => {
              if (isHighContrast) {
                const colors = [
                  "#ffff00",
                  "#00ffff",
                  "#ff00ff",
                  "#00ff00",
                  "#ff8000",
                ];
                return colors[node.state?.depth % colors.length] || "#ffffff";
              }
              const colors = [
                "#3b82f6",
                "#10b981",
                "#f59e0b",
                "#ef4444",
                "#8b5cf6",
                "#ec4899",
              ];
              return colors[node.state?.depth % colors.length] || "#64748b";
            },
          },
          root,
        );

        // Apply custom styles after render
        setTimeout(() => {
          if (svgRef.current) {
            const textElements = svgRef.current.querySelectorAll(
              "text, foreignObject",
            );
            textElements.forEach((el) => {
              if (el instanceof SVGElement || el instanceof HTMLElement) {
                el.style.fontFamily = fontFamily;
                if (settings.largeText) {
                  el.style.fontSize = "16px";
                }
              }
            });

            // C-20 FIX: Style expand/collapse circles for better visibility and ensure they're clickable
            const circles = svgRef.current.querySelectorAll("circle");
            circles.forEach((circle) => {
              if (circle instanceof SVGCircleElement) {
                circle.style.cursor = "pointer";
                circle.style.pointerEvents = "auto";
                const r = parseFloat(circle.getAttribute("r") || "4");
                if (r < 6) {
                  circle.setAttribute("r", "6");
                }
                if (!circle.getAttribute("stroke")) {
                  circle.setAttribute(
                    "stroke",
                    isHighContrast ? "#ffffff" : "#475569",
                  );
                  circle.setAttribute("stroke-width", "2");
                }
              }
            });

            // C-20 FIX: Ensure all g elements (node groups) have pointer-events enabled
            const nodeGroups =
              svgRef.current.querySelectorAll("g.markmap-node");
            nodeGroups.forEach((g) => {
              if (g instanceof SVGGElement) {
                g.style.pointerEvents = "auto";
                g.style.cursor = "pointer";
              }
            });

            if (isHighContrast) {
              const rect = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "rect",
              );
              rect.setAttribute("width", "100%");
              rect.setAttribute("height", "100%");
              rect.setAttribute("fill", "#000000");
              svgRef.current.insertBefore(rect, svgRef.current.firstChild);
            }
          }
        }, 100);

        svgRef.current.setAttribute("role", "img");
        svgRef.current.setAttribute("aria-label", `Mappa mentale: ${title}`);

        setRendered(true);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
        logger.error("InteractiveMarkMap render error", { error: String(err) });
      }
    };

    renderMindmap();

    // Cleanup function - critical for React StrictMode and preventing double renders
    return () => {
      cancelled = true;
      if (markmapRef.current) {
        markmapRef.current.destroy();
        markmapRef.current = null;
      }
      if (svgElement) {
        svgElement.innerHTML = "";
      }
    };
  }, [
    nodes,
    title,
    settings.dyslexiaFont,
    settings.highContrast,
    settings.largeText,
    accessibilityMode,
    svgRef,
    containerRef,
    markmapRef,
  ]);

  return {
    error,
    rendered,
  };
}
