// ============================================================================
// WebRTC Connection
// WebRTC connection management for Azure OpenAI Realtime API
// ============================================================================

"use client";

import { logger } from "@/lib/logger";
import { csrfFetch } from "@/lib/auth/csrf-client";
import { CONNECTION_TIMEOUT_MS } from "./constants";
import type {
  WebRTCConnectionConfig,
  WebRTCConnectionResult,
  EphemeralTokenResponse,
  AzureSDPResponse,
} from "./webrtc-types";
import { ICE_SERVERS } from "./webrtc-types";
import {
  logConnectionStateChange,
  logICEConnectionStateChange,
  logDataChannelStateChange,
  logMediaStreamTracks,
  logMicrophonePermissionRequest,
  logSDPExchange,
  logVoiceError,
} from "./voice-error-logger";

// Re-export types for backwards compatibility
export type {
  WebRTCConnectionConfig,
  WebRTCConnectionResult,
} from "./webrtc-types";

/**
 * WebRTC connection manager for Azure OpenAI Realtime API
 */
export class WebRTCConnection {
  private peerConnection: RTCPeerConnection | null = null;
  private mediaStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private config: WebRTCConnectionConfig;
  private connectionTimeout: NodeJS.Timeout | null = null;

  constructor(config: WebRTCConnectionConfig) {
    this.config = config;
  }

  async connect(): Promise<WebRTCConnectionResult> {
    const startTime = Date.now();
    logger.info("[WebRTC] Connection sequence starting...", {
      maestroId: this.config.maestro.id,
    });
    try {
      logger.debug("[WebRTC] Step 1: Getting ephemeral token...");
      const token = await this.getEphemeralToken();
      logger.debug("[WebRTC] Step 2: Requesting microphone access...");
      this.mediaStream = await this.getUserMedia();
      logger.debug("[WebRTC] Step 3: Creating peer connection...");
      this.peerConnection = this.createPeerConnection();
      logger.debug("[WebRTC] Step 4: Adding audio tracks...");
      this.addAudioTracks();
      logger.debug("[WebRTC] Step 5: Creating data channel...");
      this.createDataChannel(); // Must be BEFORE offer per Azure docs
      logger.debug("[WebRTC] Step 6: Creating SDP offer...");
      const offer = await this.createOffer();
      logger.debug("[WebRTC] Step 7: Exchanging SDP...");
      await this.exchangeSDP(token, offer);
      logger.debug("[WebRTC] Step 8: Waiting for connection...");
      await this.waitForConnection();
      const connectionTime = Date.now() - startTime;
      logger.info("[WebRTC] Connection established", { connectionTime });
      return {
        peerConnection: this.peerConnection,
        mediaStream: this.mediaStream,
        dataChannel: this.dataChannel,
        cleanup: () => this.cleanup(),
      };
    } catch (error) {
      this.cleanup();
      const message =
        error instanceof Error ? error.message : "Unknown WebRTC error";
      const connectionTime = Date.now() - startTime;
      logVoiceError('WebRTCConnectionFailed', message, { connectionTime });
      logger.error("[WebRTC] Connection failed", { errorDetails: message });
      this.config.onError?.(new Error(message));
      throw error;
    }
  }

  private async getEphemeralToken(): Promise<string> {
    const response = await csrfFetch("/api/realtime/ephemeral-token", {
      method: "POST",
      body: JSON.stringify({
        maestroId: this.config.maestro.id,
        characterType: this.config.connectionInfo.characterType || "maestro",
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to get ephemeral token: ${response.statusText}`);
    }
    const data: EphemeralTokenResponse = await response.json();
    return data.token;
  }

  private async getUserMedia(): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
      logVoiceError(
        'MicrophoneNotAvailable',
        'getUserMedia not available - HTTPS/localhost required',
      );
      throw new Error(
        "Il microfono non è disponibile. Assicurati di usare HTTPS o localhost.",
      );
    }
    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
    if (this.config.preferredMicrophoneId) {
      audioConstraints.deviceId = { ideal: this.config.preferredMicrophoneId };
    }
    try {
      logger.debug('[WebRTC] Requesting microphone access...', {
        preferredMicrophoneId: this.config.preferredMicrophoneId,
      });
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });
      logMicrophonePermissionRequest('granted', { deviceId: this.config.preferredMicrophoneId });
      logMediaStreamTracks(stream, 'getUserMedia result');
      return stream;
    } catch (error) {
      const err = error as DOMException;
      if (err.name === 'NotAllowedError') {
        logMicrophonePermissionRequest('denied', { errorName: err.name });
      } else {
        logMicrophonePermissionRequest('error', { errorName: err.name, message: err.message });
      }
      throw error;
    }
  }

  private createPeerConnection(): RTCPeerConnection {
    logger.debug('[WebRTC] Creating peer connection');
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onconnectionstatechange = () => {
      logConnectionStateChange(pc.connectionState, this.config.maestro.id);
      this.config.onConnectionStateChange?.(pc.connectionState);
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected"
      ) {
        this.config.onError?.(new Error(`Connection ${pc.connectionState}`));
      }
    };
    pc.oniceconnectionstatechange = () => {
      logICEConnectionStateChange(pc.iceConnectionState, this.config.maestro.id);
      this.config.onICEConnectionStateChange?.(pc.iceConnectionState);
    };
    pc.onicecandidate = (event) => {
      if (!event.candidate) logger.debug("[WebRTC] ICE gathering complete");
    };
    pc.ontrack = (event) => this.config.onTrack?.(event);
    // Note: Data channel is client-initiated, not server-initiated for Azure WebRTC

    return pc;
  }

  /**
   * Create data channel with label 'realtime-channel' per Azure docs
   * Must be called BEFORE createOffer()
   */
  private createDataChannel(): void {
    if (!this.peerConnection) throw new Error("PeerConnection not initialized");
    logger.debug(
      '[WebRTC] Creating data channel with label "realtime-channel"',
    );
    const channel = this.peerConnection.createDataChannel("realtime-channel");
    this.attachDataChannel(channel);
  }

  private attachDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;
    channel.onopen = () => {
      logDataChannelStateChange('open', channel.label);
      this.config.onDataChannelOpen?.();
    };
    channel.onclose = () => {
      logDataChannelStateChange('closed', channel.label);
      this.dataChannel = null;
      this.config.onDataChannelClose?.();
    };
    channel.onerror = (event) => {
      logVoiceError('DataChannelError', event.error?.message || 'Unknown error');
      logger.error("[WebRTC] Data channel error", {
        errorDetails: event.error,
      });
    };
    channel.onmessage = (event) => {
      try {
        this.config.onDataChannelMessage?.(JSON.parse(event.data));
      } catch (error) {
        logVoiceError('DataChannelParseError', `Failed to parse: ${String(error)}`);
        logger.error("[WebRTC] Failed to parse message");
      }
    };
  }

  sendMessage(event: Record<string, unknown>): void {
    if (!this.dataChannel?.send || this.dataChannel.readyState !== "open")
      return;
    try {
      this.dataChannel.send(JSON.stringify(event));
    } catch (_error) {
      logger.error("[WebRTC] Failed to send message");
    }
  }

  private addAudioTracks(): void {
    if (!this.peerConnection || !this.mediaStream) {
      throw new Error("PeerConnection or MediaStream not initialized");
    }
    this.mediaStream.getTracks().forEach((track) => {
      this.peerConnection!.addTrack(track, this.mediaStream!);
    });
  }

  private async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error("PeerConnection not initialized");
    logger.debug('[WebRTC] Creating offer...');
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
    });
    logSDPExchange('offer', offer.sdp?.length || 0);
    await this.peerConnection.setLocalDescription(offer);
    if (this.peerConnection.iceGatheringState !== "complete") {
      logger.debug('[WebRTC] Waiting for ICE gathering to complete...');
      await new Promise<void>((resolve) => {
        const checkState = () => {
          if (this.peerConnection!.iceGatheringState === "complete") {
            logger.debug('[WebRTC] ICE gathering complete');
            this.peerConnection!.removeEventListener(
              "icegatheringstatechange",
              checkState,
            );
            resolve();
          }
        };
        this.peerConnection!.addEventListener(
          "icegatheringstatechange",
          checkState,
        );
      });
    }
    return this.peerConnection.localDescription!;
  }

  private async exchangeSDP(
    token: string,
    offer: RTCSessionDescriptionInit,
  ): Promise<void> {
    logger.debug('[WebRTC] Exchanging SDP with server...');
    const configResponse = await fetch("/api/realtime/token");
    if (!configResponse.ok) {
      logVoiceError('ConfigFetchFailed', `Status: ${configResponse.status}`);
      throw new Error("Failed to get Azure config");
    }
    const { webrtcEndpoint } = await configResponse.json();
    if (!webrtcEndpoint) {
      logVoiceError('WebRTCEndpointMissing', 'Endpoint not configured');
      throw new Error("WebRTC endpoint not configured");
    }
    const response = await fetch(webrtcEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        Authorization: `Bearer ${token}`,
      },
      body: offer.sdp,
    });
    if (!response.ok) {
      const errorText = await response.text();
      logVoiceError('SDPExchangeFailed', `Status: ${response.status}`, {
        statusText: response.statusText,
        errorDetails: errorText.substring(0, 200),
      });
      throw new Error(`SDP exchange failed: ${response.status} - ${errorText}`);
    }
    const answerSdp = await response.text();
    logSDPExchange('answer', answerSdp.length);
    const answer: AzureSDPResponse = {
      sdp: answerSdp,
      type: "answer",
    };
    if (!this.peerConnection) throw new Error("PeerConnection not initialized");
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(answer),
    );
    logger.debug('[WebRTC] Remote description set successfully');
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.peerConnection) {
        reject(new Error("PeerConnection not initialized"));
        return;
      }
      const pc = this.peerConnection;
      this.connectionTimeout = setTimeout(
        () => reject(new Error("Connection timeout")),
        CONNECTION_TIMEOUT_MS,
      );
      const checkConnection = () => {
        if (pc.connectionState === "connected") {
          if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
          pc.removeEventListener("connectionstatechange", checkConnection);
          resolve();
        } else if (pc.connectionState === "failed") {
          if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
          pc.removeEventListener("connectionstatechange", checkConnection);
          reject(new Error("Connection failed"));
        }
      };
      pc.addEventListener("connectionstatechange", checkConnection);
      checkConnection();
    });
  }

  private cleanup(): void {
    if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
    if (this.dataChannel) this.dataChannel.close();
    if (this.mediaStream) this.mediaStream.getTracks().forEach((t) => t.stop());
    if (this.peerConnection) this.peerConnection.close();
    this.connectionTimeout =
      this.dataChannel =
      this.mediaStream =
      this.peerConnection =
        null;
  }
}

/**
 * Factory function to create WebRTC connection
 */
export async function createWebRTCConnection(
  config: WebRTCConnectionConfig,
): Promise<WebRTCConnectionResult> {
  const connection = new WebRTCConnection(config);
  return connection.connect();
}
