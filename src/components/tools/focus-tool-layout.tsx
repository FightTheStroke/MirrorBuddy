'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useFocusToolLayout } from './focus-tool-layout/hooks/use-focus-tool-layout';
import { FocusSidebar } from './focus-tool-layout/components/focus-sidebar';
import { ToolHeader } from './focus-tool-layout/components/tool-header';
import { ToolContent } from './focus-tool-layout/components/tool-content';
import { MaestroPanel } from './focus-tool-layout/components/maestro-panel';

export function FocusToolLayout() {
  const {
    focusMode,
    focusToolType,
    focusTool,
    setFocusTool,
    exitFocusMode,
    characterProps,
    messages,
    input,
    setInput,
    isLoading,
    isVoiceActive,
    voiceConnected,
    isSpeaking,
    isMuted,
    inputLevel,
    configError,
    sidebarExpanded,
    setSidebarExpanded,
    rightPanelCollapsed,
    setRightPanelCollapsed,
    handleSend,
    handleVoiceToggle,
    toggleMute,
    messagesEndRef,
    inputRef,
    voiceSessionId,
  } = useFocusToolLayout();

  if (!focusMode) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex"
      >
        <FocusSidebar
          expanded={sidebarExpanded}
          onExpandedChange={setSidebarExpanded}
          onExit={exitFocusMode}
        />

        <div
          className={cn(
            'flex-1 h-full overflow-hidden bg-slate-50 dark:bg-slate-900 flex flex-col',
            rightPanelCollapsed ? 'w-full' : 'w-[70%]'
          )}
        >
          <ToolHeader
            toolType={focusToolType}
            rightPanelCollapsed={rightPanelCollapsed}
            onToggleRightPanel={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          />

          <div className="flex-1 overflow-auto">
            <ToolContent
              focusTool={focusTool}
              characterProps={characterProps}
              onClose={() => setFocusTool(null)}
              voiceSessionId={voiceSessionId}
            />
          </div>
        </div>

        {!rightPanelCollapsed && (
          <MaestroPanel
            characterProps={characterProps}
            voiceConnected={voiceConnected}
            isSpeaking={isSpeaking}
            isMuted={isMuted}
            inputLevel={inputLevel}
            isVoiceActive={isVoiceActive}
            configError={configError}
            messages={messages}
            isLoading={isLoading}
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            onVoiceToggle={handleVoiceToggle}
            onToggleMute={toggleMute}
            messagesEndRef={messagesEndRef}
            inputRef={inputRef}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
