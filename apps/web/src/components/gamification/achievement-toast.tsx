"use client";

/**
 * Achievement Toast Component
 * Displays animated notification when user unlocks a new achievement
 */

import { useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";

interface AchievementToastProps {
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
  };
  visible?: boolean;
  onClose?: () => void;
  duration?: number;
}

export function AchievementToast({
  achievement,
  visible = true,
  onClose,
  duration = 5000,
}: AchievementToastProps) {
  const t = useTranslations("achievements");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (visible && duration > 0) {
      timerRef.current = setTimeout(handleClose, duration);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [visible, duration, handleClose]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg shadow-2xl p-4 min-w-[320px] max-w-md transform transition-all duration-500 translate-x-0 opacity-100"
    >
      <div className="flex items-start gap-3">
        <div className="text-4xl flex-shrink-0" aria-hidden="true">
          {achievement.icon}
        </div>
        <div className="flex-1">
          <div className="font-bold text-sm uppercase tracking-wide mb-1">
            {t("achievementUnlocked")}
          </div>
          <div className="font-semibold text-lg mb-1">{achievement.name}</div>
          <div className="text-sm text-amber-50">{achievement.description}</div>
        </div>
        {onClose && (
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white flex-shrink-0"
            aria-label={t("closeNotification")}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
