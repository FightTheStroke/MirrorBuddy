/**
 * Example Flashcard Component using FSRS
 *
 * This demonstrates how to integrate the FSRS algorithm into a React flashcard UI.
 * Copy and adapt this code for your own flashcard components.
 */

import { useState, useMemo } from 'react';
import {
  createCard,
  reviewCard,
  isDue,
  getDueCards,
  calculateStats,
  type FSRSCard,
  type Quality,
} from './fsrs';

// ============================================================================
// TYPES
// ============================================================================

interface Flashcard {
  id: string;
  front: string;
  back: string;
  fsrs: FSRSCard;
  tags?: string[];
}

interface FlashcardSessionProps {
  cards: Flashcard[];
  onCardUpdate: (id: string, fsrs: FSRSCard) => void;
  onSessionComplete: () => void;
}

// ============================================================================
// FLASHCARD SESSION COMPONENT
// ============================================================================

export function FlashcardSession({
  cards,
  onCardUpdate,
  onSessionComplete,
}: FlashcardSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // Initialize session with due cards (derived from props, no state needed)
  const sessionCards = useMemo(() => {
    const due = getDueCards(cards.map(c => c.fsrs), 20);
    const dueCardIds = new Set(
      due.map(d => cards.find(c => c.fsrs === d)?.id).filter(Boolean)
    );
    return cards.filter(c => dueCardIds.has(c.id));
  }, [cards]);

  // No cards due
  if (sessionCards.length === 0) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4">All Caught Up!</h2>
        <p className="text-gray-600">No cards are due for review right now.</p>
        <p className="text-sm text-gray-500 mt-2">
          Come back later for your next review session.
        </p>
      </div>
    );
  }

  const currentCard = sessionCards[currentIndex];
  const progress = ((currentIndex + 1) / sessionCards.length) * 100;

  const handleQuality = (quality: Quality) => {
    // Update FSRS state
    const updatedFsrs = reviewCard(currentCard.fsrs, quality);
    onCardUpdate(currentCard.id, updatedFsrs);

    // Move to next card or complete session
    if (currentIndex < sessionCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      onSessionComplete();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Card {currentIndex + 1} of {sessionCards.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-lg shadow-lg p-8 min-h-[300px] flex flex-col justify-center">
        {/* Question */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {currentCard.front}
          </h3>

          {/* Tags */}
          {currentCard.tags && currentCard.tags.length > 0 && (
            <div className="flex gap-2 justify-center flex-wrap">
              {currentCard.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Answer (revealed on click) */}
        {showAnswer ? (
          <div className="text-center mb-6">
            <div className="border-t pt-6">
              <p className="text-lg text-gray-700">{currentCard.back}</p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAnswer(true)}
            className="mx-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Show Answer
          </button>
        )}
      </div>

      {/* Quality Buttons */}
      {showAnswer && (
        <div className="mt-6 grid grid-cols-4 gap-3">
          <button
            onClick={() => handleQuality(1)}
            className="px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
          >
            Again
            <span className="block text-xs text-red-600 mt-1">&lt; 1m</span>
          </button>
          <button
            onClick={() => handleQuality(2)}
            className="px-4 py-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors font-medium"
          >
            Hard
            <span className="block text-xs text-orange-600 mt-1">&lt; 10m</span>
          </button>
          <button
            onClick={() => handleQuality(3)}
            className="px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
          >
            Good
            <span className="block text-xs text-green-600 mt-1">
              {formatInterval(currentCard.fsrs)}
            </span>
          </button>
          <button
            onClick={() => handleQuality(4)}
            className="px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
          >
            Easy
            <span className="block text-xs text-blue-600 mt-1">
              {formatInterval(currentCard.fsrs, 1.5)}
            </span>
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-4 text-center text-sm text-gray-500">
        <p>Keyboard: 1 (Again) • 2 (Hard) • 3 (Good) • 4 (Easy) • Space (Show)</p>
      </div>
    </div>
  );
}

// ============================================================================
// STATS DASHBOARD COMPONENT
// ============================================================================

export function FlashcardStats({ cards }: { cards: Flashcard[] }) {
  const stats = calculateStats(cards.map(c => c.fsrs));

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-6">
      <StatCard
        label="Total Cards"
        value={stats.totalCards}
        icon="📚"
      />
      <StatCard
        label="Due Today"
        value={stats.cardsDue}
        icon="⏰"
        highlight={stats.cardsDue > 0}
      />
      <StatCard
        label="Mastered"
        value={stats.cardsMastered}
        icon="⭐"
      />
      <StatCard
        label="Avg Stability"
        value={`${stats.avgStability.toFixed(1)}d`}
        icon="📈"
      />
      <StatCard
        label="Avg Difficulty"
        value={`${(stats.avgDifficulty * 100).toFixed(0)}%`}
        icon="🎯"
      />
      <StatCard
        label="Retention"
        value={`${(stats.predictedRetention * 100).toFixed(0)}%`}
        icon="🧠"
        highlight={stats.predictedRetention >= 0.9}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: string | number;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-lg shadow p-4 ${
        highlight ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span
          className={`text-2xl font-bold ${
            highlight ? 'text-blue-600' : 'text-gray-900'
          }`}
        >
          {value}
        </span>
      </div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

// ============================================================================
// CARD BROWSER COMPONENT
// ============================================================================

export function FlashcardBrowser({ cards }: { cards: Flashcard[] }) {
  const [filter, setFilter] = useState<'all' | 'due' | 'mastered'>('all');

  const filteredCards = cards.filter(card => {
    if (filter === 'due') return isDue(card.fsrs);
    if (filter === 'mastered') return card.fsrs.stability > 30;
    return true;
  });

  return (
    <div className="p-6">
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <FilterButton
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          All Cards
        </FilterButton>
        <FilterButton
          active={filter === 'due'}
          onClick={() => setFilter('due')}
        >
          Due ({cards.filter(c => isDue(c.fsrs)).length})
        </FilterButton>
        <FilterButton
          active={filter === 'mastered'}
          onClick={() => setFilter('mastered')}
        >
          Mastered ({cards.filter(c => c.fsrs.stability > 30).length})
        </FilterButton>
      </div>

      {/* Card List */}
      <div className="space-y-3">
        {filteredCards.map(card => (
          <div
            key={card.id}
            className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {card.front}
                </h4>
                <p className="text-sm text-gray-600">{card.back}</p>
              </div>

              <div className="text-right ml-4">
                <div className="text-sm font-medium text-gray-900">
                  {isDue(card.fsrs) ? (
                    <span className="text-red-600">Due Now</span>
                  ) : (
                    <span className="text-gray-500">
                      {formatNextReview(card.fsrs.nextReview)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Stability: {card.fsrs.stability.toFixed(1)}d
                </div>
                <div className="text-xs text-gray-500">
                  Reviews: {card.fsrs.reps}
                  {card.fsrs.lapses > 0 && ` • Lapses: ${card.fsrs.lapses}`}
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredCards.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No cards in this category
          </div>
        )}
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatInterval(card: FSRSCard, multiplier: number = 1): string {
  const now = new Date();
  const next = new Date(card.nextReview);
  const hours = ((next.getTime() - now.getTime()) / (1000 * 60 * 60)) * multiplier;

  if (hours < 1) return '< 1h';
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  return `${months}mo`;
}

function formatNextReview(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = diff / (1000 * 60 * 60);
  const days = hours / 24;

  if (days < 1) return `In ${Math.round(hours)}h`;
  if (days < 7) return `In ${Math.round(days)}d`;
  if (days < 30) return `In ${Math.round(days / 7)}w`;
  return date.toLocaleDateString();
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

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
      {/* Navigation */}
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

      {/* Content */}
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
