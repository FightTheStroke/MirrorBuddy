'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { logger } from '@/lib/logger';
import { getAllMaestri } from '@/data/maestri';
import type { MaestroFull } from '@/data/maestri';
import { ConversationHistoryItem } from './conversation-history-item';
import { ConversationHistoryFilter } from './conversation-history-filter';
import { ConversationHistoryPagination } from './conversation-history-pagination';

interface Conversation {
  id: string;
  maestroId: string;
  title: string;
  topics: string[];
  isActive: boolean;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ConversationHistoryProps {
  onConversationSelect?: (conversationId: string) => void;
}

export function ConversationHistory({ onConversationSelect }: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [selectedMaestro, setSelectedMaestro] = useState<string>('');
  const [showFilter, setShowFilter] = useState(false);
  const [maestri] = useState<MaestroFull[]>(() => getAllMaestri());

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (selectedMaestro) {
        params.append('maestroId', selectedMaestro);
      }

      const response = await fetch(`/api/conversations?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      setConversations(data.items || []);
      setPagination(data.pagination);
    } catch (error) {
      logger.error('Error fetching conversations', { error: String(error) });
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, selectedMaestro]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  function handlePageChange(newPage: number) {
    setPagination(prev => ({ ...prev, page: newPage }));
  }

  function handleMaestroFilter(maestroId: string) {
    setSelectedMaestro(maestroId);
    setPagination(prev => ({ ...prev, page: 1 }));
    setShowFilter(false);
  }

  function clearFilter() {
    setSelectedMaestro('');
    setPagination(prev => ({ ...prev, page: 1 }));
  }

  function getMaestroName(maestroId: string): string {
    const maestro = maestri.find(m => m.id === maestroId);
    return maestro?.displayName || maestroId;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Oggi';
    if (diffDays === 1) return 'Ieri';
    if (diffDays < 7) return `${diffDays} giorni fa`;

    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }

  if (loading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold">Cronologia Conversazioni</h2>
        </div>

        <ConversationHistoryFilter
          maestri={maestri}
          selectedMaestro={selectedMaestro}
          showFilter={showFilter}
          onToggleFilter={() => setShowFilter(!showFilter)}
          onSelectMaestro={handleMaestroFilter}
          onClearFilter={clearFilter}
          getMaestroName={getMaestroName}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500">
              {selectedMaestro
                ? `Nessuna conversazione con ${getMaestroName(selectedMaestro)}`
                : 'Nessuna conversazione trovata'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {conversations.map(conversation => (
              <ConversationHistoryItem
                key={conversation.id}
                conversation={conversation}
                maestroName={getMaestroName(conversation.maestroId)}
                onSelect={onConversationSelect || (() => {})}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>

      <ConversationHistoryPagination
        pagination={pagination}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
