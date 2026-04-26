import type { Maestro } from '@/types';

export interface ConnectionInfo {
  provider: 'azure';
  proxyPort: number;
  configured: boolean;
}

export interface ConnectionError {
  error: string;
  missingVariables?: string[];
  message?: string;
}

export interface VoiceSessionProps {
  maestro: Maestro;
  onClose: () => void;
  onSwitchToChat?: () => void;
}

export interface WebcamRequest {
  purpose: string;
  instructions?: string;
  callId: string;
}
