/**
 * Realtime Proxy Type Definitions
 */

import type { WebSocket } from 'ws';

export interface ProxyConnection {
  clientWs: WebSocket;
  backendWs: WebSocket | null;
  maestroId: string;
  lastActivityTime: number;
  idleTimer: NodeJS.Timeout | null;
}

export type Provider = 'openai' | 'azure';
export type CharacterType = 'maestro' | 'coach' | 'buddy';

export interface ProviderConfig {
  provider: Provider;
  wsUrl: string;
  headers: Record<string, string>;
}
