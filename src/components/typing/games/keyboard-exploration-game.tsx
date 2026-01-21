'use client';

import { useState, useEffect } from 'react';
import { KEYBOARD_LAYOUTS } from '@/lib/typing/keyboard-layouts';
import { cn } from '@/lib/utils';
import type { KeyboardLayout } from '@/types/tools';

interface KeyboardExplorationGameProps {
  layout: KeyboardLayout;
  onGameEnd: (score: number) => void;
}

export function KeyboardExplorationGame({
  layout,
  onGameEnd,
}: KeyboardExplorationGameProps) {
  const [targetKey, setTargetKey] = useState<{ key: string; color: string } | null>(null);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [round, setRound] = useState(0);

  const MAX_ROUNDS = 10;

  const KEY_COLORS = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-teal-500',
  ];

  useEffect(() => {
    if (isPlaying && round < MAX_ROUNDS) {
      pickRandomKey();
    }
  }, [round, isPlaying]);

  const pickRandomKey = () => {
    const layoutConfig = KEYBOARD_LAYOUTS[layout];
    const allKeys = layoutConfig.rows.flat();
    const randomKey = allKeys[Math.floor(Math.random() * allKeys.length)];
    const randomColor = KEY_COLORS[Math.floor(Math.random() * KEY_COLORS.length)];
    
    setTargetKey({
      key: randomKey.key,
      color: randomColor,
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isPlaying || !targetKey) return;

    if (e.key.toLowerCase() === targetKey.key.toLowerCase()) {
      setScore(score + 10);
      
      if (round < MAX_ROUNDS - 1) {
        setRound(round + 1);
      } else {
        endGame();
      }
    }
  };

  useEffect(() => {
    if (isPlaying) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isPlaying, targetKey, round, score]);

  const startGame = () => {
    setIsPlaying(true);
    setScore(0);
    setRound(0);
  };

  const endGame = () => {
    setIsPlaying(false);
    onGameEnd(score);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h3 className="text-xl font-bold">Keyboard Exploration</h3>

      <p className="text-sm text-muted-foreground">
        Trova e premi il tasto colorato. Scopri il layout della tastiera!
      </p>

      {!isPlaying ? (
        <button
          onClick={startGame}
          className="w-full py-4 bg-primary text-primary-foreground rounded-lg text-lg font-semibold hover:bg-primary/90"
        >
          Inizia Gioco
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="text-sm text-muted-foreground">Punti</div>
              <div className="text-2xl font-bold">{score}</div>
            </div>
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="text-sm text-muted-foreground">Round</div>
              <div className="text-2xl font-bold">{round + 1}/{MAX_ROUNDS}</div>
            </div>
          </div>

          {targetKey && (
            <div className="p-8 bg-muted/30 border border-border rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Premi il tasto colorato:
              </p>
              <div className={cn(
                'w-16 h-16 rounded-lg mx-auto flex items-center justify-center text-3xl font-bold text-white',
                targetKey.color
              )}>
                {targetKey.key}
              </div>
            </div>
          )}

          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm">
              <strong>Indizio:</strong> Guarda la tastiera qui sotto per trovare il tasto colorato.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
