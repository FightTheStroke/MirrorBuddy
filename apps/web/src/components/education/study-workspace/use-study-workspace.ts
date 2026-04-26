/**
 * Study Workspace Hook
 * Contains all the logic for the StudyWorkspace component
 */

import { useState, useCallback, useMemo } from "react";
import { logger } from "@/lib/logger";
import type { Character } from "../character-switcher";
import type { Maestro } from "@/types";
import type { ViewMode } from "./types";

interface UseStudyWorkspaceProps {
  maestri: Maestro[];
  initialCharacter: Character;
}

export function useStudyWorkspace({
  maestri,
  initialCharacter,
}: UseStudyWorkspaceProps) {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>("conversation");
  const [activeCharacter, setActiveCharacter] =
    useState<Character>(initialCharacter);
  const [showCharacterSwitcher, setShowCharacterSwitcher] = useState(false);
  const [isToolActive, setIsToolActive] = useState(false);
  const [recentCharacterIds, setRecentCharacterIds] = useState<string[]>([]);
  const [showVoiceSession, setShowVoiceSession] = useState(false);

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
    if (viewMode === "conversation") {
      setViewMode("split");
    }
  }, [viewMode]);

  // Handle tool completion
  const handleToolComplete = useCallback(() => {
    setIsToolActive(false);
  }, []);

  // Get Maestro if active character is a maestro
  const activeMaestro = useMemo(() => {
    if (activeCharacter.role === "maestro") {
      return maestri.find((m) => m.id === activeCharacter.id);
    }
    return undefined;
  }, [activeCharacter, maestri]);

  // Handle voice mode switch
  const handleSwitchToVoice = useCallback(() => {
    if (activeMaestro) {
      setShowVoiceSession(true);
    } else {
      logger.warn(
        "Voice sessions are only available when chatting with a Maestro",
      );
    }
  }, [activeMaestro]);

  // Layout classes based on view mode
  const layoutClasses = useMemo(() => {
    switch (viewMode) {
      case "conversation":
        return {
          conversation: "w-full",
          canvas: "hidden",
        };
      case "split":
        return {
          conversation: "w-full lg:w-1/2",
          canvas: "hidden lg:block lg:w-1/2",
        };
      case "canvas":
        return {
          conversation: "hidden",
          canvas: "w-full",
        };
    }
  }, [viewMode]);

  return {
    // State
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

    // Handlers
    handleSelectCharacter,
    handleToolStart,
    handleToolComplete,
    handleSwitchToVoice,
  };
}
