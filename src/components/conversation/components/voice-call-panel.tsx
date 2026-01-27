"use client";

/**
 * VoiceCallPanel - Side-by-side layout with Variant F panel
 * Replaces VoiceCallOverlay with modern side-by-side layout
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  CharacterVoicePanel,
  type VoiceState,
  type HeaderActions,
  type UnifiedCharacter,
} from "@/components/character";
import { logger } from "@/lib/logger";
import { csrfFetch } from "@/lib/auth/csrf-client";
import type { ActiveCharacter } from "@/lib/stores/conversation-flow-store";
import type { Maestro } from "@/types";
import { useVoiceSession } from "@/lib/hooks/use-voice-session";
import { getUserIdFromCookie } from "@/lib/auth/client-auth";

interface VoiceConnectionInfo {
  provider: "azure";
  proxyPort: number;
  configured: boolean;
}

function activeCharacterToMaestro(character: ActiveCharacter): Maestro {
  return {
    id: character.id,
    name: character.name,
    subject: "mathematics",
    specialty:
      character.type === "coach" ? "Metodo di studio" : "Supporto emotivo",
    voice: character.voice || "alloy",
    voiceInstructions: character.voiceInstructions || "",
    teachingStyle: character.type === "coach" ? "scaffolding" : "peer-support",
    avatar:
      (character as unknown as { avatar?: string }).avatar ||
      "/avatars/default.webp",
    color: character.color,
    systemPrompt: character.systemPrompt,
    greeting: character.greeting,
  } as Maestro;
}

function activeCharacterToUnified(
  character: ActiveCharacter,
): UnifiedCharacter {
  return {
    id: character.id,
    name: character.name,
    type: character.type === "coach" ? "coach" : "buddy",
    specialty:
      character.type === "coach" ? "Metodo di studio" : "Supporto emotivo",
    greeting: character.greeting,
    avatar:
      (character as unknown as { avatar?: string }).avatar ||
      "/avatars/default.webp",
    color: character.color,
    badge: character.type === "coach" ? "Coach" : "Amico",
  };
}

interface VoiceCallPanelProps {
  character: ActiveCharacter;
  onEnd: () => void;
  onSessionIdChange?: (sessionId: string | null) => void;
  ttsEnabled: boolean;
  onStopTTS: () => void;
}

export function VoiceCallPanel({
  character,
  onEnd,
  onSessionIdChange,
  ttsEnabled,
  onStopTTS,
}: VoiceCallPanelProps) {
  const [connectionInfo, setConnectionInfo] =
    useState<VoiceConnectionInfo | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const hasAttemptedConnection = useRef(false);
  const conversationIdRef = useRef<string | null>(null);
  const _savedMessagesRef = useRef<Set<string>>(new Set());

  const voiceSession = useVoiceSession({
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Voice call error", { message });
      setConfigError(message || "Errore di connessione vocale");
    },
    onTranscript: (role, text) => {
      logger.debug("Voice transcript", { role, text: text.substring(0, 100) });
    },
  });

  const {
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    inputLevel,
    outputLevel,
    connectionState,
    connect,
    disconnect,
    toggleMute,
    sessionId,
  } = voiceSession;

  useEffect(() => {
    onSessionIdChange?.(sessionId);
  }, [sessionId, onSessionIdChange]);

  // Create conversation in DB when voice session connects
  useEffect(() => {
    if (!isConnected || conversationIdRef.current) return;

    const createConversation = async () => {
      try {
        const response = await csrfFetch("/api/conversations", {
          method: "POST",
          body: JSON.stringify({
            maestroId: character.id,
            title: `Sessione vocale con ${character.name}`,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          conversationIdRef.current = data.id;
          logger.debug("[VoiceCallPanel] Conversation created", {
            conversationId: data.id,
          });
        }
      } catch (error) {
        logger.error("[VoiceCallPanel] Failed to create conversation", {
          error: String(error),
        });
      }
    };

    createConversation();
  }, [isConnected, character.id, character.name]);

  // Fetch connection info
  useEffect(() => {
    const cached = sessionStorage.getItem("voice-connection-info");
    if (cached) {
      try {
        setConnectionInfo(JSON.parse(cached));
      } catch {
        // Invalid cache, fetch fresh
      }
    }

    const fetchConnectionInfo = async () => {
      try {
        const response = await fetch("/api/realtime/token");
        if (!response.ok) throw new Error("Failed to get connection info");
        const data = await response.json();
        sessionStorage.setItem("voice-connection-info", JSON.stringify(data));
        setConnectionInfo(data as VoiceConnectionInfo);
      } catch (error) {
        logger.error("Failed to get voice connection info", {
          error: String(error),
        });
        setConfigError("Impossibile connettersi al servizio vocale");
      }
    };

    if (!connectionInfo) {
      fetchConnectionInfo();
    }
  }, [connectionInfo]);

  // Connect when connection info is available
  useEffect(() => {
    const startConnection = async () => {
      if (hasAttemptedConnection.current) return;
      if (!connectionInfo || isConnected || connectionState !== "idle") return;

      hasAttemptedConnection.current = true;

      try {
        const maestroLike = activeCharacterToMaestro(character);
        await connect(maestroLike, {
          ...connectionInfo,
          characterType: character.type,
        });
      } catch (error) {
        logger.error("Voice connection failed", { error: String(error) });
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          setConfigError(
            "Microfono non autorizzato. Abilita il microfono nelle impostazioni del browser.",
          );
        } else {
          setConfigError("Errore di connessione vocale");
        }
      }
    };

    startConnection();
  }, [connectionInfo, isConnected, connectionState, character, connect]);

  // Handle end call
  const handleEndCall = useCallback(async () => {
    disconnect();

    if (conversationIdRef.current) {
      const userId = getUserIdFromCookie();
      if (userId) {
        try {
          await csrfFetch(
            `/api/conversations/${conversationIdRef.current}/end`,
            {
              method: "POST",
              body: JSON.stringify({ userId, reason: "explicit" }),
            },
          );
          logger.info("[VoiceCallPanel] Conversation ended", {
            conversationId: conversationIdRef.current,
          });
        } catch (error) {
          logger.error("[VoiceCallPanel] Failed to end conversation", {
            error: String(error),
          });
        }
      }
    }

    onEnd();
  }, [disconnect, onEnd]);

  // Build unified character and voice state
  const unifiedCharacter = activeCharacterToUnified(character);

  const voiceState: VoiceState = {
    isActive: true,
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    inputLevel,
    outputLevel,
    connectionState,
    configError,
  };

  const headerActions: HeaderActions = {
    onVoiceCall: handleEndCall,
    onStopTTS,
    onClearChat: () => {},
    onClose: handleEndCall,
    onToggleMute: toggleMute,
  };

  return (
    <CharacterVoicePanel
      character={unifiedCharacter}
      voiceState={voiceState}
      ttsEnabled={ttsEnabled}
      actions={headerActions}
    />
  );
}
