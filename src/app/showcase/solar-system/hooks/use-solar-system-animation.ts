/**
 * Hook for solar system animation logic
 */

import { useEffect, useRef, useState } from 'react';
import { PLANETS, STARS } from '../data/planets';

interface UseSolarSystemAnimationProps {
  isPlaying: boolean;
  speed: number;
  zoom: number;
  hoveredPlanet: string | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function useSolarSystemAnimation({
  isPlaying,
  speed,
  zoom,
  hoveredPlanet,
  canvasRef,
}: UseSolarSystemAnimationProps) {
  const [time, setTime] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let lastTime = 0;
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      if (isPlaying) {
        setTime(prev => prev + deltaTime * 0.001 * speed);
      }

      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const scale = Math.min(canvas.width, canvas.height) / 1100 * zoom;

      // Draw stars
      STARS.forEach(star => {
        const twinkle = Math.sin(currentTime * 0.001 * star.twinkleSpeed) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle})`;
        ctx.beginPath();
        ctx.arc(
          (star.x / 100) * canvas.width,
          (star.y / 100) * canvas.height,
          star.size,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });

      // Draw orbits
      PLANETS.slice(1).forEach(planet => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 10]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, planet.orbitRadius * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw planets
      PLANETS.forEach(planet => {
        let x = centerX;
        let y = centerY;

        if (planet.orbitRadius > 0) {
          const angle = (time / planet.orbitPeriod) * Math.PI * 2;
          x = centerX + Math.cos(angle) * planet.orbitRadius * scale;
          y = centerY + Math.sin(angle) * planet.orbitRadius * scale;
        }

        if (planet.glow) {
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, planet.radius * scale * 2);
          gradient.addColorStop(0, 'rgba(253, 184, 19, 0.8)');
          gradient.addColorStop(0.4, 'rgba(253, 184, 19, 0.3)');
          gradient.addColorStop(1, 'rgba(253, 184, 19, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, planet.radius * scale * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = planet.color;
        ctx.beginPath();
        ctx.arc(x, y, planet.radius * scale, 0, Math.PI * 2);
        ctx.fill();

        if (planet.hasRings) {
          ctx.strokeStyle = 'rgba(228, 209, 145, 0.6)';
          ctx.lineWidth = 3 * scale;
          ctx.beginPath();
          ctx.ellipse(x, y, planet.radius * scale * 1.8, planet.radius * scale * 0.4, 0.3, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (hoveredPlanet === planet.id) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, planet.radius * scale + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (planet.id !== 'sun' && zoom > 0.7) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(planet.nameIt, x, y + planet.radius * scale + 18);
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, speed, zoom, hoveredPlanet, time, canvasRef]);

  return { time, setTime };
}
