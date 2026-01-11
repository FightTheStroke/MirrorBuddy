'use client';

/**
 * @file conversation-drawer.tsx
 * @brief Drawer for viewing conversation history per character
 */

import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { ConversationDrawerProps, ConversationSummary } from './types';
import { DrawerSearch, type DateFilter } from './drawer-search';
import { DrawerList } from './drawer-list';
import { DeleteConfirmDialog } from './delete-confirm-dialog';

export function ConversationDrawer({
  open,
  onOpenChange,
  characterId,
  characterType: _characterType,
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

  // Fetch conversations when drawer opens or filters change
  const fetchConversations = useCallback(async () => {
    if (!open) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('maestroId', characterId);
      if (searchQuery) params.set('q', searchQuery);

      // Apply date filter
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

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Clear selection when drawer closes
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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

  const handleSelectConversation = (id: string) => {
    onSelectConversation(id);
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-80 sm:w-96 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center justify-between">
              <span>Storico Conversazioni</span>
              <div className="flex items-center gap-1">
                {selectedIds.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="ml-1">{selectedIds.size}</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNewConversation}
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Nuova
                </Button>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-[calc(100vh-80px)]">
            <div className="p-4 border-b">
              <DrawerSearch
                onSearchChange={setSearchQuery}
                onDateFilterChange={setDateFilter}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <DrawerList
                conversations={conversations}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectConversation={handleSelectConversation}
                isLoading={isLoading}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
