'use client';

/**
 * Knowledge Hub Search Bar
 *
 * Accessible search input with keyboard navigation and filter options.
 * WCAG 2.1 AA compliant with proper ARIA attributes.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Filter, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolType } from '@/types/tools';

export interface SearchBarProps {
  /** Current search query */
  value: string;
  /** Callback when search query changes */
  onChange: (query: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Optional type filter */
  typeFilter?: ToolType | 'all';
  /** Callback when type filter changes */
  onTypeFilterChange?: (type: ToolType | 'all') => void;
  /** Available types to filter by */
  availableTypes?: ToolType[];
  /** Whether to show filter button */
  showFilters?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Debounce delay in ms (default 300) */
  debounceMs?: number;
  /** Auto-focus on mount */
  autoFocus?: boolean;
}

const TYPE_LABELS: Record<ToolType | 'all', string> = {
  all: 'Tutti i tipi',
  mindmap: 'Mappe Mentali',
  quiz: 'Quiz',
  flashcard: 'Flashcard',
  summary: 'Riassunti',
  demo: 'Demo',
  diagram: 'Diagrammi',
  timeline: 'Timeline',
  formula: 'Formule',
  calculator: 'Calcolatrici',
  chart: 'Grafici',
  pdf: 'PDF',
  webcam: 'Immagini',
  homework: 'Compiti',
  search: 'Ricerche',
  'study-kit': 'Study Kit',
};

/**
 * Accessible search bar for Knowledge Hub materials.
 */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Cerca materiali...',
  typeFilter = 'all',
  onTypeFilterChange,
  availableTypes,
  showFilters = true,
  className,
  debounceMs = 300,
  autoFocus = false,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Auto-focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Close filter on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced change handler
  const handleChange = useCallback(
    (newValue: string) => {
      setLocalValue(newValue);

      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  // Clear search
  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        if (localValue) {
          handleClear();
        } else {
          inputRef.current?.blur();
        }
      }
    },
    [localValue, handleClear]
  );

  // Filter keyboard navigation
  const handleFilterKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setIsFilterOpen((prev) => !prev);
      } else if (event.key === 'Escape') {
        setIsFilterOpen(false);
      }
    },
    []
  );

  // Select filter option
  const handleSelectType = useCallback(
    (type: ToolType | 'all') => {
      onTypeFilterChange?.(type);
      setIsFilterOpen(false);
    },
    [onTypeFilterChange]
  );

  const types = availableTypes || (Object.keys(TYPE_LABELS) as (ToolType | 'all')[]);

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl',
          'bg-white dark:bg-slate-800',
          'border border-slate-200 dark:border-slate-700',
          'focus-within:ring-2 focus-within:ring-accent-themed focus-within:border-transparent',
          'transition-all duration-200'
        )}
      >
        <Search
          className="w-5 h-5 text-slate-400 flex-shrink-0"
          aria-hidden="true"
        />

        <input
          ref={inputRef}
          type="search"
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'flex-1 bg-transparent border-none outline-none',
            'text-slate-900 dark:text-slate-100',
            'placeholder:text-slate-400'
          )}
          aria-label="Cerca materiali"
          role="searchbox"
          autoComplete="off"
          spellCheck={false}
        />

        {localValue && (
          <button
            onClick={handleClear}
            className={cn(
              'p-1 rounded-full',
              'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
              'hover:bg-slate-100 dark:hover:bg-slate-700',
              'focus:outline-none focus:ring-2 focus:ring-accent-themed',
              'transition-colors'
            )}
            aria-label="Cancella ricerca"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {showFilters && onTypeFilterChange && (
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setIsFilterOpen((prev) => !prev)}
              onKeyDown={handleFilterKeyDown}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-lg',
                'text-sm text-slate-600 dark:text-slate-400',
                'hover:bg-slate-100 dark:hover:bg-slate-700',
                'focus:outline-none focus:ring-2 focus:ring-accent-themed',
                'transition-colors',
                typeFilter !== 'all' && 'bg-accent-themed/10 text-accent-themed'
              )}
              aria-label="Filtra per tipo"
              aria-expanded={isFilterOpen}
              aria-haspopup="listbox"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">
                {TYPE_LABELS[typeFilter]}
              </span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 transition-transform',
                  isFilterOpen && 'rotate-180'
                )}
              />
            </button>

            {isFilterOpen && (
              <div
                className={cn(
                  'absolute right-0 top-full mt-2 z-50',
                  'min-w-48 max-h-64 overflow-y-auto',
                  'bg-white dark:bg-slate-800',
                  'rounded-xl shadow-lg border border-slate-200 dark:border-slate-700',
                  'py-1'
                )}
                role="listbox"
                aria-label="Seleziona tipo materiale"
              >
                {types.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleSelectType(type)}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm',
                      'hover:bg-slate-100 dark:hover:bg-slate-700',
                      'focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-700',
                      'transition-colors',
                      type === typeFilter &&
                        'bg-accent-themed/10 text-accent-themed font-medium'
                    )}
                    role="option"
                    aria-selected={type === typeFilter}
                  >
                    {TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Screen reader announcement for results */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {localValue && `Ricerca: ${localValue}`}
      </div>
    </div>
  );
}
