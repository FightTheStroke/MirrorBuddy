'use client';

import { useState } from 'react';
import type { KeyboardLayout } from '@/types/tools';

interface GamesSelectorProps {
  layout: KeyboardLayout;
  onSelectGame: (game: 'speed' | 'accuracy' | 'exploration') => void;
}

export function GamesSelector({ layout, onSelectGame }: GamesSelectorProps) {
  const [completedGames, setCompletedGames] = useState<string[]>([]);

  const games = [
    {
      id: 'speed',
      title: 'Speed Game',
      description: 'Digita velocemente per accumulare punti',
      icon: '⚡',
    },
    {
      id: 'accuracy',
      title: 'Accuracy Game',
      description: 'Massimizza la precisione per guadagnare punti',
      icon: '🎯',
    },
    {
      id: 'exploration',
      title: 'Keyboard Exploration',
      description: 'Trova i tasti colorati per scoprire la tastiera',
      icon: '⌨️',
    },
  ] as const;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Giochi</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelectGame(game.id)}
            className="p-6 border rounded-lg bg-card hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <div className="text-4xl mb-3">{game.icon}</div>
            <h4 className="font-semibold mb-2">{game.title}</h4>
            <p className="text-sm text-muted-foreground">{game.description}</p>
            
            {completedGames.includes(game.id) && (
              <div className="mt-3 text-xs text-green-600 dark:text-green-400">
                ✓ Completato
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
