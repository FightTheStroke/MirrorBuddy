'use client';

/**
 * Inline conversation history sidebar - matches voice panel styling
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, X, Search, MessageSquare, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConversationDrawerProps, ConversationSummary, DateFilter } from './types';

type DateGroup = 'oggi' | 'ieri' | 'settimana' | 'mese' | 'vecchie';

const groupLabels: Record<DateGroup, string> = {
  oggi: 'Oggi',
  ieri: 'Ieri',
  settimana: 'Questa settimana',
  mese: 'Questo mese',
  vecchie: 'Più vecchie',
};

function createGradientStyle(color: string) {
  const hex = color.startsWith('#') ? color : '#6366F1';
  return { background: `linear-gradient(180deg, ${hex}, ${hex}dd)` };
}

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

export function ConversationSidebar({
  open,
  onOpenChange,
  characterId,
  characterColor = '#6366F1',
  onSelectConversation,
  onNewConversation,
}: ConversationDrawerProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const gradientStyle = createGradientStyle(characterColor);
  const buttonBg = 'bg-white/20 hover:bg-white/30';

  const fetchConversations = useCallback(async () => {
    if (!open) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('maestroId', characterId);
      if (searchQuery) params.set('q', searchQuery);
      const now = new Date();
      if (dateFilter === 'today') {
        params.set('dateFrom', new Date(now.setHours(0, 0, 0, 0)).toISOString());
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        params.set('dateFrom', weekAgo.toISOString());
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        params.set('dateFrom', monthAgo.toISOString());
      }
      const res = await fetch(`/api/conversations/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.map((c: ConversationSummary) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt) : null,
        })));
      }
    } catch (error) {
      logger.error('Failed to fetch conversations', { error: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, [open, characterId, searchQuery, dateFilter]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
      setSearchQuery('');
      setDateFilter('all');
      setShowDeleteConfirm(false);
    }
  }, [open]);

  const grouped = useMemo(() => {
    const groups: Record<DateGroup, ConversationSummary[]> = {
      oggi: [], ieri: [], settimana: [], mese: [], vecchie: [],
    };
    conversations.forEach((conv) => {
      const group = getDateGroup(conv.lastMessageAt || conv.createdAt);
      groups[group].push(conv);
    });
    return groups;
  }, [conversations]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteClick = () => {
    if (selectedIds.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/conversations/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => !selectedIds.has(c.id)));
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      logger.error('Failed to delete conversations', { error: String(error) });
    } finally {
      setIsDeleting(false);
    }
  };

  const groupOrder: DateGroup[] = ['oggi', 'ieri', 'settimana', 'mese', 'vecchie'];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="h-full flex-shrink-0 overflow-hidden rounded-2xl"
          style={gradientStyle}
        >
          <div className="w-[280px] h-full flex flex-col text-white p-4">
            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center p-4 rounded-2xl">
                <div className="bg-slate-800 rounded-xl p-4 max-w-[240px] text-center">
                  <p className="text-sm mb-3">
                    Eliminare {selectedIds.size} conversazion{selectedIds.size === 1 ? 'e' : 'i'}?
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                      Annulla
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                      {isDeleting ? 'Elimino...' : 'Elimina'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Storico</h3>
              <div className="flex items-center gap-1">
                {selectedIds.size > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDeleteClick}
                    className={cn('rounded-full h-7 w-7', 'bg-red-500/50 hover:bg-red-500/70 text-white')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={onNewConversation} className={cn('rounded-full h-7 w-7', buttonBg, 'text-white')}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className={cn('rounded-full h-7 w-7', buttonBg, 'text-white')}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60" />
              <Input
                placeholder="Cerca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20"
              />
            </div>

            {/* Date filters */}
            <div className="flex gap-1 mb-3">
              {(['all', 'today', 'week', 'month'] as DateFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setDateFilter(f)}
                  className={cn(
                    'px-2 py-1 text-[10px] rounded-full transition-colors',
                    dateFilter === f ? 'bg-white/30 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                  )}
                >
                  {f === 'all' ? 'Tutte' : f === 'today' ? 'Oggi' : f === 'week' ? '7gg' : '30gg'}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto -mx-2 px-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-white/60">
                  <MessageSquare className="w-8 h-8 mb-2" />
                  <p className="text-xs">Nessuna conversazione</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupOrder.map((group) => {
                    const items = grouped[group];
                    if (items.length === 0) return null;
                    return (
                      <div key={group}>
                        <h4 className="text-[10px] font-medium text-white/50 uppercase tracking-wider mb-1.5 px-1">
                          {groupLabels[group]}
                        </h4>
                        <div className="space-y-1">
                          {items.map((conv) => (
                            <button
                              key={conv.id}
                              onClick={() => onSelectConversation(conv.id)}
                              className={cn(
                                'w-full text-left p-2 rounded-lg transition-colors',
                                selectedIds.has(conv.id) ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(conv.id)}
                                  onChange={() => handleToggleSelect(conv.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-0.5 h-4 w-4 rounded border-2 border-white/50 bg-white/20 checked:bg-white checked:border-white accent-slate-800 cursor-pointer"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{conv.title || 'Conversazione'}</p>
                                  {conv.preview && (
                                    <p className="text-[10px] text-white/60 truncate mt-0.5">{conv.preview}</p>
                                  )}
                                  <div className="flex items-center gap-1 mt-1 text-[10px] text-white/50">
                                    <Calendar className="w-2.5 h-2.5" />
                                    {conv.messageCount} msg
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
