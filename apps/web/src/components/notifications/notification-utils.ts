import type { NotificationType } from '@/lib/stores/notification-store';

/**
 * Format relative time from date
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Ora';
  if (minutes < 60) return `${minutes} min fa`;
  if (hours < 24) return `${hours} ore fa`;
  if (days < 7) return `${days} giorni fa`;
  return new Date(date).toLocaleDateString('it-IT');
}

/**
 * Get notification type color
 */
export function getTypeColor(type: NotificationType): string {
  switch (type) {
    case 'achievement':
      return 'bg-yellow-500';
    case 'streak':
      return 'bg-orange-500';
    case 'reminder':
      return 'bg-blue-500';
    case 'break':
      return 'bg-green-500';
    case 'session_end':
      return 'bg-purple-500';
    case 'level_up':
      return 'bg-pink-500';
    case 'calendar':
      return 'bg-cyan-500';
    case 'system':
    default:
      return 'bg-gray-500';
  }
}

/**
 * Get notification type icon emoji
 */
export function getTypeIcon(type: NotificationType): string {
  switch (type) {
    case 'achievement':
      return '🏆';
    case 'streak':
      return '🔥';
    case 'reminder':
      return '📚';
    case 'break':
      return '☕';
    case 'session_end':
      return '✅';
    case 'level_up':
      return '⬆️';
    case 'calendar':
      return '📅';
    case 'system':
    default:
      return '🔔';
  }
}
