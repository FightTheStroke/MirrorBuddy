'use client';

import { motion } from 'framer-motion';
import { Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime, getTypeColor, getTypeIcon } from './notification-utils';
import type { Notification } from '@/lib/stores/notification-store';

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationItem({ notification, onMarkRead, onDelete }: NotificationItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        'group flex items-start gap-3 p-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
        !notification.read && 'bg-blue-50/50 dark:bg-blue-900/20'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm',
          getTypeColor(notification.type)
        )}
      >
        {getTypeIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm font-medium text-gray-900 dark:text-gray-100',
              !notification.read && 'font-semibold'
            )}
          >
            {notification.title}
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {formatRelativeTime(notification.timestamp)}
          </span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
          {notification.message}
        </p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Segna come letto"
          >
            <Check className="h-4 w-4 text-green-600" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Elimina notifica"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </button>
      </div>
    </motion.div>
  );
}
