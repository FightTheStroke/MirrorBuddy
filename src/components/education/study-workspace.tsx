'use client';
// ============================================================================
// STUDY WORKSPACE (I-06)
// Integrates MaterialiConversation with ToolCanvas for real-time tool building
// Main container for the conversation-first study experience
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PanelLeftClose,
  PanelLeft,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import { Button } from '@/components/ui/button';
import { MaterialiConversation } from './materiali-conversation';
import { CharacterSwitcher, type Character, SUPPORT_CHARACTERS } from './character-switcher';
import { LazyVoiceSession } from '@/components/voice/lazy';
import type { Maestro } from '@/types';

// View modes for the workspace
type ViewMode = 'conversation' | 'split' | 'canvas';

interface StudyWorkspaceProps {
  sessionId: string;
  maestri?: Maestro[];
  initialCharacter?: Character;
  className?: string;
}

export function StudyWorkspace({
  sessionId,
  maestri = [],
  initialCharacter,
  className,
}: StudyWorkspaceProps) {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('conversation');
  const [activeCharacter, setActiveCharacter] = useState<Character>(
    initialCharacter || SUPPORT_CHARACTERS[0]
  );
  const [showCharacterSwitcher, setShowCharacterSwitcher] = useState(false);
  const [isToolActive, setIsToolActive] = useState(false);
  const [recentCharacterIds, setRecentCharacterIds] = useState<string[]>([]);
  const [showVoiceSession, setShowVoiceSession] = useState(false);

  const { settings } = useAccessibilityStore();

  // Handle character selection
  const handleSelectCharacter = useCallback((character: Character) => {
    setActiveCharacter(character);
    setRecentCharacterIds((prev) => {
      const filtered = prev.filter((id) => id !== character.id);
      return [character.id, ...filtered].slice(0, 5);
    });
    setShowCharacterSwitcher(false);
  }, []);

  // Handle tool activation (called when AI starts building a tool)
  const handleToolStart = useCallback(() => {
    setIsToolActive(true);
    // Auto-switch to split view when tool starts
    if (viewMode === 'conversation') {
      setViewMode('split');
    }
  }, [viewMode]);

  // Handle tool completion
  const handleToolComplete = useCallback(() => {
    setIsToolActive(false);
  }, []);

  // Get Maestro if active character is a maestro
  const activeMaestro = useMemo(() => {
    if (activeCharacter.role === 'maestro') {
      return maestri.find((m) => m.id === activeCharacter.id);
    }
    return undefined;
  }, [activeCharacter, maestri]);

  // Handle voice mode switch
  const handleSwitchToVoice = useCallback(() => {
    // Voice is only supported for maestros (not coaches or buddies)
    // Coaches/buddies don't have voice properties (voice, voiceInstructions, etc.)
    if (activeMaestro) {
      setShowVoiceSession(true);
    } else {
      // Could show a toast notification that voice is only for maestros
      logger.warn('Voice sessions are only available when chatting with a Maestro');
    }
  }, [activeMaestro]);

  // Layout classes based on view mode
  const layoutClasses = useMemo(() => {
    switch (viewMode) {
      case 'conversation':
        return {
          conversation: 'w-full',
          canvas: 'hidden',
        };
      case 'split':
        return {
          conversation: 'w-full lg:w-1/2',
          canvas: 'hidden lg:block lg:w-1/2',
        };
      case 'canvas':
        return {
          conversation: 'hidden',
          canvas: 'w-full',
        };
    }
  }, [viewMode]);

  return (
    <div
      className={cn(
        'flex flex-col h-full',
        settings.highContrast ? 'bg-black' : 'bg-slate-50 dark:bg-slate-950',
        className
      )}
    >
      {/* Toolbar */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-2 border-b shrink-0',
          settings.highContrast
            ? 'border-yellow-400 bg-black'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
        )}
      >
        <div className="flex items-center gap-2">
          {/* View mode buttons */}
          <div
            className={cn(
              'flex rounded-lg p-1',
              settings.highContrast
                ? 'bg-gray-900'
                : 'bg-slate-100 dark:bg-slate-800'
            )}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('conversation')}
              className={cn(
                'gap-1',
                viewMode === 'conversation' &&
                  (settings.highContrast
                    ? 'bg-yellow-400 text-black'
                    : 'bg-white dark:bg-slate-700 shadow-sm')
              )}
            >
              <PanelLeftClose className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('split')}
              className={cn(
                'gap-1',
                viewMode === 'split' &&
                  (settings.highContrast
                    ? 'bg-yellow-400 text-black'
                    : 'bg-white dark:bg-slate-700 shadow-sm')
              )}
            >
              <PanelLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Split</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('canvas')}
              disabled={!isToolActive}
              className={cn(
                'gap-1',
                viewMode === 'canvas' &&
                  (settings.highContrast
                    ? 'bg-yellow-400 text-black'
                    : 'bg-white dark:bg-slate-700 shadow-sm')
              )}
            >
              <Maximize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Canvas</span>
            </Button>
          </div>

          {/* Tool status indicator */}
          {isToolActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
                settings.highContrast
                  ? 'bg-yellow-400/20 text-yellow-400'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              Strumento in costruzione
            </motion.div>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {viewMode === 'canvas' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('split')}
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation panel */}
        <AnimatePresence mode="wait">
          {viewMode !== 'canvas' && (
            <motion.div
              key="conversation"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={cn(
                'h-full overflow-hidden',
                layoutClasses.conversation,
                viewMode === 'split' && 'border-r border-slate-200 dark:border-slate-800'
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
          {viewMode !== 'conversation' && (
            <motion.div
              key="canvas"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={cn('h-full overflow-hidden', layoutClasses.canvas)}
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

// Placeholder for ToolCanvas until we can import from realtime worktree
// This will be replaced with the actual ToolCanvas from RT-03
interface ToolCanvasPlaceholderProps {
  sessionId: string;
  maestroName: string;
  maestroAvatar: string;
  isActive: boolean;
  onToolStart: () => void;
  onToolComplete: () => void;
}

function ToolCanvasPlaceholder({
  sessionId: _sessionId,
  maestroName,
  maestroAvatar: _maestroAvatar,
  isActive,
  onToolStart: _onToolStart,
  onToolComplete: _onToolComplete,
}: ToolCanvasPlaceholderProps) {
  const { settings } = useAccessibilityStore();

  return (
    <div
      className={cn(
        'h-full flex items-center justify-center',
        settings.highContrast ? 'bg-black' : 'bg-slate-900'
      )}
    >
      <div className="text-center space-y-4 p-8">
        <div
          className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto',
            settings.highContrast ? 'bg-yellow-400/20' : 'bg-slate-800'
          )}
        >
          {isActive ? (
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className={cn(
                'w-8 h-8 rounded-lg',
                settings.highContrast ? 'bg-yellow-400' : 'bg-accent-themed'
              )}
            />
          ) : (
            <div
              className={cn(
                'w-8 h-8 rounded-lg',
                settings.highContrast ? 'bg-gray-600' : 'bg-slate-700'
              )}
            />
          )}
        </div>
        <p
          className={cn(
            settings.highContrast ? 'text-gray-400' : 'text-slate-400'
          )}
        >
          {isActive
            ? `${maestroName} sta costruendo uno strumento...`
            : 'In attesa che venga creato uno strumento'}
        </p>
        <p
          className={cn(
            'text-xs',
            settings.highContrast ? 'text-gray-600' : 'text-slate-600'
          )}
        >
          Il canvas mostra mappe mentali, quiz, flashcard e altri strumenti in tempo reale
        </p>
      </div>
    </div>
  );
}

export default StudyWorkspace;
