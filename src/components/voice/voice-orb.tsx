'use client';

/**
 * VoiceOrb - ChatGPT-style voice-reactive blob/orb visualization
 *
 * Renders an organic, pulsating blob that reacts to audio levels.
 * When silent: nearly static circle
 * When speaking: organic blob that deforms based on actual audio amplitude
 */

import { useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface VoiceOrbProps {
  level: number; // 0-1 audio level
  isActive: boolean;
  color?: string; // Primary color (hex)
  glowColor?: string; // Glow color
  size?: number; // Diameter in pixels
  className?: string;
}

// Simple noise for organic movement
function createNoise() {
  const permutation = new Array(256).fill(0).map((_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
  }
  const p = [...permutation, ...permutation];

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);
  const grad = (hash: number, x: number, y: number) => {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };

  return (x: number, y: number) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);

    const aa = p[p[X] + Y];
    const ab = p[p[X] + Y + 1];
    const ba = p[p[X + 1] + Y];
    const bb = p[p[X + 1] + Y + 1];

    return lerp(
      lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
      lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
      v
    );
  };
}

export function VoiceOrb({
  level,
  isActive,
  color = '#3B82F6',
  glowColor,
  size = 120,
  className,
}: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const noiseRef = useRef<((x: number, y: number) => number) | null>(null);
  const smoothLevelRef = useRef(0);
  const timeRef = useRef(0);
  const lastLevelRef = useRef(0);
  const drawRef = useRef<(() => void) | null>(null);

  // Parse hex color to RGB
  const hexToRgb = useCallback((hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 59, g: 130, b: 246 };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const noise = noiseRef.current;

    if (!canvas || !ctx || !noise) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const centerX = width / 2;
    const centerY = height / 2;

    // Audio level processing - more aggressive smoothing when dropping
    const targetLevel = isActive ? Math.max(0.02, level) : 0;
    const currentSmooth = smoothLevelRef.current;

    // Fast attack, slower decay for natural feel
    const attackSpeed = 0.4;
    const decaySpeed = 0.08;
    const speed = targetLevel > currentSmooth ? attackSpeed : decaySpeed;
    smoothLevelRef.current += (targetLevel - currentSmooth) * speed;

    const smoothLevel = smoothLevelRef.current;

    // Track if audio just changed significantly
    const levelDelta = Math.abs(level - lastLevelRef.current);
    lastLevelRef.current = level;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Time progression - faster when audio active, very slow when idle
    const baseSpeed = isActive && smoothLevel > 0.05 ? 0.03 : 0.003;
    // Add extra speed burst when audio level changes
    const burstSpeed = levelDelta * 0.5;
    timeRef.current += baseSpeed + burstSpeed;
    const time = timeRef.current;

    // Base radius
    const baseRadius = (size / 2) * 0.65;

    const rgb = hexToRgb(color);
    const glowRgb = hexToRgb(glowColor || color);

    // Draw glow only when actively speaking with significant level
    if (isActive && smoothLevel > 0.1) {
      const glowIntensity = Math.min(1, smoothLevel * 2);
      const glowRadius = baseRadius * (1.3 + smoothLevel * 0.5);

      const gradient = ctx.createRadialGradient(
        centerX, centerY, baseRadius * 0.5,
        centerX, centerY, glowRadius
      );
      gradient.addColorStop(0, `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, ${0.3 * glowIntensity})`);
      gradient.addColorStop(0.5, `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, ${0.15 * glowIntensity})`);
      gradient.addColorStop(1, `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, 0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Draw the blob
    ctx.beginPath();

    const points = 120;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;

      // Noise-based deformation - ONLY when there's actual audio
      let deformation = 1;

      if (smoothLevel > 0.02) {
        // Multiple frequency noise for organic shape
        const noiseX = Math.cos(angle) * 2;
        const noiseY = Math.sin(angle) * 2;

        // Low frequency - large gentle waves
        const noise1 = noise(noiseX + time * 0.5, noiseY + time * 0.5) * 0.5;
        // Higher frequency - smaller ripples (only when loud)
        const noise2 = smoothLevel > 0.2
          ? noise(noiseX * 3 + time, noiseY * 3 + time) * 0.3
          : 0;
        // Audio-reactive spikes
        const noise3 = noise(noiseX * 5 + time * 2, noiseY * 5) * smoothLevel * 0.4;

        const combinedNoise = noise1 + noise2 + noise3;

        // Deformation scales with audio level - silent = circle, loud = blob
        const maxDeform = 0.25 * smoothLevel;
        deformation = 1 + combinedNoise * maxDeform;
      }

      // Gentle breathing when idle (very subtle)
      const idleBreath = isActive ? 0 : Math.sin(time * 2) * 0.01;

      const radius = baseRadius * deformation * (1 + idleBreath);

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();

    // Fill gradient - brighter when speaking
    const brightness = isActive ? 0.9 + smoothLevel * 0.1 : 0.7;
    const gradient = ctx.createRadialGradient(
      centerX - baseRadius * 0.2,
      centerY - baseRadius * 0.2,
      0,
      centerX,
      centerY,
      baseRadius * 1.2
    );

    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.95 * brightness})`);
    gradient.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.9 * brightness})`);
    gradient.addColorStop(0.7, `rgba(${rgb.r * 0.8}, ${rgb.g * 0.8}, ${rgb.b * 0.8}, ${0.85 * brightness})`);
    gradient.addColorStop(1, `rgba(${rgb.r * 0.5}, ${rgb.g * 0.5}, ${rgb.b * 0.5}, ${0.8 * brightness})`);

    ctx.fillStyle = gradient;
    ctx.fill();

    // Subtle inner highlight
    if (smoothLevel > 0.1) {
      const highlightGradient = ctx.createRadialGradient(
        centerX - baseRadius * 0.3,
        centerY - baseRadius * 0.3,
        0,
        centerX,
        centerY,
        baseRadius * 0.6
      );
      highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${0.3 * smoothLevel})`);
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = highlightGradient;
      ctx.fill();
    }

    animationRef.current = requestAnimationFrame(() => {
      if (drawRef.current) drawRef.current();
    });
  }, [level, isActive, color, glowColor, size, hexToRgb]);

  // Setup canvas and animation
  useEffect(() => {
    // Initialize noise
    if (!noiseRef.current) {
      noiseRef.current = createNoise();
    }

    // Store draw function in ref to enable recursion without linter issues
    drawRef.current = draw;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size, draw]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('rounded-full', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
