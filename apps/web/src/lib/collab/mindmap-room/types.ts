import type { MindmapNode } from '@/types/tools';

export interface RoomParticipant {
  id: string;
  name: string;
  avatar: string;
  color: string;
  joinedAt: number;
  lastActivity: number;
  cursor?: { x: number; y: number };
  selectedNode?: string;
}

export interface MindmapData {
  root: MindmapNode;
  updatedAt: string;
}

export interface MindmapRoom {
  id: string;
  mindmapState: MindmapData;
  participants: Map<string, RoomParticipant>;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface RoomUser {
  id: string;
  name: string;
  avatar: string;
}

