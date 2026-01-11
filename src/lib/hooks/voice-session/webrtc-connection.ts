// ============================================================================
// WebRTC Connection
// WebRTC connection management for Azure OpenAI Realtime API
// ============================================================================

'use client';

import { logger } from '@/lib/logger';
import { CONNECTION_TIMEOUT_MS } from './constants';
import type {
  WebRTCConnectionConfig,
  WebRTCConnectionResult,
  EphemeralTokenResponse,
  AzureSDPResponse,
} from './webrtc-types';
import { ICE_SERVERS } from './webrtc-types';

// Re-export types for backwards compatibility
export type { WebRTCConnectionConfig, WebRTCConnectionResult } from './webrtc-types';

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
    try {
      const token = await this.getEphemeralToken();
      this.mediaStream = await this.getUserMedia();
      this.peerConnection = this.createPeerConnection();
      this.addAudioTracks();
      const offer = await this.createOffer();
      await this.exchangeSDP(token, offer);
      await this.waitForConnection();
      logger.debug('[WebRTC] Connection established');
      return {
        peerConnection: this.peerConnection,
        mediaStream: this.mediaStream,
        dataChannel: this.dataChannel,
        cleanup: () => this.cleanup(),
      };
    } catch (error) {
      this.cleanup();
      const message = error instanceof Error ? error.message : 'Unknown WebRTC error';
      logger.error('[WebRTC] Connection failed', { error: message });
      this.config.onError?.(new Error(message));
      throw error;
    }
  }

  private async getEphemeralToken(): Promise<string> {
    const response = await fetch('/api/realtime/ephemeral-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Il microfono non è disponibile. Assicurati di usare HTTPS o localhost.');
    }
    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
    if (this.config.preferredMicrophoneId) {
      audioConstraints.deviceId = { ideal: this.config.preferredMicrophoneId };
    }
    return navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
  }

  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onconnectionstatechange = () => {
      this.config.onConnectionStateChange?.(pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.config.onError?.(new Error(`Connection ${pc.connectionState}`));
      }
    };
    pc.oniceconnectionstatechange = () => {
      this.config.onICEConnectionStateChange?.(pc.iceConnectionState);
    };
    pc.onicecandidate = (event) => {
      if (!event.candidate) logger.debug('[WebRTC] ICE gathering complete');
    };
    pc.ontrack = (event) => this.config.onTrack?.(event);
    pc.ondatachannel = (event) => this.attachDataChannel(event.channel);
    return pc;
  }

  private attachDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;
    channel.onopen = () => this.config.onDataChannelOpen?.();
    channel.onclose = () => {
      this.dataChannel = null;
      this.config.onDataChannelClose?.();
    };
    channel.onerror = (event) => {
      logger.error('[WebRTC] Data channel error', { error: event.error });
    };
    channel.onmessage = (event) => {
      try {
        this.config.onDataChannelMessage?.(JSON.parse(event.data));
      } catch {
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
    this.mediaStream.getTracks().forEach((track) => {
      this.peerConnection!.addTrack(track, this.mediaStream!);
    });
  }

  private async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    const offer = await this.peerConnection.createOffer({ offerToReceiveAudio: true });
    await this.peerConnection.setLocalDescription(offer);
    if (this.peerConnection.iceGatheringState !== 'complete') {
      await new Promise<void>((resolve) => {
        const checkState = () => {
          if (this.peerConnection!.iceGatheringState === 'complete') {
            this.peerConnection!.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }
        };
        this.peerConnection!.addEventListener('icegatheringstatechange', checkState);
      });
    }
    return this.peerConnection.localDescription!;
  }

  private async exchangeSDP(token: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const configResponse = await fetch('/api/realtime/token');
    if (!configResponse.ok) throw new Error('Failed to get Azure config');
    const { webrtcEndpoint } = await configResponse.json();
    if (!webrtcEndpoint) throw new Error('WebRTC endpoint not configured');
    const response = await fetch(webrtcEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp', 'Authorization': `Bearer ${token}` },
      body: offer.sdp,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SDP exchange failed: ${response.status} - ${errorText}`);
    }
    const answer: AzureSDPResponse = { sdp: await response.text(), type: 'answer' };
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.peerConnection) {
        reject(new Error('PeerConnection not initialized'));
        return;
      }
      const pc = this.peerConnection;
      this.connectionTimeout = setTimeout(() => reject(new Error('Connection timeout')), CONNECTION_TIMEOUT_MS);
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
  config: WebRTCConnectionConfig
): Promise<WebRTCConnectionResult> {
  const connection = new WebRTCConnection(config);
  return connection.connect();
}
