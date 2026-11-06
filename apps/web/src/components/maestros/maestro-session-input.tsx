'use client';

import { Send, Loader2, Paperclip } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { MaestroSessionToolButtons } from './maestro-session-tool-buttons';
import type { Maestro } from '@/types';
import { useTranslations } from 'next-intl';
import { AttachmentChips } from './attachments/attachment-chips';
import { AttachmentConsentDialog } from './attachments/attachment-consent-dialog';
import type { useConversationAttachments } from './attachments/use-conversation-attachments';
import { ATTACHMENT_ACCEPT } from '@/lib/conversation/attachments/client-reader';
import { ATTACHMENT_LIMIT_PARAMS } from '@/lib/conversation/attachments/limits';

type ToolType =
  | 'mindmap'
  | 'quiz'
  | 'flashcards'
  | 'demo'
  | 'search'
  | 'summary'
  | 'diagram'
  | 'timeline';

interface MaestroSessionInputProps {
  maestro: Maestro;
  input: string;
  isLoading: boolean;
  sessionEnded: boolean;
  isVoiceActive: boolean;
  showEndSession: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSubmit: () => void;
  onRequestTool: (tool: ToolType) => void;
  onRequestPhoto: () => void;
  onEndSession: () => void;
  attachments: ReturnType<typeof useConversationAttachments>;
}

export function MaestroSessionInput({
  maestro,
  input,
  isLoading,
  sessionEnded,
  isVoiceActive,
  showEndSession,
  inputRef,
  onInputChange,
  onKeyDown,
  onSubmit,
  onRequestTool,
  onRequestPhoto,
  onEndSession,
  attachments,
}: MaestroSessionInputProps) {
  const t = useTranslations('chat');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Hide toolbar if maestro has no tools or only internal tools like web_search
  const visibleTools = (maestro.tools || []).filter((t) => t !== 'web_search');
  const hasVisibleTools = visibleTools.length > 0 || !maestro.tools;

  return (
    <div className="p-2 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
      {/* Tool buttons - hidden for maestri with no visible tools */}
      {hasVisibleTools && (
        <MaestroSessionToolButtons
          isLoading={isLoading}
          sessionEnded={sessionEnded}
          onRequestTool={onRequestTool}
          onRequestPhoto={onRequestPhoto}
        />
      )}

      <AttachmentChips
        items={attachments.items}
        announcement={attachments.announcement}
        onCancel={attachments.cancel}
        onRetry={attachments.retry}
        onRemove={attachments.remove}
        onFocusFallback={() => inputRef.current?.focus()}
      />
      <AttachmentConsentDialog
        open={attachments.consentOpen}
        onConfirm={attachments.confirmConsent}
        onDecline={attachments.declineConsent}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="attachment-file-input"
        onChange={(e) => {
          attachments.pickFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
          inputRef.current?.focus();
        }}
      />
      <div className="flex gap-2 sm:gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || sessionEnded || isVoiceActive}
          aria-label={t('attachments.attach')}
          title={t('attachments.attach')}
          className="h-11 w-11 flex-shrink-0 p-0"
        >
          <Paperclip aria-hidden="true" className="h-5 w-5" />
        </Button>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            sessionEnded
              ? 'Sessione terminata - Clicca "Nuova conversazione" per ricominciare'
              : isVoiceActive
                ? 'Parla o scrivi...'
                : `Scrivi un messaggio a ${maestro.displayName}...`
          }
          className="flex-1 min-w-0 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 sm:px-4 py-2 sm:py-3 text-sm focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': maestro.color } as React.CSSProperties}
          rows={1}
          disabled={isLoading || sessionEnded}
        />
        <Button
          onClick={onSubmit}
          disabled={!input.trim() || isLoading || sessionEnded || attachments.busy}
          aria-label={t('input.sendMessage')}
          style={{ backgroundColor: maestro.color }}
          className="hover:opacity-90 flex-shrink-0 h-9 sm:h-auto"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
          ) : (
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </Button>
      </div>

      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        {t('attachments.hint', ATTACHMENT_LIMIT_PARAMS)}
      </p>

      {/* End session button */}
      {showEndSession && (
        <div className="flex justify-center mt-3">
          <Button variant="outline" size="sm" onClick={onEndSession} className="text-slate-600">
            {t('terminaSessioneEValuta')}
          </Button>
        </div>
      )}
    </div>
  );
}
