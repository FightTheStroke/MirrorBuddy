'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PDFPreviewFooterProps {
  selectedCount: number;
  allowMultiSelect: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function PDFPreviewFooter({
  selectedCount,
  allowMultiSelect,
  onClose,
  onConfirm,
}: PDFPreviewFooterProps) {
  return (
    <div className="p-4 border-t border-slate-700 flex items-center justify-between">
      <div className="text-sm text-slate-400">
        {selectedCount} pagin{selectedCount === 1 ? 'a' : 'e'} selezionat{selectedCount === 1 ? 'a' : 'e'}
        {allowMultiSelect && (
          <span className="ml-2">(clicca per selezionare/deselezionare)</span>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose} className="border-slate-600">
          Annulla
        </Button>
        <Button
          onClick={onConfirm}
          className="bg-green-600 hover:bg-green-700"
          disabled={selectedCount === 0}
        >
          <Check className="w-4 h-4 mr-2" />
          Analizza {selectedCount > 1 ? `${selectedCount} pagine` : 'pagina'}
        </Button>
      </div>
    </div>
  );
}
