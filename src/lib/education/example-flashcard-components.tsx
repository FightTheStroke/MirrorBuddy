/**
 * Flashcard UI Components
 * Flashcard session, stats, and browser components
 */

import { useState, useMemo } from 'react';
import {
  reviewCard,
  isDue,
  getDueCards,
  calculateStats,
  type Quality,
} from './fsrs';
import type { Flashcard, FlashcardSessionProps, StatCardProps } from './example-flashcard-types';
import { formatInterval, formatNextReview } from './example-flashcard-helpers';

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

  const sessionCards = useMemo(() => {
    const due = getDueCards(cards.map(c => c.fsrs), 20);
    const dueCardIds = new Set(
      due.map(d => cards.find(c => c.fsrs === d)?.id).filter(Boolean)
    );
    return cards.filter(c => dueCardIds.has(c.id));
  }, [cards]);

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
    const updatedFsrs = reviewCard(currentCard.fsrs, quality);
    onCardUpdate(currentCard.id, updatedFsrs);

    if (currentIndex < sessionCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      onSessionComplete();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
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

      <div className="bg-white rounded-lg shadow-lg p-8 min-h-[300px] flex flex-col justify-center">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {currentCard.front}
          </h3>

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
}: StatCardProps) {
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
