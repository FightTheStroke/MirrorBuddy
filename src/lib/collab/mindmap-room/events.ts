import type { MindmapNode } from '@/types/tools';
import type { RoomParticipant } from './types';

export type CollabEventType =
  | 'room:created'
  | 'room:joined'
  | 'room:left'
  | 'room:closed'
  | 'node:added'
  | 'node:updated'
  | 'node:deleted'
  | 'node:moved'
  | 'cursor:updated'
  | 'selection:updated'
  | 'mindmap:synced'
  | 'user:cursor'
  | 'user:select';

export interface CollabEventData {
  roomId?: string;
  userId?: string;
  nodeId?: string;
  node?: MindmapNode;
  parentId?: string;
  changes?: Partial<MindmapNode>;
  newParentId?: string;
  cursor?: { x: number; y: number };
  selectedNode?: string;
  mindmap?: { root: MindmapNode; updatedAt: string };
  participants?: RoomParticipant[];
  version?: number;
  user?: RoomParticipant;
}

export interface CollabEvent {
  type: CollabEventType;
  roomId: string;
  data: CollabEventData;
  timestamp: number;
}

