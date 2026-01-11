'use client';

/**
 * @file drawer-item.tsx
 * @brief Single conversation item in drawer list
 */

import { cn } from '@/lib/utils';
import type { ConversationSummary } from './types';

interface DrawerItemProps {
  conversation: ConversationSummary;
  isSelected: boolean;
  onToggleSelect: () => void;
  onClick: () => void;
}

/**
 * Format date to relative time string (e.g., "2 ore fa", "ieri")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'ora';
  if (minutes < 60) return `${minutes}m fa`;
  if (hours < 24) return `${hours}h fa`;
  if (days === 1) return 'ieri';
  if (days < 7) return `${days}g fa`;
  if (days < 30) return `${Math.floor(days / 7)}s fa`;
  return `${Math.floor(days / 30)}m fa`;
}

export function DrawerItem({
  conversation,
  isSelected,
  onToggleSelect,
  onClick,
}: DrawerItemProps) {
  const title = conversation.title || 'Conversazione senza titolo';
  const timeAgo = formatRelativeTime(conversation.createdAt);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect();
  };

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
        'hover:bg-accent/50',
        isSelected && 'bg-accent'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      {/* Checkbox */}
      <div
        className="pt-0.5 flex-shrink-0"
        onClick={handleCheckboxClick}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 cursor-pointer rounded border-gray-300 accent-primary"
          aria-label="Select conversation"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title and Date */}
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-medium text-sm truncate text-foreground">
            {title}
          </h4>
          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
            {timeAgo}
          </span>
        </div>

        {/* Preview */}
        {conversation.preview && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {conversation.preview}
          </p>
        )}

        {/* Message count badge */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {conversation.messageCount} msg
          </span>
        </div>
      </div>
    </div>
  );
}
