'use client';

import { motion as _motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import { useMaterialiConversation } from './materiali-conversation/hooks/use-materiali-conversation';
import { ConversationHeader } from './materiali-conversation/components/conversation-header';
import { MessagesList } from './materiali-conversation/components/messages-list';
import { QuickActions } from './materiali-conversation/components/quick-actions';
import { AttachmentPreview } from './materiali-conversation/components/attachment-preview';
import { AttachmentPanel } from './materiali-conversation/components/attachment-panel';
import { ConversationInput } from './materiali-conversation/components/conversation-input';
import { DEFAULT_MELISSA } from './materiali-conversation/constants';
import type { Character } from './materiali-conversation/types';
import type { Maestro } from '@/types';

interface MaterialiConversationProps {
  character?: Character;
  maestro?: Maestro;
  onSwitchCharacter?: () => void;
  onSwitchToVoice?: () => void;
  className?: string;
}

export function MaterialiConversation({
  character = DEFAULT_MELISSA,
  maestro,
  onSwitchCharacter,
  onSwitchToVoice,
  className,
}: MaterialiConversationProps) {
  const activeCharacter: Character = maestro
    ? {
        id: maestro.id,
        name: maestro.name,
        avatar: maestro.avatar,
        color: maestro.color,
        role: 'maestro' as const,
        greeting: maestro.greeting,
        systemPrompt: maestro.systemPrompt,
      }
    : character;

  const { settings } = useAccessibilityStore();
  const {
    messages,
    input,
    setInput,
    isLoading,
    attachments,
    showAttachPanel,
    setShowAttachPanel,
    isVoiceMode,
    showQuickActions,
    messagesEndRef,
    inputRef,
    fileInputRef,
    cameraInputRef,
    handleFileSelect,
    removeAttachment,
    handleSubmit,
    handleQuickAction,
    handleKeyDown,
    clearConversation,
    toggleVoiceMode,
  } = useMaterialiConversation(activeCharacter);

  const handleToggleVoice = () => {
    if (onSwitchToVoice) {
      onSwitchToVoice();
    } else {
      toggleVoiceMode();
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full',
        settings.highContrast ? 'bg-black' : 'bg-white dark:bg-slate-900',
        className
      )}
    >
      <ConversationHeader
        character={activeCharacter}
        isVoiceMode={isVoiceMode}
        onSwitchCharacter={onSwitchCharacter}
        onToggleVoice={handleToggleVoice}
        onClearConversation={clearConversation}
        highContrast={settings.highContrast}
      />

      <MessagesList
        messages={messages}
        character={activeCharacter}
        isLoading={isLoading}
        highContrast={settings.highContrast}
        dyslexiaFont={settings.dyslexiaFont}
        lineSpacing={String(settings.lineSpacing)}
        messagesEndRef={messagesEndRef}
      />

      {showQuickActions && messages.length === 1 && (
        <QuickActions onAction={handleQuickAction} />
      )}

      <AnimatePresence>
        {attachments.length > 0 && (
          <AttachmentPreview
            attachments={attachments}
            onRemove={removeAttachment}
            highContrast={settings.highContrast}
          />
        )}
      </AnimatePresence>

      <AttachmentPanel
        show={showAttachPanel}
        onCameraClick={() => cameraInputRef.current?.click()}
        onFileClick={() => fileInputRef.current?.click()}
        highContrast={settings.highContrast}
      />

      <ConversationInput
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        showAttachPanel={showAttachPanel}
        onToggleAttachPanel={() => setShowAttachPanel(!showAttachPanel)}
        onFileSelect={handleFileSelect}
        attachmentsCount={attachments.length}
        isLoading={isLoading}
        character={activeCharacter}
        highContrast={settings.highContrast}
        dyslexiaFont={settings.dyslexiaFont}
        lineSpacing={String(settings.lineSpacing)}
        inputRef={inputRef}
        fileInputRef={fileInputRef}
        cameraInputRef={cameraInputRef}
      />
    </div>
  );
}
