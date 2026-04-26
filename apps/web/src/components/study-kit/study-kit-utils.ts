/**
 * Study Kit utility functions
 */

/**
 * Get status icon based on study kit status
 */
export function getStatusIcon(status: string) {
  switch (status) {
    case 'processing':
      return 'spinner';
    case 'ready':
      return 'check-circle';
    case 'error':
      return 'alert-circle';
    default:
      return 'clock';
  }
}

/**
 * Get status text in Italian
 */
export function getStatusText(status: string): string {
  switch (status) {
    case 'processing':
      return 'In elaborazione';
    case 'ready':
      return 'Pronto';
    case 'error':
      return 'Errore';
    default:
      return 'Sconosciuto';
  }
}

/**
 * Format date in Italian locale
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}
