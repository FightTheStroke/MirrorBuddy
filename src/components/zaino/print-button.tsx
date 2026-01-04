'use client';

/**
 * Print Button Component
 *
 * Provides accessible print functionality for Zaino materials.
 * Reads user accessibility settings and applies them to printed content.
 */

import { useState, useCallback } from 'react';
import { Printer, Loader2, Download, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import {
  printAccessible,
  downloadAsHtml,
  type PrintableContentType,
} from '@/lib/tools/accessible-print';
import { toast } from '@/components/ui/toast';
import { logger } from '@/lib/logger';

interface PrintButtonProps {
  title: string;
  contentType: PrintableContentType;
  content: unknown;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showDownloadOption?: boolean;
}

export function PrintButton({
  title,
  contentType,
  content,
  className,
  variant = 'outline',
  size = 'sm',
  showDownloadOption = true,
}: PrintButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const settings = useAccessibilityStore((s) => s.settings);

  const handlePrint = useCallback(async () => {
    setIsPrinting(true);
    try {
      await printAccessible({
        title,
        contentType,
        content,
        accessibility: settings,
        showDate: true,
        showWatermark: true,
      });
      toast.success('Stampa avviata', 'Il documento si aprira nella finestra di stampa.');
    } catch (error) {
      logger.error('[PrintButton] Print failed', { error: String(error) });
      toast.error('Errore di stampa', 'Impossibile aprire la finestra di stampa. Controlla le impostazioni popup.');
    } finally {
      setIsPrinting(false);
    }
  }, [title, contentType, content, settings]);

  const handleDownload = useCallback(() => {
    try {
      downloadAsHtml({
        title,
        contentType,
        content,
        accessibility: settings,
        showDate: true,
        showWatermark: true,
      });
      toast.success('Download completato', 'Il file HTML e stato scaricato.');
    } catch (error) {
      logger.error('[PrintButton] Download failed', { error: String(error) });
      toast.error('Errore', 'Impossibile scaricare il file.');
    }
  }, [title, contentType, content, settings]);

  if (!showDownloadOption) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handlePrint}
        disabled={isPrinting}
        className={className}
        aria-label={`Stampa ${title}`}
      >
        {isPrinting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Printer className="w-4 h-4" />
        )}
        <span className="ml-2 hidden sm:inline">Stampa</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isPrinting}
          className={className}
          aria-label={`Opzioni stampa per ${title}`}
        >
          {isPrinting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Printer className="w-4 h-4" />
          )}
          <span className="ml-2 hidden sm:inline">Stampa</span>
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handlePrint} disabled={isPrinting}>
          <Printer className="w-4 h-4 mr-2" />
          Stampa PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload}>
          <Download className="w-4 h-4 mr-2" />
          Scarica HTML
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
