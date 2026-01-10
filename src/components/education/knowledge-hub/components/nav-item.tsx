'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  isSelected?: boolean;
  isExpanded?: boolean;
  hasChildren?: boolean;
  level?: number;
  onClick: () => void;
  onExpand?: () => void;
}

export function NavItem({
  icon,
  label,
  count,
  isSelected,
  isExpanded,
  hasChildren,
  level = 0,
  onClick,
  onExpand,
}: NavItemProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    } else if (e.key === 'ArrowRight' && hasChildren && !isExpanded) {
      e.preventDefault();
      onExpand?.();
    } else if (e.key === 'ArrowLeft' && hasChildren && isExpanded) {
      e.preventDefault();
      onExpand?.();
    }
  };

  return (
    <div
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left',
        'hover:bg-slate-100 dark:hover:bg-slate-700',
        'transition-colors',
        isSelected && 'bg-accent-themed/10 text-accent-themed',
        !isSelected && 'text-slate-700 dark:text-slate-300'
      )}
      style={{ paddingLeft: `${12 + level * 16}px` }}
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={hasChildren ? isExpanded : undefined}
    >
      {hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand?.();
          }}
          className="p-0.5 -ml-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-accent-themed"
          aria-label={isExpanded ? 'Chiudi cartella' : 'Apri cartella'}
        >
          <ChevronRight
            className={cn(
              'w-4 h-4 transition-transform',
              isExpanded && 'rotate-90'
            )}
          />
        </button>
      )}
      <button
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className="flex-1 flex items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-accent-themed focus:ring-inset rounded"
      >
        <span className="flex-shrink-0">{icon}</span>
        <span className="flex-1 truncate text-sm">{label}</span>
      </button>
      {count !== undefined && count > 0 && (
        <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
          {count}
        </span>
      )}
    </div>
  );
}
