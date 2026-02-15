// ============================================================================
// WebRTC Connection
// WebRTC connection management for Azure OpenAI Realtime API
// ============================================================================

'use client';

import { clientLogger as logger } from '@/lib/logger/client';
import { csrfFetch } from '@/lib/auth';
import {
  isMediaDevicesAvailable,
  requestMicrophoneStream,
  type MicrophoneConstraints,
} from '@/lib/native/media-bridge';
import { getConnectionTimeout } from './constants';
import type {
  WebRTCConnectionConfig,
  WebRTCConnectionResult,
  EphemeralTokenResponse,
  AzureSDPResponse,
} from './webrtc-types';
import { ICE_SERVERS } from './webrtc-types';
import {
  logConnectionStateChange,
  logICEConnectionStateChange,
  logDataChannelStateChange,
  logMediaStreamTracks,
  logMicrophonePermissionRequest,
  logSDPExchange,
  logVoiceError,
} from './voice-error-logger';
// Re-export types for backwards compatibility
export type { WebRTCConnectionConfig, WebRTCConnectionResult } from './webrtc-types';

/**
 * Server token config shape (from /api/realtime/token).
 * GA mode returns azureResource + deployment.
 * Preview mode returns webrtcEndpoint + deployment.
 */
interface ServerTokenConfig {
  azureResource?: string;
  webrtcEndpoint?: string;
  deployment?: string;
}

/**
 * WebRTC connection manager for Azure OpenAI Realtime API
 */
export class WebRTCConnection {
  private peerConnection: RTCPeerConnection | null = null;
  private mediaStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private config: WebRTCConnectionConfig;
  private connectionTimeout: NodeJS.Timeout | null = null;
  /** Server-driven protocol config, fetched once per connect() */
  private serverConfig: ServerTokenConfig | null = null;

  constructor(config: WebRTCConnectionConfig) {
    this.config = config;
  }

  /** Whether server returned GA protocol config (azureResource present) */
  private get isGAProtocol(): boolean {
    return !!this.serverConfig?.azureResource;
  }

  private stopResolvedStreamIfUnassigned(resolvedStream: unknown): void {
    if (this.mediaStream) return;
    if (typeof resolvedStream !== 'object' || resolvedStream === null) return;
    const candidate = resolvedStream as { getTracks?: unknown };
    if (typeof candidate.getTracks !== 'function') return;

    const tracks = candidate.getTracks.call(resolvedStream) as unknown;
    if (!Array.isArray(tracks)) return;
    for (const track of tracks) {
      if (typeof track !== 'object' || track === null) continue;
      const stoppable = track as { stop?: unknown };
      if (typeof stoppable.stop === 'function') {
        stoppable.stop.call(track);
      }
    }
  }

  async connect(): Promise<WebRTCConnectionResult> {
    const startTime = Date.now();
    logger.info('[WebRTC] Connection sequence starting...', {
      maestroId: this.config.maestro.id,
    });
    let resolvedMediaStream: unknown = null;
    try {
      // Run token issuance, server config, and microphone permission in parallel
      // to reduce end-to-end time and to show the mic permission prompt immediately.
      logger.debug(
        '[WebRTC] Step 1: Getting ephemeral token + server config + mic access (parallel)...',
      );
      const tokenPromise = this.getEphemeralToken();
      const configPromise = this.fetchServerConfig();
      const mediaPromise = this.getUserMedia().then((stream) => {
        resolvedMediaStream = stream;
        return stream;
      });
      const [token, , mediaStream] = await Promise.all([tokenPromise, configPromise, mediaPromise]);
      this.mediaStream = mediaStream;
      logger.debug('[WebRTC] Step 3: Creating peer connection...', {
        protocol: this.isGAProtocol ? 'GA' : 'preview',
      });
      this.peerConnection = await this.createPeerConnection();
      logger.debug('[WebRTC] Step 4: Adding audio tracks...');
      this.addAudioTracks();
      logger.debug('[WebRTC] Step 5: Creating data channel...');
      this.createDataChannel(); // Must be BEFORE offer per Azure docs
      logger.debug('[WebRTC] Step 6: Creating SDP offer...');
      const offer = await this.createOffer();
      logger.debug('[WebRTC] Step 7: Exchanging SDP...');
      await this.exchangeSDP(token, offer);
      logger.debug('[WebRTC] Step 8: Waiting for connection...');
      await this.waitForConnection();
      const connectionTime = Date.now() - startTime;
      logger.info('[WebRTC] Connection established', { connectionTime });
      return {
        peerConnection: this.peerConnection,
        mediaStream: this.mediaStream,
        dataChannel: this.dataChannel,
        cleanup: () => this.cleanup(),
        unmuteAudioTracks: () => this.unmuteAudioTracks(),
      };
    } catch (error) {
      // If getUserMedia resolved but Promise.all rejected (e.g. token fetch failure),
      // ensure we still stop the microphone tracks even before this.mediaStream is assigned.
      this.stopResolvedStreamIfUnassigned(resolvedMediaStream);
      this.cleanup();
      const message = error instanceof Error ? error.message : 'Unknown WebRTC error';
      const connectionTime = Date.now() - startTime;
      logVoiceError('WebRTCConnectionFailed', message, { connectionTime });
      logger.error('[WebRTC] Connection failed', { errorDetails: message });
      this.config.onError?.(new Error(message));
      throw error;
    }
  }

  /**
   * Fetch server token config to determine protocol mode (GA vs preview).
   * The server decides the protocol; the client follows.
   */
  private async fetchServerConfig(): Promise<void> {
    const response = await fetch('/api/realtime/token');
    if (!response.ok) {
      logVoiceError('ConfigFetchFailed', `Status: ${response.status}`);
      throw new Error('Failed to get server config');
    }
    this.serverConfig = await response.json();
    logger.debug('[WebRTC] Server config received', {
      protocol: this.isGAProtocol ? 'GA' : 'preview',
      hasAzureResource: !!this.serverConfig?.azureResource,
      hasWebrtcEndpoint: !!this.serverConfig?.webrtcEndpoint,
    });
  }

  private async getEphemeralToken(): Promise<string> {
    const response = await csrfFetch('/api/realtime/ephemeral-token', {
      method: 'POST',
      body: JSON.stringify({
        maestroId: this.config.maestro.id,
        characterType: this.config.connectionInfo.characterType || 'maestro',
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to get ephemeral token: ${response.statusText}`);
    }
    const data: EphemeralTokenResponse = await response.json();
    return data.token;
  }

  private async getUserMedia(): Promise<MediaStream> {
    if (!isMediaDevicesAvailable()) {
      logVoiceError(
        'MicrophoneNotAvailable',
        'getUserMedia not available - HTTPS/localhost required',
      );
      throw new Error('Il microfono non è disponibile. Assicurati di usare HTTPS o localhost.');
    }

    // Priority 1 Fix: Minimal iOS Audio Constraints (Safari iOS compatibility)
    // Ref: docs/voice-mobile-investigation-report.md - Priority 1, Item 2
    // iOS Safari has limited constraint support - simplify for compatibility
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const audioConstraints: MicrophoneConstraints = isMobile
      ? {
          // iOS-compatible minimal constraints
          echoCancellation: true,
          noiseSuppression: true,
          // Omit autoGainControl, sampleRate, channelCount for iOS compatibility
        }
      : {
          // Desktop: full constraint set
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        };

    if (this.config.preferredMicrophoneId) {
      audioConstraints.deviceId = { ideal: this.config.preferredMicrophoneId };
    }

    logger.debug(`[WebRTC] getUserMedia constraints (${isMobile ? 'mobile' : 'desktop'})`, {
      constraints: audioConstraints,
    });

    try {
      logger.debug('[WebRTC] Requesting microphone access...', {
        preferredMicrophoneId: this.config.preferredMicrophoneId,
      });
      const stream = await requestMicrophoneStream(audioConstraints);
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

  private async createPeerConnection(): Promise<RTCPeerConnection> {
    logger.debug('[WebRTC] Creating peer connection');

    // T1-07: In GA protocol, Azure provides built-in TURN/STUN servers
    // Protocol mode is determined by server token response (not client flags)
    const iceConfig = this.isGAProtocol ? [] : ICE_SERVERS;

    logger.debug('[WebRTC] ICE server configuration', {
      gaProtocol: this.isGAProtocol,
      iceServers: iceConfig.length > 0 ? 'custom' : 'Azure built-in',
    });

    const pc = new RTCPeerConnection({ iceServers: iceConfig });
    pc.onconnectionstatechange = () => {
      logConnectionStateChange(pc.connectionState, this.config.maestro.id);
      this.config.onConnectionStateChange?.(pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.config.onError?.(new Error(`Connection ${pc.connectionState}`));
      }
    };
    pc.oniceconnectionstatechange = () => {
      logICEConnectionStateChange(pc.iceConnectionState, this.config.maestro.id);
      this.config.onICEConnectionStateChange?.(pc.iceConnectionState);
    };
    pc.onicecandidate = (event) => {
      if (!event.candidate) logger.debug('[WebRTC] ICE gathering complete');
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
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    logger.debug('[WebRTC] Creating data channel with label "realtime-channel"');
    const channel = this.peerConnection.createDataChannel('realtime-channel');
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
      logger.error('[WebRTC] Data channel error', {
        errorDetails: event.error,
      });
    };
    channel.onmessage = (event) => {
      try {
        this.config.onDataChannelMessage?.(JSON.parse(event.data));
      } catch (error) {
        logVoiceError('DataChannelParseError', `Failed to parse: ${String(error)}`);
        logger.error('[WebRTC] Failed to parse message');
      }
    };
  }

  sendMessage(event: Record<string, unknown>): void {
    if (!this.dataChannel?.send || this.dataChannel.readyState !== 'open') return;
    try {
      this.dataChannel.send(JSON.stringify(event));
    } catch (_error) {
      logger.error('[WebRTC] Failed to send message');
    }
  }

  private addAudioTracks(): void {
    if (!this.peerConnection || !this.mediaStream) {
      throw new Error('PeerConnection or MediaStream not initialized');
    }
    // Mute mic tracks initially to prevent Azure from receiving audio
    // before session.update configures the character identity.
    // Without this, Azure's default persona ("Aiden") responds to any
    // ambient noise or speech detected before our instructions arrive.
    // Tracks are unmuted after session.updated is confirmed.
    this.mediaStream.getTracks().forEach((track) => {
      track.enabled = false;
      this.peerConnection!.addTrack(track, this.mediaStream!);
    });
  }

  /**
   * Unmute mic tracks after session configuration is confirmed.
   * Called from event handler on session.updated.
   */
  unmuteAudioTracks(): void {
    if (!this.mediaStream) return;
    this.mediaStream.getTracks().forEach((track) => {
      track.enabled = true;
    });
    logger.debug('[WebRTC] Audio tracks unmuted after session.updated');
  }

  private async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    logger.debug('[WebRTC] Creating offer...');
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
    });
    logSDPExchange('offer', offer.sdp?.length || 0);
    await this.peerConnection.setLocalDescription(offer);

    // T1-08: In GA protocol, SDP can be posted immediately without waiting for ICE gathering
    // Protocol mode is determined by server token response (not client flags)

    if (!this.isGAProtocol && this.peerConnection.iceGatheringState !== 'complete') {
      // Preview protocol: wait for ICE gathering to complete
      logger.debug('[WebRTC] Waiting for ICE gathering to complete...');
      await new Promise<void>((resolve) => {
        const checkState = () => {
          if (this.peerConnection!.iceGatheringState === 'complete') {
            logger.debug('[WebRTC] ICE gathering complete');
            this.peerConnection!.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }
        };
        this.peerConnection!.addEventListener('icegatheringstatechange', checkState);
      });
    } else if (this.isGAProtocol) {
      logger.debug('[WebRTC] GA protocol: posting SDP immediately (no ICE wait)');
    }

    return this.peerConnection.localDescription!;
  }

  private async exchangeSDP(token: string, offer: RTCSessionDescriptionInit): Promise<void> {
    logger.debug('[WebRTC] Exchanging SDP with server...');

    // Protocol mode is driven by server token response (fetched in connect())
    let sdpEndpoint: string;

    if (this.isGAProtocol) {
      // GA protocol: construct endpoint from azureResource (server-provided)
      const { azureResource } = this.serverConfig!;
      logger.debug('[WebRTC] Using GA protocol endpoint', { azureResource });
      if (!azureResource) {
        logVoiceError('AzureResourceMissing', 'Resource name not configured');
        throw new Error('Azure resource name not configured');
      }
      sdpEndpoint = `https://${azureResource}.openai.azure.com/openai/v1/realtime/calls`;
    } else {
      // Preview protocol: use webrtcEndpoint from server config
      const { webrtcEndpoint } = this.serverConfig!;
      logger.debug('[WebRTC] Using preview protocol endpoint', { webrtcEndpoint });
      if (!webrtcEndpoint) {
        logVoiceError('WebRTCEndpointMissing', 'Endpoint not configured');
        throw new Error('WebRTC endpoint not configured');
      }
      sdpEndpoint = webrtcEndpoint;
    }

    const response = await fetch(sdpEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
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
      type: 'answer',
    };
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    logger.debug('[WebRTC] Remote description set successfully');
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.peerConnection) {
        reject(new Error('PeerConnection not initialized'));
        return;
      }
      const pc = this.peerConnection;
      const timeoutMs = getConnectionTimeout();
      logger.debug(`[WebRTC] Connection timeout set to ${timeoutMs}ms`);
      this.connectionTimeout = setTimeout(
        () => reject(new Error(`Connection timeout after ${timeoutMs}ms`)),
        timeoutMs,
      );
      const checkConnection = () => {
        if (pc.connectionState === 'connected') {
          if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
          pc.removeEventListener('connectionstatechange', checkConnection);
          resolve();
        } else if (pc.connectionState === 'failed') {
          if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
          pc.removeEventListener('connectionstatechange', checkConnection);
          reject(new Error('Connection failed'));
        }
      };
      pc.addEventListener('connectionstatechange', checkConnection);
      checkConnection();
    });
  }

  private cleanup(): void {
    if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
    if (this.dataChannel) this.dataChannel.close();
    if (this.mediaStream) this.mediaStream.getTracks().forEach((t) => t.stop());
    if (this.peerConnection) this.peerConnection.close();
    this.connectionTimeout = this.dataChannel = this.mediaStream = this.peerConnection = null;
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
