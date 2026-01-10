import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ConversationHistoryPaginationProps {
  pagination: PaginationData;
  onPageChange: (page: number) => void;
}

export function ConversationHistoryPagination({
  pagination,
  onPageChange,
}: ConversationHistoryPaginationProps) {
  if (pagination.totalPages <= 1) {
    return null;
  }

  return (
    <div className="border-t p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Pagina {pagination.page} di {pagination.totalPages}
          <span className="text-gray-400 ml-2">
            ({pagination.total} {pagination.total === 1 ? 'conversazione' : 'conversazioni'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={!pagination.hasPrevPage}
            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            aria-label="Pagina precedente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!pagination.hasNextPage}
            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            aria-label="Pagina successiva"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
