"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { DotMatrixVisualizerProps } from "./types";

const DEFAULT_ROWS = 8;
const DEFAULT_COLS = 10;
const DEFAULT_DOT_SIZE = 6;
const DEFAULT_GAP = 8;

/**
 * Dot Matrix Audio Visualizer
 *
 * A grid of dots that illuminate based on audio frequency data.
 * Designed for accessibility - smooth transitions, single color, respects reduced motion.
 *
 * Inspired by LiveKit's voice assistant visualization.
 */
export function DotMatrixVisualizer({
  analyser,
  isActive,
  isSpeaking = false,
  color = "#22d3ee", // cyan-400
  rows = DEFAULT_ROWS,
  cols = DEFAULT_COLS,
  dotSize = DEFAULT_DOT_SIZE,
  gap = DEFAULT_GAP,
  className,
}: DotMatrixVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const previousLevelsRef = useRef<number[][]>([]);
  const prefersReducedMotion = useRef(false);
  const drawRef = useRef<(() => void) | null>(null);
  // Reuse frequency data buffer to avoid GC pressure (Vercel optimization)
  const frequencyDataRef = useRef<Uint8Array | null>(null);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotion.current = mediaQuery.matches;

    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Initialize level grid
  useEffect(() => {
    if (previousLevelsRef.current.length !== rows) {
      previousLevelsRef.current = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => 0),
      );
    }
  }, [rows, cols]);

  // Calculate canvas dimensions
  const dimensions = useMemo(
    () => ({
      width: cols * (dotSize + gap) - gap + dotSize,
      height: rows * (dotSize + gap) - gap + dotSize,
    }),
    [rows, cols, dotSize, gap],
  );

  // Parse color to RGB for opacity manipulation
  const parseColor = useCallback((hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ];
    }
    return [34, 211, 238]; // fallback cyan
  }, []);

  const rgbColor = useMemo(() => parseColor(color), [color, parseColor]);

  // Draw function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get frequency data if analyser available (reuse buffer to avoid GC)
    let frequencyData: Uint8Array<ArrayBuffer> | null = null;
    if (analyser && isActive) {
      // Allocate or resize buffer only when needed
      if (
        !frequencyDataRef.current ||
        frequencyDataRef.current.length !== analyser.frequencyBinCount
      ) {
        frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      }
      frequencyData = frequencyDataRef.current as Uint8Array<ArrayBuffer>;
      analyser.getByteFrequencyData(frequencyData);
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Smoothing factor (higher = smoother but slower response)
    const smoothing = prefersReducedMotion.current ? 0.95 : 0.7;
    const minOpacity = 0.15;
    const maxOpacity = 1.0;

    // Draw dots
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Calculate target level for this dot
        let targetLevel = minOpacity;

        if (frequencyData && isActive) {
          // Map columns to frequency bins
          const binIndex = Math.floor(
            (col / cols) * (frequencyData.length / 4),
          );
          const frequencyValue = frequencyData[binIndex] / 255;

          // Map rows to amplitude thresholds (bottom rows light up first)
          const rowThreshold = 1 - row / rows;

          if (frequencyValue > rowThreshold * 0.5) {
            // Calculate intensity based on how much frequency exceeds threshold
            const intensity = Math.min(
              (frequencyValue - rowThreshold * 0.5) * 2,
              1,
            );
            targetLevel = minOpacity + intensity * (maxOpacity - minOpacity);
          }
        } else if (isSpeaking) {
          // Fallback: simple pulse when speaking but no analyser
          targetLevel = 0.3 + Math.sin(Date.now() / 200 + col * 0.3) * 0.2;
        }

        // Smooth transition
        const currentLevel =
          previousLevelsRef.current[row]?.[col] ?? minOpacity;
        const newLevel =
          currentLevel + (targetLevel - currentLevel) * (1 - smoothing);

        if (previousLevelsRef.current[row]) {
          previousLevelsRef.current[row][col] = newLevel;
        }

        // Calculate position
        const x = col * (dotSize + gap) + dotSize / 2;
        const y = row * (dotSize + gap) + dotSize / 2;

        // Draw dot with glow effect when active
        const opacity = Math.max(minOpacity, Math.min(maxOpacity, newLevel));

        // Subtle glow for bright dots
        if (opacity > 0.5 && !prefersReducedMotion.current) {
          ctx.beginPath();
          ctx.arc(x, y, dotSize / 2 + 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgbColor[0]}, ${rgbColor[1]}, ${rgbColor[2]}, ${opacity * 0.2})`;
          ctx.fill();
        }

        // Main dot
        ctx.beginPath();
        ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgbColor[0]}, ${rgbColor[1]}, ${rgbColor[2]}, ${opacity})`;
        ctx.fill();
      }
    }

    // Continue animation loop using ref to avoid stale closure
    if (isActive || isSpeaking) {
      if (drawRef.current) {
        animationRef.current = requestAnimationFrame(drawRef.current);
      }
    }
  }, [analyser, isActive, isSpeaking, rows, cols, dotSize, gap, rgbColor]);

  // Keep drawRef in sync with latest draw function
  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  // Animation loop control
  useEffect(() => {
    if (isActive || isSpeaking) {
      animationRef.current = requestAnimationFrame(draw);
    } else {
      // Draw static dim state
      draw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isActive, isSpeaking, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className={cn("rounded-lg", className)}
      style={{
        width: dimensions.width,
        height: dimensions.height,
      }}
      aria-hidden="true"
      // eslint-disable-next-line jsx-a11y/no-interactive-element-to-noninteractive-role -- Canvas is decorative visualization, not interactive
      role="presentation"
    />
  );
}
