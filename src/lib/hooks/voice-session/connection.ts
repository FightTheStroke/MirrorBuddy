// ============================================================================
// CONNECTION MANAGEMENT
// WebRTC-only connection (WebSocket proxy removed - legacy)
// ============================================================================

"use client";

import { useCallback } from "react";
import { logger } from "@/lib/logger";
import type { Maestro } from "@/types";
import type { ConnectionInfo, UseVoiceSessionOptions } from "./types";
import { createWebRTCConnection } from "./webrtc-connection";
import { handleWebRTCTrack } from "./webrtc-handlers";
import type { ConnectionRefs } from "./connection-types";
import { getHeartbeatIntervalWithJitter } from "./constants";
import { isWebRTCSupported } from "./webrtc-support";

// Pre-stringified heartbeat message to avoid JSON.stringify on every beat
const HEARTBEAT_MESSAGE = JSON.stringify({
  type: "session.update",
  session: {},
});

// Re-export types for backwards compatibility
export type { ConnectionRefs } from "./connection-types";
export { useDisconnect } from "./connection-cleanup";

/**
 * Connect to Azure Realtime API via WebRTC
 * WebSocket proxy fallback removed - WebRTC is now the only transport
 */
export function useConnect(
  refs: ConnectionRefs,
  setConnected: (value: boolean) => void,
  setConnectionState: (
    state: "idle" | "connecting" | "connected" | "error",
  ) => void,
  connectionState: "idle" | "connecting" | "connected" | "error",
  handleServerEvent: (event: Record<string, unknown>) => void,
  preferredMicrophoneId?: string,
  initPlaybackContext?: () => Promise<
    | {
        context: AudioContext;
        analyser: AnalyserNode | null;
        gainNode: GainNode | null;
      }
    | undefined
  >,
  options: UseVoiceSessionOptions = {},
) {
  return useCallback(
    async (maestro: Maestro, connectionInfo: ConnectionInfo) => {
      try {
        logger.debug(
          "[VoiceSession] Connecting to Azure Realtime API via WebRTC...",
        );

        // Safety: ensure ref is set before proceeding
        if (!refs.handleServerEventRef.current) {
          logger.warn(
            "[VoiceSession] handleServerEventRef not set, setting now...",
          );
          // eslint-disable-next-line react-hooks/immutability -- Intentional ref mutation for callback
          refs.handleServerEventRef.current = handleServerEvent;
        }

        setConnectionState("connecting");
        options.onStateChange?.("connecting");
        refs.maestroRef.current = maestro;
        refs.sessionReadyRef.current = false;
        refs.greetingSentRef.current = false;

        // Store initial messages for context continuity
        refs.initialMessagesRef.current =
          connectionInfo.initialMessages || null;

        // Generate stable session ID for this voice conversation
        refs.sessionIdRef.current = `voice-${maestro.id}-${Date.now()}`;
        logger.debug("[VoiceSession] Session ID generated", {
          sessionId: refs.sessionIdRef.current,
        });

        // Check if WebRTC is supported
        const webrtcSupported = isWebRTCSupported();
        if (!webrtcSupported) {
          const errorMsg =
            "WebRTC non supportato dal browser. Aggiorna il browser o usa Chrome/Firefox/Safari.";
          logger.error("[VoiceSession] WebRTC not supported");
          setConnectionState("error");
          options.onStateChange?.("error");
          options.onError?.(new Error(errorMsg));
          return;
        }

        await connectWebRTC(
          maestro,
          connectionInfo,
          refs,
          setConnected,
          setConnectionState,
          options,
          preferredMicrophoneId,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : "Errore di connessione sconosciuto";
        logger.error("[VoiceSession] Connection error", {
          message: errorMessage,
        });
        setConnectionState("error");
        options.onStateChange?.("error");
        options.onError?.(new Error(errorMessage));
      }
    },
    [
      refs,
      setConnected,
      setConnectionState,
      connectionState,
      handleServerEvent,
      preferredMicrophoneId,
      initPlaybackContext,
      options,
    ],
  );
}

/**
 * Internal: Connect via WebRTC transport
 */
async function connectWebRTC(
  maestro: Maestro,
  connectionInfo: ConnectionInfo,
  refs: ConnectionRefs,
  setConnected: (value: boolean) => void,
  setConnectionState: (
    state: "idle" | "connecting" | "connected" | "error",
  ) => void,
  options: UseVoiceSessionOptions,
  preferredMicrophoneId?: string,
): Promise<void> {
  logger.debug("[VoiceSession] Using WebRTC transport");

  const result = await createWebRTCConnection({
    maestro,
    connectionInfo,
    preferredMicrophoneId,
    onConnectionStateChange: (state) => {
      logger.debug(`[VoiceSession] WebRTC state: ${state}`);
      if (state === "connected") {
        setConnectionState("connected");
        setConnected(true);
        options.onStateChange?.("connected");
      } else if (state === "failed" || state === "disconnected") {
        setConnectionState("error");
        options.onStateChange?.("error");
      }
    },
    onError: (error) => {
      logger.error("[VoiceSession] WebRTC error", { error: error.message });
      setConnectionState("error");
      options.onStateChange?.("error");
      options.onError?.(error);
    },
    onDataChannelMessage: (event) => {
      if (refs.handleServerEventRef.current) {
        refs.handleServerEventRef.current(event);
      } else {
        logger.error(
          "[VoiceSession] handleServerEventRef is NULL, event lost",
          { eventType: event.type },
        );
      }
    },
    onDataChannelOpen: () => {
      logger.debug("[VoiceSession] WebRTC data channel open");
      // Send session config now that data channel is ready
      if (refs.sendSessionConfigRef.current) {
        logger.debug("[VoiceSession] Sending session config via data channel");
        refs.sendSessionConfigRef.current();
      }
    },
    onTrack: (event) => handleWebRTCTrack(event, refs),
  });

  // Store cleanup, media stream, and data channel for later use
  refs.webrtcCleanupRef.current = result.cleanup;
  refs.mediaStreamRef.current = result.mediaStream;
  refs.webrtcDataChannelRef.current = result.dataChannel;

  // Start WebRTC keepalive heartbeat to prevent connection timeout
  // Uses setTimeout with jitter instead of setInterval to prevent synchronized requests
  if (refs.webrtcHeartbeatRef.current) {
    clearTimeout(refs.webrtcHeartbeatRef.current);
  }

  const scheduleHeartbeat = () => {
    refs.webrtcHeartbeatRef.current = setTimeout(() => {
      const dc = refs.webrtcDataChannelRef.current;
      if (dc && dc.readyState === "open") {
        try {
          // Send no-op session.update as keepalive (does NOT clear audio buffer)
          dc.send(HEARTBEAT_MESSAGE);
          logger.debug("[VoiceSession] WebRTC heartbeat sent");
          // Schedule next heartbeat with new jittered interval
          scheduleHeartbeat();
        } catch {
          logger.warn("[VoiceSession] WebRTC heartbeat failed");
        }
      }
    }, getHeartbeatIntervalWithJitter());
  };
  scheduleHeartbeat();

  logger.debug("[VoiceSession] WebRTC connection established with heartbeat");
}
