import { maestri as MAESTRI } from '@/data/maestri';

export function getMaestroName(maestroId?: string): string | null {
  if (!maestroId) return null;
  const maestro = MAESTRI.find(m => m.id === maestroId);
  return maestro?.displayName || null;
}

export function handleOpenInNewTab(code: string, title: string): void {
  const blob = new Blob([code], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
