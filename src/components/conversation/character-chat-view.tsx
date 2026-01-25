"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { ToolPanel } from "@/components/tools/tool-panel";
import { ConversationSidebar } from "./conversation-drawer";
import { getCharacterInfo } from "./character-chat-view/utils/character-utils";
import { useCharacterChat } from "./character-chat-view/hooks/use-character-chat";
import { MessagesList } from "./character-chat-view/components/messages-list";
import { ChatInput } from "./character-chat-view/components/chat-input";
import { useVoiceSession } from "@/lib/hooks/use-voice-session";
import { useTTS } from "@/components/accessibility";
import { useDeviceType } from "@/hooks/use-device-type";
import {
  CharacterHeader,
  CharacterVoicePanel,
  characterInfoToUnified,
  type VoiceState,
  type HeaderActions,
} from "@/components/character";
import { useSettingsStore } from "@/lib/stores";
import type { SupportedLanguage } from "@/types";

interface CharacterChatViewProps {
  characterId:
    | "melissa"
    | "roberto"
    | "chiara"
    | "andrea"
    | "favij"
    | "laura"
    | "mario"
    | "noemi"
    | "enea"
    | "bruno"
    | "sofia"
    | "marta";
  characterType: "coach" | "buddy";
}

export function CharacterChatView({
  characterId,
  characterType,
}: CharacterChatViewProps) {
  const router = useRouter();
  const { isPhone } = useDeviceType();
  const language = useSettingsStore(
    (state) => state.appearance.language,
  ) as SupportedLanguage;
  const character = getCharacterInfo(characterId, characterType, language);
  const unifiedCharacter = characterInfoToUnified(
    character,
    characterId,
    characterType,
  );
  const [isToolMinimized, setIsToolMinimized] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { speak: _speak, stop: stopTTS, enabled: ttsEnabled } = useTTS();

  const {
    messages,
    input,
    setInput,
    isLoading,
    isVoiceActive,
    isConnected,
    connectionState,
    configError,
    activeTool,
    setActiveTool,
    messagesEndRef,
    handleSend,
    handleToolRequest,
    handleVoiceCall,
    loadConversation,
    clearChat,
  } = useCharacterChat(characterId, character);

  const voiceSession = useVoiceSession({
    onTranscript: () => {},
  });

  const {
    isListening,
    isSpeaking,
    isMuted,
    inputLevel,
    outputLevel,
    toggleMute,
    sessionId: voiceSessionId,
  } = voiceSession;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Build unified voice state and actions
  const voiceState: VoiceState = {
    isActive: isVoiceActive,
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    inputLevel,
    outputLevel,
    connectionState,
    configError,
  };

  // Handle opening history - close voice first if active
  const handleOpenHistory = () => {
    if (isVoiceActive) {
      handleVoiceCall(); // This toggles voice off
    }
    setIsHistoryOpen(!isHistoryOpen);
  };

  const headerActions: HeaderActions = {
    onVoiceCall: handleVoiceCall,
    onStopTTS: stopTTS,
    onClearChat: clearChat,
    onClose: () => router.back(),
    onToggleMute: toggleMute,
    onOpenHistory: handleOpenHistory,
  };

  const hasActiveTool = activeTool && activeTool.status !== "error";

  return (
    <div
      className={`flex ${isPhone ? "flex-col" : "lg:flex-row"} gap-0 md:gap-4 ${isPhone ? "h-screen" : "h-full lg:h-[calc(100vh-8rem)]"}`}
    >
      {/* Main Chat Area - F-23: Mobile 65% viewport allocation */}
      <div className={`flex flex-col min-w-0 ${isPhone ? "flex-1" : "flex-1"}`}>
        {/* Header - Compact on mobile (≤60px) - xs: breakpoint */}
        <div
          className={`flex-shrink-0 ${isPhone ? "xs:max-h-[60px] overflow-hidden" : ""}`}
        >
          <CharacterHeader
            character={unifiedCharacter}
            voiceState={voiceState}
            ttsEnabled={ttsEnabled}
            actions={headerActions}
          />
        </div>

        {/* Messages Area - 65% viewport on mobile (F-23) */}
        <div
          className={`flex-1 overflow-y-auto ${isPhone ? "xs:min-h-[65vh]" : ""}`}
        >
          <MessagesList
            messages={messages}
            character={character}
            isLoading={isLoading}
          />
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input - Auto-height on mobile (flex-shrink-0 prevents squashing) */}
        <div className="flex-shrink-0">
          <ChatInput
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
            isLoading={isLoading}
            character={character}
            characterType={characterType}
            onToolRequest={handleToolRequest}
            activeTool={activeTool}
          />
        </div>
      </div>

      {hasActiveTool && (
        <div className="w-full lg:w-[400px] h-full flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          <ToolPanel
            tool={activeTool}
            maestro={{
              displayName: character.name,
              avatar: character.avatar || "/avatars/default.jpg",
              color: character.themeColor,
            }}
            onClose={() => setActiveTool(null)}
            isMinimized={isToolMinimized}
            onToggleMinimize={() => setIsToolMinimized(!isToolMinimized)}
            embedded={true}
            sessionId={voiceSessionId}
          />
        </div>
      )}

      {/* Right Panel: Voice OR History (mutually exclusive, same position) */}
      <AnimatePresence>
        {isVoiceActive ? (
          <CharacterVoicePanel
            character={unifiedCharacter}
            voiceState={voiceState}
            ttsEnabled={ttsEnabled}
            actions={headerActions}
          />
        ) : isHistoryOpen ? (
          <ConversationSidebar
            open={isHistoryOpen}
            onOpenChange={setIsHistoryOpen}
            characterId={characterId}
            characterType={characterType}
            characterColor={character.themeColor}
            onSelectConversation={(conversationId) => {
              loadConversation(conversationId);
              setIsHistoryOpen(false);
            }}
            onNewConversation={() => {
              clearChat();
              setIsHistoryOpen(false);
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
