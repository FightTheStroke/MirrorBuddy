'use client';

import { motion } from 'framer-motion';
import { PhoneOff, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ConnectionError } from './types';
import { useTranslations } from 'next-intl';

interface ConfigErrorViewProps {
  error: ConnectionError;
  onSwitchToChat?: () => void;
  onClose: () => void;
}

export function ConfigErrorView({ error, onSwitchToChat, onClose }: ConfigErrorViewProps) {
  const t = useTranslations('voice');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-4"
      >
        <Card className="bg-gradient-to-b from-red-900 to-slate-950 border-red-700 text-white">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <PhoneOff className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{t('configError.title')}</h2>
                <p className="text-sm text-red-300">{t('configError.subtitle')}</p>
              </div>
            </div>

            <div className="bg-red-950/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-200 mb-2">{error.message}</p>
              {error.missingVariables && (
                <div className="mt-2">
                  <p className="text-xs text-red-300 mb-1">{t('configError.missingVariables')}</p>
                  <ul className="text-xs text-red-400 space-y-1">
                    {error.missingVariables.map((v) => (
                      <li key={v} className="font-mono">
                        - {v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm text-slate-300">
                {t('configError.instructions')}{' '}
                <code className="text-xs bg-slate-800 px-1 rounded">.env.local</code>:
              </p>
              <pre className="text-xs bg-slate-900 p-3 rounded-lg overflow-x-auto">
                {`AZURE_OPENAI_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_REALTIME_API_KEY=your-api-key
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime-preview
AZURE_OPENAI_REALTIME_API_VERSION=2024-10-01-preview`}
              </pre>
            </div>

            <div className="flex gap-2 mt-4">
              {onSwitchToChat && (
                <Button onClick={onSwitchToChat} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {t('configError.useChatButton')}
                </Button>
              )}
              <Button
                onClick={onClose}
                className={cn('bg-red-600 hover:bg-red-700', onSwitchToChat ? 'flex-1' : 'w-full')}
              >
                {t('configError.closeButton')}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
