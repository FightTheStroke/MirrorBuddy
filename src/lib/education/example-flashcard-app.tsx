/**
 * Example Flashcard App
 * Complete example showing how to use flashcard components
 */

import { useState } from 'react';
import { createCard } from './fsrs';
import type { FSRSCard } from './fsrs';
import type { Flashcard } from './example-flashcard-types';
import {
  FlashcardSession,
  FlashcardStats,
  FlashcardBrowser,
} from './example-flashcard-components';

export function ExampleApp() {
  const [cards, setCards] = useState<Flashcard[]>([
    {
      id: '1',
      front: 'What is the capital of France?',
      back: 'Paris',
      fsrs: createCard(),
      tags: ['Geography', 'Europe'],
    },
    {
      id: '2',
      front: 'What is 2 + 2?',
      back: '4',
      fsrs: createCard(),
      tags: ['Math', 'Basic'],
    },
  ]);

  const [view, setView] = useState<'session' | 'browse' | 'stats'>('session');

  const handleCardUpdate = (id: string, fsrs: FSRSCard) => {
    setCards(prev =>
      prev.map(card =>
        card.id === id ? { ...card, fsrs } : card
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow mb-6">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex gap-4">
            <button
              onClick={() => setView('session')}
              className={`px-4 py-2 rounded ${
                view === 'session' ? 'bg-blue-600 text-white' : 'text-gray-700'
              }`}
            >
              Study
            </button>
            <button
              onClick={() => setView('browse')}
              className={`px-4 py-2 rounded ${
                view === 'browse' ? 'bg-blue-600 text-white' : 'text-gray-700'
              }`}
            >
              Browse
            </button>
            <button
              onClick={() => setView('stats')}
              className={`px-4 py-2 rounded ${
                view === 'stats' ? 'bg-blue-600 text-white' : 'text-gray-700'
              }`}
            >
              Stats
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto">
        {view === 'session' && (
          <FlashcardSession
            cards={cards}
            onCardUpdate={handleCardUpdate}
            onSessionComplete={() => setView('stats')}
          />
        )}
        {view === 'browse' && <FlashcardBrowser cards={cards} />}
        {view === 'stats' && <FlashcardStats cards={cards} />}
      </div>
    </div>
  );
}
