'use client';

/**
 * Inline conversation history sidebar - matches voice panel styling
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, X, Search, MessageSquare, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConversationDrawerProps, ConversationSummary } from './types';
import { DeleteConfirmDialog } from './delete-confirm-dialog';

type DateFilter = 'all' | 'today' | 'week' | 'month';

function createGradientStyle(color: string) {
  const hex = color.startsWith('#') ? color : '#6366F1';
  return { background: `linear-gradient(180deg, ${hex}, ${hex}dd)` };
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Oggi';
  if (days === 1) return 'Ieri';
  if (days < 7) return `${days} giorni fa`;
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export function ConversationSidebar({
  open,
  onOpenChange,
  characterId,
  characterType: _characterType,
  characterColor = '#6366F1',
  onSelectConversation,
  onNewConversation,
}: ConversationDrawerProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      console.error('Failed to fetch conversations:', error);
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
    }
  }, [open]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
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
        setShowDeleteDialog(false);
      }
    } catch (error) {
      console.error('Failed to delete conversations:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="h-full flex-shrink-0 overflow-hidden rounded-2xl mr-4"
            style={gradientStyle}
          >
            <div className="w-[280px] h-full flex flex-col text-white p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Storico</h3>
                <div className="flex items-center gap-1">
                  {selectedIds.size > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowDeleteDialog(true)}
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
                  <div className="space-y-1.5">
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => onSelectConversation(conv.id)}
                        className={cn(
                          'w-full text-left p-2.5 rounded-xl transition-colors group',
                          selectedIds.has(conv.id) ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(conv.id)}
                            onChange={(e) => { e.stopPropagation(); handleToggleSelect(conv.id); }}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5 rounded border-white/30 bg-white/10"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {conv.title || 'Conversazione'}
                            </p>
                            {conv.preview && (
                              <p className="text-[10px] text-white/60 truncate mt-0.5">{conv.preview}</p>
                            )}
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-white/50">
                              <Calendar className="w-2.5 h-2.5" />
                              {formatDate(conv.lastMessageAt || conv.createdAt)}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        count={selectedIds.size}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}
