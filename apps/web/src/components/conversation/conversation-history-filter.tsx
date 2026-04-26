import { Filter, X } from 'lucide-react';
import type { MaestroFull } from '@/data/maestri';
import { useTranslations } from 'next-intl';

interface ConversationHistoryFilterProps {
  maestri: MaestroFull[];
  selectedMaestro: string;
  showFilter: boolean;
  onToggleFilter: () => void;
  onSelectMaestro: (maestroId: string) => void;
  onClearFilter: () => void;
  getMaestroName: (maestroId: string) => string;
}

export function ConversationHistoryFilter({
  maestri,
  selectedMaestro,
  showFilter,
  onToggleFilter,
  onSelectMaestro,
  onClearFilter,
  getMaestroName,
}: ConversationHistoryFilterProps) {
  const t = useTranslations('chat');

  return (
    <div className="relative">
      <button
        onClick={onToggleFilter}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
          selectedMaestro
            ? 'bg-primary-50 border-primary-300 text-primary-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Filter className="w-4 h-4" />
        <span className="text-sm">
          {selectedMaestro ? getMaestroName(selectedMaestro) : t('conversationFilter.filter')}
        </span>
        {selectedMaestro && (
          <X
            className="w-3 h-3"
            onClick={(e) => {
              e.stopPropagation();
              onClearFilter();
            }}
          />
        )}
      </button>

      {showFilter && (
        <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
          <div className="p-2">
            <button
              onClick={() => onSelectMaestro('')}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
            >
              {t('conversationFilter.allMaestri')}
            </button>
            {maestri.map((maestro) => (
              <button
                key={maestro.id}
                onClick={() => onSelectMaestro(maestro.id)}
                className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm ${
                  selectedMaestro === maestro.id ? 'bg-primary-50 text-primary-700' : ''
                }`}
              >
                {maestro.displayName}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
