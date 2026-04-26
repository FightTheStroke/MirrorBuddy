import { RotateCcw, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOnboardingStore, getStepIndex, getTotalSteps } from '@/lib/stores/onboarding-store';
import { useRouter } from '@/i18n/navigation';
import type { VoiceConnectionInfo } from '../types';
import { VoiceModeIndicator, useVoiceModeInfo } from './voice-mode-indicator';

interface ProgressIndicatorProps {
  existingUserName?: string;
  hasCheckedAzure: boolean;
  useWebSpeechFallback: boolean;
  connectionInfo: VoiceConnectionInfo | null;
  onReset: () => void;
}

export function ProgressIndicator({
  existingUserName,
  hasCheckedAzure,
  useWebSpeechFallback,
  connectionInfo,
  onReset,
}: ProgressIndicatorProps) {
  const router = useRouter();
  const t = useTranslations('welcome.progressIndicator');
  const { currentStep } = useOnboardingStore();
  const stepIndex = getStepIndex(currentStep);
  const totalSteps = getTotalSteps();
  const voiceMode = useVoiceModeInfo(hasCheckedAzure, useWebSpeechFallback, connectionInfo, t);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {existingUserName
              ? t('updatingProfile', { name: existingUserName })
              : t('welcomeTitle')}
          </span>

          <div className="flex items-center gap-3">
            <VoiceModeIndicator voiceMode={voiceMode} />
            <span className="text-sm text-gray-500 dark:text-gray-500">
              {stepIndex + 1} / {totalSteps}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                useOnboardingStore.getState().completeOnboarding();
                router.push('/');
              }}
              className="h-7 px-3 text-pink-600 hover:text-pink-700 hover:bg-pink-50"
            >
              {t('skipButton')}
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-7 px-2 text-gray-500 hover:text-red-500"
              title={t('resetTooltip')}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all duration-300',
                i < stepIndex
                  ? 'bg-pink-500'
                  : i === stepIndex
                    ? 'bg-pink-400'
                    : 'bg-gray-200 dark:bg-gray-700',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
