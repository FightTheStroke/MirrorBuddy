"use client";
// ============================================================================
// STUDY WORKSPACE (I-06)
// Integrates MaterialiConversation with ToolCanvas for real-time tool building
// Main container for the conversation-first study experience
// ============================================================================

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility";
import { MaterialiConversation } from "../materiali-conversation";
import { CharacterSwitcher, SUPPORT_CHARACTERS } from "../character-switcher";
import { LazyVoiceSession } from "@/components/voice/lazy";
import { useStudyWorkspace } from "./use-study-workspace";
import { StudyWorkspaceToolbar } from "./toolbar";
import { ToolCanvasPlaceholder } from "./tool-canvas-placeholder";
import type { StudyWorkspaceProps } from "./types";

export function StudyWorkspace({
  sessionId,
  maestri = [],
  initialCharacter,
  className,
}: StudyWorkspaceProps) {
  const {
    viewMode,
    setViewMode,
    activeCharacter,
    showCharacterSwitcher,
    setShowCharacterSwitcher,
    isToolActive,
    recentCharacterIds,
    showVoiceSession,
    setShowVoiceSession,
    activeMaestro,
    layoutClasses,
    handleSelectCharacter,
    handleToolStart,
    handleToolComplete,
    handleSwitchToVoice,
  } = useStudyWorkspace({
    maestri,
    initialCharacter: initialCharacter || SUPPORT_CHARACTERS[0],
  });

  const { settings } = useAccessibilityStore();

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        settings.highContrast ? "bg-black" : "bg-slate-50 dark:bg-slate-950",
        className,
      )}
    >
      {/* Toolbar */}
      <StudyWorkspaceToolbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        isToolActive={isToolActive}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation panel */}
        <AnimatePresence mode="wait">
          {viewMode !== "canvas" && (
            <motion.div
              key="conversation"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={cn(
                "h-full overflow-hidden",
                layoutClasses.conversation,
                viewMode === "split" &&
                  "border-r border-slate-200 dark:border-slate-800",
              )}
            >
              <MaterialiConversation
                character={activeCharacter}
                maestro={activeMaestro}
                onSwitchCharacter={() => setShowCharacterSwitcher(true)}
                onSwitchToVoice={handleSwitchToVoice}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tool canvas panel */}
        <AnimatePresence mode="wait">
          {viewMode !== "conversation" && (
            <motion.div
              key="canvas"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={cn("h-full overflow-hidden", layoutClasses.canvas)}
            >
              <ToolCanvasPlaceholder
                sessionId={sessionId}
                maestroName={activeCharacter.name}
                maestroAvatar={activeCharacter.avatar}
                isActive={isToolActive}
                onToolStart={handleToolStart}
                onToolComplete={handleToolComplete}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Character Switcher Modal */}
      <CharacterSwitcher
        isOpen={showCharacterSwitcher}
        onClose={() => setShowCharacterSwitcher(false)}
        onSelectCharacter={handleSelectCharacter}
        currentCharacterId={activeCharacter.id}
        maestri={maestri}
        recentCharacterIds={recentCharacterIds}
      />

      {/* Voice Session Modal (only for maestros) */}
      <AnimatePresence mode="wait">
        {showVoiceSession && activeMaestro && (
          <LazyVoiceSession
            key={`voice-${activeMaestro.id}`}
            maestro={activeMaestro}
            onClose={() => setShowVoiceSession(false)}
            onSwitchToChat={() => setShowVoiceSession(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default StudyWorkspace;
