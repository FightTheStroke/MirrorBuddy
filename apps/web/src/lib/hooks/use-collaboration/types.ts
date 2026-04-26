/**
 * Types for use-collaboration hook
 */

import type {
  MindmapData,
  MindmapNode,
} from "@/lib/tools/mindmap-export/index";
import type { RoomParticipant } from "@/lib/collab/mindmap-room";

export interface CollaborationState {
  isConnected: boolean;
  isConnecting: boolean;
  roomId: string | null;
  participants: RoomParticipant[];
  cursors: Map<string, { x: number; y: number; name: string; color: string }>;
  selections: Map<string, string>; // userId -> nodeId
  version: number;
  error: string | null;
}

export interface CollaborationActions {
  createRoom: (mindmap: MindmapData) => Promise<string | null>;
  joinRoom: (roomId: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  updateCursor: (x: number, y: number) => void;
  selectNode: (nodeId: string | null) => void;
  addNode: (node: MindmapNode, parentId: string) => Promise<boolean>;
  updateNode: (
    nodeId: string,
    changes: Partial<MindmapNode>,
  ) => Promise<boolean>;
  deleteNode: (nodeId: string) => Promise<boolean>;
  moveNode: (nodeId: string, newParentId: string) => Promise<boolean>;
}

export interface UseCollaborationOptions {
  userId: string;
  userName: string;
  userAvatar?: string;
  onMindmapUpdate?: (mindmap: MindmapData) => void;
  onParticipantJoin?: (participant: RoomParticipant) => void;
  onParticipantLeave?: (userId: string) => void;
}
