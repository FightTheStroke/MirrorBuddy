'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { SimpleLevelWaveformProps } from './types';

export function SimpleLevelWaveform({
  level,
  isActive,
  color = '#3B82F6',
  backgroundColor = 'rgb(15, 23, 42)',
  height = 64,
  className,
}: SimpleLevelWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(300);

  // eslint-disable-next-line react-hooks/purity -- Visual effect, randomness doesn't affect state
  const initialNoise = useMemo(() => Array.from({ length: 100 }, () => Math.random()), []);
  const noiseRef = useRef<number[]>(initialNoise);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === canvas) {
          const rect = entry.contentRect;
          setCanvasWidth(rect.width || 300);
        }
      }
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, []);

  const drawRef = useRef<(() => void) | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const canvasHeight = canvas.height;
    const centerY = canvasHeight / 2;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, canvasHeight);

    ctx.lineWidth = 2;
    ctx.strokeStyle = isActive && level > 0.01 ? color : 'rgb(100, 116, 139)';
    ctx.beginPath();

    const points = 100;
    const sliceWidth = width / points;
    const time = Date.now() / 100;

    if (isActive) {
      noiseRef.current = noiseRef.current.map((_, i) => {
        const phase = (i / points) * Math.PI * 4 + time;
        return (Math.sin(phase) + Math.sin(phase * 2.3) * 0.5 + Math.sin(phase * 0.7) * 0.3) * 0.5;
      });
    }

    for (let i = 0; i < points; i++) {
      const x = i * sliceWidth;
      const amplitude = isActive ? level * (canvasHeight / 3) : 0;
      const y = centerY + noiseRef.current[i] * amplitude;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.lineTo(width, centerY);
    ctx.stroke();

    if (isActive && drawRef.current) {
      animationRef.current = requestAnimationFrame(drawRef.current);
    }
  }, [isActive, level, color, backgroundColor]);

  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  useEffect(() => {
    if (isActive) {
      animationRef.current = requestAnimationFrame(draw);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const canvasHeight = canvas.height;
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, width, canvasHeight);
          ctx.strokeStyle = 'rgb(100, 116, 139)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, canvasHeight / 2);
          ctx.lineTo(width, canvasHeight / 2);
          ctx.stroke();
        }
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isActive, draw, backgroundColor]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={height}
      className={cn('w-full rounded-lg', className)}
      style={{ height }}
    />
  );
}
