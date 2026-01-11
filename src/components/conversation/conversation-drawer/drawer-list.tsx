'use client';

/**
 * @file drawer-list.tsx
 * @brief Grouped list of conversations by date
 */

import { useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import type { ConversationSummary, DateGroup } from './types';
import { DrawerItem } from './drawer-item';

interface DrawerListProps {
  conversations: ConversationSummary[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectConversation: (id: string) => void;
  isLoading?: boolean;
}

const groupLabels: Record<DateGroup, string> = {
  oggi: 'Oggi',
  ieri: 'Ieri',
  settimana: 'Questa settimana',
  mese: 'Questo mese',
  vecchie: 'Più vecchie',
};

function getDateGroup(date: Date): DateGroup {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const d = new Date(date);
  if (d >= today) return 'oggi';
  if (d >= yesterday) return 'ieri';
  if (d >= weekAgo) return 'settimana';
  if (d >= monthAgo) return 'mese';
  return 'vecchie';
}

export function DrawerList({
  conversations,
  selectedIds,
  onToggleSelect,
  onSelectConversation,
  isLoading,
}: DrawerListProps) {
  const grouped = useMemo(() => {
    const groups: Record<DateGroup, ConversationSummary[]> = {
      oggi: [],
      ieri: [],
      settimana: [],
      mese: [],
      vecchie: [],
    };

    conversations.forEach((conv) => {
      const group = getDateGroup(conv.createdAt);
      groups[group].push(conv);
    });

    return groups;
  }, [conversations]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">Nessuna conversazione</p>
      </div>
    );
  }

  const groupOrder: DateGroup[] = ['oggi', 'ieri', 'settimana', 'mese', 'vecchie'];

  return (
    <div className="space-y-4">
      {groupOrder.map((group) => {
        const items = grouped[group];
        if (items.length === 0) return null;

        return (
          <div key={group}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {groupLabels[group]}
            </h3>
            <div className="space-y-1">
              {items.map((conv) => (
                <DrawerItem
                  key={conv.id}
                  conversation={conv}
                  isSelected={selectedIds.has(conv.id)}
                  onToggleSelect={() => onToggleSelect(conv.id)}
                  onClick={() => onSelectConversation(conv.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
