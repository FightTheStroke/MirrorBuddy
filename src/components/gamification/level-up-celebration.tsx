/**
 * Level Up Celebration Component
 * Fullscreen overlay with celebration animation
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Pre-generate confetti positions to avoid Math.random during render
function generateConfettiParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${(i * 2) % 100}%`,
    delay: `${(i * 0.04) % 2}s`,
    duration: `${3 + (i % 3)}s`,
  }));
}

const CONFETTI_PARTICLES = generateConfettiParticles(50);

interface LevelUpCelebrationProps {
  level: number;
  rewards?: {
    mirrorBucks: number;
    achievements?: string[];
  };
  coachMessage?: string;
  onDismiss: () => void;
}

export function LevelUpCelebration({
  level,
  rewards,
  coachMessage,
  onDismiss,
}: LevelUpCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const mountedRef = React.useRef(false);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300);
  }, [onDismiss]);

  useEffect(() => {
    mountedRef.current = true;

    // Trigger animation after mount
    const showTimer = setTimeout(() => setIsVisible(true), 50);

    // Auto-dismiss after 5 seconds
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [handleDismiss]);

  // SSR check
  if (typeof window === 'undefined') return null;

  const content = (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleDismiss}
      role="dialog"
      aria-labelledby="level-up-title"
      aria-modal="true"
    >
      {/* Confetti-like elements using CSS */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {CONFETTI_PARTICLES.map((particle) => (
          <div
            key={particle.id}
            className="confetti-particle"
            style={{
              left: particle.left,
              top: `-10%`,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>

      <div
        className={`relative max-w-md space-y-6 rounded-2xl bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-cyan-500/20 p-8 text-center backdrop-blur-xl transition-transform duration-500 ${
          isVisible ? 'scale-100' : 'scale-75'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Level badge */}
        <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-2xl shadow-yellow-500/50 animate-pulse-slow">
          <div className="text-6xl font-black text-white">{level}</div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2
            id="level-up-title"
            className="text-4xl font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 bg-clip-text text-transparent"
          >
            LEVEL UP!
          </h2>
          <p className="text-xl font-semibold text-white">Livello {level} Raggiunto!</p>
        </div>

        {/* Coach message */}
        {coachMessage && (
          <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-sm text-white/90">{coachMessage}</p>
          </div>
        )}

        {/* Rewards */}
        {rewards && (
          <div className="space-y-3">
            {rewards.mirrorBucks > 0 && (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-500/20 py-2 px-4">
                <span className="text-2xl">💎</span>
                <span className="text-lg font-semibold text-white">
                  +{rewards.mirrorBucks} MirrorBucks
                </span>
              </div>
            )}

            {rewards.achievements && rewards.achievements.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-white/70">
                  Nuovi Achievement
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {rewards.achievements.map((achievement, i) => (
                    <div
                      key={i}
                      className="rounded-full bg-yellow-500/20 px-3 py-1 text-sm font-medium text-yellow-300"
                    >
                      {achievement}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dismiss hint */}
        <p className="text-xs text-white/50">Clicca ovunque per continuare</p>
      </div>

      <style jsx>{`
        .confetti-particle {
          position: absolute;
          width: 10px;
          height: 10px;
          background: linear-gradient(
            45deg,
            #fbbf24,
            #f97316,
            #ec4899,
            #8b5cf6,
            #3b82f6,
            #10b981
          );
          border-radius: 50%;
          animation: confetti-fall linear forwards;
          opacity: 0.8;
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
}
