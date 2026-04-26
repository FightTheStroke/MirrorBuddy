"use client";

import { Bot, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DetailedProviderStatus } from '../types';
import { useTranslations } from "next-intl";

interface ProviderStatusCardProps {
  providerStatus: DetailedProviderStatus | null;
}

export function ProviderStatusCard({ providerStatus }: ProviderStatusCardProps) {
  const t = useTranslations("settings");
  if (providerStatus === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-500" />
            {t("providerAiAttivo1")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-20 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-500" />
          {t("providerAiAttivo")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={cn(
          'p-3 rounded-lg flex items-center gap-3',
          providerStatus.activeProvider === 'azure'
            ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
            : providerStatus.activeProvider === 'ollama'
              ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
              : 'bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800'
        )}>
          <div className={cn(
            'w-3 h-3 rounded-full animate-pulse',
            providerStatus.activeProvider === 'azure' ? 'bg-blue-500' :
            providerStatus.activeProvider === 'ollama' ? 'bg-green-500' : 'bg-amber-500'
          )} />
          <div className="flex-1">
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {providerStatus.activeProvider === 'azure' ? 'Azure OpenAI' :
               providerStatus.activeProvider === 'ollama' ? 'Ollama (Locale)' :
               'Nessun provider attivo'}
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-400 ml-2">
              {providerStatus.activeProvider === 'azure'
                ? `Chat + Voice (${providerStatus.azure.model})`
                : providerStatus.activeProvider === 'ollama'
                  ? `Solo Chat (${providerStatus.ollama.model})`
                  : 'Configura un provider'}
            </span>
          </div>
          {providerStatus.activeProvider && (
            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

