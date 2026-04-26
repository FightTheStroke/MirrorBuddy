'use client';

/**
 * Star Rating Component (1-5 stars)
 */

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number | undefined;
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md';
}

export function StarRating({
  rating,
  onRate,
  readonly = false,
  size = 'sm',
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const currentRating = hoverRating || rating || 0;
  const starSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHoverRating(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={(e) => {
            e.stopPropagation();
            onRate?.(star);
          }}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          className={cn(
            'transition-colors',
            !readonly && 'cursor-pointer hover:scale-110',
            readonly && 'cursor-default'
          )}
          aria-label={`${star} stelle`}
        >
          <Star
            className={cn(
              starSize,
              star <= currentRating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-slate-300 dark:text-slate-600'
            )}
          />
        </button>
      ))}
    </div>
  );
}
