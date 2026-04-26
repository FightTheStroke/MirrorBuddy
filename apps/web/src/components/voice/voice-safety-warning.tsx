'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';

export function VoiceSafetyWarning() {
  const safetyWarning = useVoiceSessionStore((s) => s.safetyWarning);
  const t = useTranslations('chat');

  if (!safetyWarning) {
    return null;
  }

  return (
    <div aria-live="assertive">
      <div
        role="alert"
        data-testid="safety-warning-banner"
        className="absolute top-4 left-4 right-4 z-50 rounded-lg bg-amber-900/90 px-4 py-3 text-amber-100 shadow-lg"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">{t('voice.safety.warningTitle')}</p>
            <p className="text-sm">{safetyWarning}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
