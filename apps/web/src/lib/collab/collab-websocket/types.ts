/**
 * @file types.ts
 * @brief Types for collaboration WebSocket
 */

export interface CollabConnection {
  id: string;
  userId: string;
  roomId: string | null;
  socket: WebSocket;
  isAlive: boolean;
  lastPing: number;
}

export interface CollabMessage {
  type: CollabMessageType;
  roomId?: string;
  data?: Record<string, unknown>;
}

export type CollabMessageType =
  | 'room:create'
  | 'room:join'
  | 'room:leave'
  | 'room:close'
  | 'cursor:move'
  | 'node:select'
  | 'node:add'
  | 'node:update'
  | 'node:delete'
  | 'node:move'
  | 'sync:request'
  | 'ping'
  | 'pong';

