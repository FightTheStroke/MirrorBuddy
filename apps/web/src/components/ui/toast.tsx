'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from "next-intl";

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

// Global toast state
let toastState: ToastState | null = null;
const listeners: Set<() => void> = new Set();

function getToastState(): Toast[] {
  return toastState?.toasts || [];
}

function subscribeToToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

// Initialize toast state
function initToastState(): ToastState {
  if (!toastState) {
    toastState = {
      toasts: [],
      addToast: (toast) => {
        const id = `toast_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
        const newToast: Toast = { ...toast, id };
        toastState!.toasts = [...toastState!.toasts, newToast];
        notifyListeners();

        // Auto remove after duration
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
          setTimeout(() => {
            toastState?.removeToast(id);
          }, duration);
        }
      },
      removeToast: (id) => {
        toastState!.toasts = toastState!.toasts.filter((t) => t.id !== id);
        notifyListeners();
      },
    };
  }
  return toastState;
}

// Public API for showing toasts
export const toast = {
  success: (title: string, message?: string, options?: Partial<Toast>) => {
    initToastState().addToast({ type: 'success', title, message, ...options });
  },
  error: (title: string, message?: string, options?: Partial<Toast>) => {
    initToastState().addToast({ type: 'error', title, message, duration: 8000, ...options });
  },
  info: (title: string, message?: string, options?: Partial<Toast>) => {
    initToastState().addToast({ type: 'info', title, message, ...options });
  },
  warning: (title: string, message?: string, options?: Partial<Toast>) => {
    initToastState().addToast({ type: 'warning', title, message, ...options });
  },
  custom: (toast: Omit<Toast, 'id'>) => {
    initToastState().addToast(toast);
  },
  dismiss: (id: string) => {
    initToastState().removeToast(id);
  },
  dismissAll: () => {
    if (toastState) {
      toastState.toasts = [];
      notifyListeners();
    }
  },
};

// Toast icons
const ToastIcon = ({ type }: { type: ToastType }) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'error':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'info':
    default:
      return <Info className="h-5 w-5 text-blue-500" />;
  }
};

// Individual toast component
function ToastItem({ toast: toastItem, onRemove }: { toast: Toast; onRemove: () => void }) {
  const t = useTranslations("common");
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-white p-4 shadow-lg dark:bg-gray-900',
        toastItem.type === 'success' && 'border-green-200 dark:border-green-800',
        toastItem.type === 'error' && 'border-red-200 dark:border-red-800',
        toastItem.type === 'warning' && 'border-yellow-200 dark:border-yellow-800',
        toastItem.type === 'info' && 'border-blue-200 dark:border-blue-800'
      )}
    >
      <ToastIcon type={toastItem.type} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{toastItem.title}</p>
        {toastItem.message && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{toastItem.message}</p>
        )}
        {toastItem.action && (
          <button
            onClick={() => {
              toastItem.action!.onClick();
              onRemove();
            }}
            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            {toastItem.action.label}
          </button>
        )}
      </div>
      <button
        onClick={onRemove}
        className="flex-shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-800"
        aria-label={t("chiudiNotifica")}
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

// Toast container component - must be mounted in layout
export function ToastContainer() {
  const t = useTranslations("common");
  // Initialize state lazily to avoid setState in useEffect
  const [toasts, setToasts] = useState<Toast[]>(() => {
    initToastState();
    return getToastState();
  });

  useEffect(() => {
    const unsubscribe = subscribeToToasts(() => {
      setToasts([...getToastState()]);
    });

    return unsubscribe;
  }, []);

  const handleRemove = useCallback((id: string) => {
    toast.dismiss(id);
  }, []);

  return (
    <div
      aria-live="polite"
      aria-label={t("notifiche")}
      role="status"
      className="pointer-events-none fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-sm"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toastItem) => (
          <ToastItem key={toastItem.id} toast={toastItem} onRemove={() => handleRemove(toastItem.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default toast;
