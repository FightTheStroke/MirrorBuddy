// WebRTC connection management for Azure OpenAI Realtime API
'use client';

import { logger } from '@/lib/logger';
import type { Maestro } from '@/types';
import type { ConnectionInfo } from './types';
import { CONNECTION_TIMEOUT_MS } from './constants';

export interface WebRTCConnectionConfig {
  maestro: Maestro;
  connectionInfo: ConnectionInfo;
  preferredMicrophoneId?: string;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onICEConnectionStateChange?: (state: RTCIceConnectionState) => void;
  onTrack?: (event: RTCTrackEvent) => void;
  onError?: (error: Error) => void;
  onDataChannelMessage?: (event: Record<string, unknown>) => void;
  onDataChannelOpen?: () => void;
  onDataChannelClose?: () => void;
}

export interface WebRTCConnectionResult {
  peerConnection: RTCPeerConnection;
  mediaStream: MediaStream;
  dataChannel: RTCDataChannel | null;
  cleanup: () => void;
}

interface EphemeralTokenResponse {
  token: string;
  expiresAt: string;
}

interface AzureSDPResponse {
  sdp: string;
  type: 'answer';
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

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
      logger.debug('[WebRTC] Step 1: Getting ephemeral token...');
      const token = await this.getEphemeralToken();
      logger.debug('[WebRTC] Step 2: Got token, getting user media...');
      this.mediaStream = await this.getUserMedia();
      logger.debug('[WebRTC] Step 3: Got media, creating peer connection...');
      this.peerConnection = this.createPeerConnection();
      logger.debug('[WebRTC] Step 4: Adding audio tracks...');
      this.addAudioTracks();
      logger.debug('[WebRTC] Step 5: Creating offer...');
      const offer = await this.createOffer();
      logger.debug('[WebRTC] Step 6: Exchanging SDP with Azure...');
      await this.exchangeSDP(token, offer);
      logger.debug('[WebRTC] Step 7: Waiting for connection...');
      await this.waitForConnection();
      logger.debug('[WebRTC] Step 8: Connection established!');
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
    if (!response.ok) throw new Error(`Failed to get ephemeral token: ${response.statusText}`);
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
    channel.onerror = (event) => logger.error('[WebRTC] Data channel error', { error: event.error });
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
    // Use internal API to get Azure WebRTC endpoint (regional endpoint)
    logger.debug('[WebRTC] SDP: Fetching Azure config...');
    const configResponse = await fetch('/api/realtime/token');
    if (!configResponse.ok) throw new Error('Failed to get Azure config');
    const { webrtcEndpoint } = await configResponse.json();
    if (!webrtcEndpoint) throw new Error('WebRTC endpoint not configured');
    logger.debug('[WebRTC] SDP: Sending offer to Azure...', { url: webrtcEndpoint });
    const response = await fetch(webrtcEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        'Authorization': `Bearer ${token}`,
      },
      body: offer.sdp,
    });
    logger.debug('[WebRTC] SDP: Response status', { status: response.status, ok: response.ok });
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[WebRTC] SDP exchange failed', { status: response.status, error: errorText });
      throw new Error(`SDP exchange failed: ${response.status} - ${errorText}`);
    }
    const answerSDP = await response.text();
    logger.debug('[WebRTC] SDP: Got answer, setting remote description...');
    const answer: AzureSDPResponse = { sdp: answerSDP, type: 'answer' };
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    logger.debug('[WebRTC] SDP: Remote description set successfully');
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.peerConnection) {
        reject(new Error('PeerConnection not initialized'));
        return;
      }
      const pc = this.peerConnection;
      logger.debug('[WebRTC] Waiting for connection...', {
        currentState: pc.connectionState,
        iceState: pc.iceConnectionState
      });
      this.connectionTimeout = setTimeout(() => {
        logger.error('[WebRTC] Connection timeout', {
          state: pc.connectionState,
          iceState: pc.iceConnectionState
        });
        reject(new Error('Connection timeout'));
      }, CONNECTION_TIMEOUT_MS);
      const checkConnection = () => {
        logger.debug('[WebRTC] Connection state changed', {
          state: pc.connectionState,
          iceState: pc.iceConnectionState
        });
        if (pc.connectionState === 'connected') {
          if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
          pc.removeEventListener('connectionstatechange', checkConnection);
          resolve();
        } else if (pc.connectionState === 'failed') {
          if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
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

export async function createWebRTCConnection(
  config: WebRTCConnectionConfig
): Promise<WebRTCConnectionResult> {
  const connection = new WebRTCConnection(config);
  return connection.connect();
}
