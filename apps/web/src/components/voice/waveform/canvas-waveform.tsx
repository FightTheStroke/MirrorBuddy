'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { CanvasWaveformProps } from './types';

export function CanvasWaveform({
  analyser,
  isActive,
  color = '#3B82F6',
  backgroundColor = 'rgb(15, 23, 42)',
  height = 64,
  className,
}: CanvasWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(300);

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
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    const width = canvas.width;
    const canvasHeight = canvas.height;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, canvasHeight);

    ctx.lineWidth = 2;
    ctx.strokeStyle = isActive ? color : 'rgb(100, 116, 139)';
    ctx.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvasHeight) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(width, canvasHeight / 2);
    ctx.stroke();

    if (drawRef.current) {
      animationRef.current = requestAnimationFrame(drawRef.current);
    }
  }, [analyser, isActive, color, backgroundColor]);

  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  useEffect(() => {
    if (isActive && analyser) {
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
  }, [isActive, analyser, draw, backgroundColor]);

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
