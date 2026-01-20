import { AnimatePresence } from 'framer-motion';
import { ToolMaestroSelectionDialog } from '../tool-maestro-selection-dialog';
import { ConversationHeader, HandoffBanner } from './index';
import { ConversationInput } from './conversation-input';
import { ToolLayout } from './tool-layout';
import { ChatLayout } from './chat-layout';
import { VoiceCallPanel } from './voice-call-panel';
import { useTTS } from '@/components/accessibility';
import { cn } from '@/lib/utils';
import type { ToolType, ToolState } from '@/types/tools';
import type { ActiveCharacter, FlowMessage, HandoffSuggestion } from '@/lib/stores/conversation-flow-store';

interface ConversationContentProps {
  activeCharacter: ActiveCharacter;
  characterHistory: Array<{ type: string; id: string; timestamp: Date }>;
  isVoiceActive: boolean;
  pendingHandoff: HandoffSuggestion | null;
  activeTool: ToolState | null;
  messages: FlowMessage[];
  isLoading: boolean;
  isToolMinimized: boolean;
  voiceSessionId: string | null;
  inputValue: string;
  mode: 'text' | 'voice';
  isMuted: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  showMaestroDialog: boolean;
  pendingToolType: ToolType | null;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onVoiceToggle: () => void;
  onMuteToggle: () => void;
  onToolRequest: (toolType: ToolType) => void;
  onVoiceCall: () => void;
  onAcceptHandoff: () => void;
  onDismissHandoff: () => void;
  onSwitchToCoach: () => void;
  onSwitchToBuddy: () => void;
  onGoBack: () => void;
  onMaestroSelected: (maestro: unknown, toolType: ToolType) => void;
  onCloseDialog: () => void;
  onSetActiveTool: (tool: ToolState | null) => void;
  onToggleMinimize: () => void;
  onSetVoiceSessionId: (id: string | null) => void;
}

export function ConversationContent({
  activeCharacter,
  characterHistory,
  isVoiceActive,
  pendingHandoff,
  activeTool,
  messages,
  isLoading,
  isToolMinimized,
  voiceSessionId,
  inputValue,
  mode,
  isMuted,
  inputRef,
  messagesEndRef,
  showMaestroDialog,
  pendingToolType,
  onInputChange,
  onSend,
  onKeyPress,
  onVoiceToggle,
  onMuteToggle,
  onToolRequest,
  onVoiceCall,
  onAcceptHandoff,
  onDismissHandoff,
  onSwitchToCoach,
  onSwitchToBuddy,
  onGoBack,
  onMaestroSelected,
  onCloseDialog,
  onSetActiveTool,
  onToggleMinimize,
  onSetVoiceSessionId,
}: ConversationContentProps) {
  const hasActiveTool = activeTool && activeTool.status !== 'error';
  const { stop: stopTTS, enabled: ttsEnabled } = useTTS();

  return (
    <div className={cn(
      "flex flex-col lg:flex-row gap-4",
      isVoiceActive ? "flex-1 min-w-0" : "w-full h-full"
    )}>
      {/* Main content area */}
      <div className={cn(
        "flex flex-col min-w-0",
        isVoiceActive ? "flex-1" : "w-full h-full"
      )}>
        {/* Header - hidden when voice is active (all controls in panel) */}
        {!isVoiceActive && (
          <ConversationHeader
            currentCharacter={activeCharacter}
            onSwitchToCoach={onSwitchToCoach}
            onSwitchToBuddy={onSwitchToBuddy}
            onGoBack={onGoBack}
            canGoBack={characterHistory.length > 1}
            isVoiceActive={isVoiceActive}
            onVoiceCall={onVoiceCall}
          />
        )}

        <AnimatePresence>
          {pendingHandoff && (
            <HandoffBanner
              suggestion={pendingHandoff}
              onAccept={onAcceptHandoff}
              onDismiss={onDismissHandoff}
            />
          )}
        </AnimatePresence>

        {hasActiveTool ? (
          <ToolLayout
            activeTool={activeTool}
            activeCharacter={activeCharacter}
            messages={messages}
            isLoading={isLoading}
            isToolMinimized={isToolMinimized}
            voiceSessionId={voiceSessionId}
            onCloseTool={() => onSetActiveTool(null)}
            onToggleMinimize={onToggleMinimize}
          />
        ) : (
          <ChatLayout
            messages={messages}
            activeCharacter={activeCharacter}
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
          />
        )}

        <ConversationInput
          inputValue={inputValue}
          onInputChange={onInputChange}
          onSend={onSend}
          onKeyPress={onKeyPress}
          isLoading={isLoading}
          activeCharacter={activeCharacter}
          mode={mode}
          isMuted={isMuted}
          onVoiceToggle={onVoiceToggle}
          onMuteToggle={onMuteToggle}
          onToolRequest={onToolRequest}
          activeToolId={activeTool?.id}
          inputRef={inputRef}
        />
      </div>

      {/* Voice call panel - side by side layout when active */}
      {isVoiceActive && activeCharacter && (
        <VoiceCallPanel
          character={activeCharacter}
          onEnd={onVoiceCall}
          onSessionIdChange={onSetVoiceSessionId}
          ttsEnabled={ttsEnabled}
          onStopTTS={stopTTS}
        />
      )}

      <ToolMaestroSelectionDialog
        isOpen={showMaestroDialog}
        toolType={pendingToolType || 'mindmap'}
        onSelect={(maestro) => {
          if (pendingToolType) {
            onMaestroSelected(maestro, pendingToolType);
          }
          onCloseDialog();
        }}
        onClose={onCloseDialog}
      />
    </div>
  );
}
