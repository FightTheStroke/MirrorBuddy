/**
 * Collaboration event handling
 * Processes SSE events from the collaboration server
 */

import { Dispatch, SetStateAction } from "react";
import type { MindmapData } from "@/lib/tools/mindmap-export/index";
import type { RoomParticipant } from "@/lib/collab/mindmap-room";
import type { CollabSSEEvent } from "@/app/api/collab/sse/route";
import type { CollaborationState } from "./types";

/**
 * Handle collaboration SSE events
 * Updates state based on event type (user presence, cursors, selections, mindmap changes)
 */
export function createEventHandler(
  setState: Dispatch<SetStateAction<CollaborationState>>,
  userId: string,
  refreshMindmap: (roomId: string) => Promise<void>,
  onMindmapUpdate: ((mindmap: MindmapData) => void) | undefined,
  onParticipantJoin: ((participant: RoomParticipant) => void) | undefined,
  onParticipantLeave: ((userId: string) => void) | undefined,
) {
  return (event: CollabSSEEvent, roomId: string) => {
    switch (event.type) {
      case "user:online":
      case "user:join": {
        const participant = event.data.user as RoomParticipant | undefined;
        if (participant && participant.id !== userId) {
          setState((prev) => ({
            ...prev,
            participants: [
              ...prev.participants.filter((p) => p.id !== participant.id),
              participant,
            ],
          }));
          onParticipantJoin?.(participant);
        }
        break;
      }

      case "user:offline":
      case "user:leave": {
        const leftUserId = event.userId;
        if (leftUserId !== userId) {
          setState((prev) => ({
            ...prev,
            participants: prev.participants.filter((p) => p.id !== leftUserId),
            cursors: new Map(
              [...prev.cursors].filter(([id]) => id !== leftUserId),
            ),
            selections: new Map(
              [...prev.selections].filter(([id]) => id !== leftUserId),
            ),
          }));
          onParticipantLeave?.(leftUserId);
        }
        break;
      }

      case "user:cursor": {
        const cursor = event.data.cursor as
          | { x: number; y: number }
          | undefined;
        if (cursor && event.userId !== userId) {
          setState((prev) => {
            const participant = prev.participants.find(
              (p) => p.id === event.userId,
            );
            if (!participant) return prev;
            const newCursors = new Map(prev.cursors);
            newCursors.set(event.userId, {
              x: cursor.x,
              y: cursor.y,
              name: participant.name,
              color: participant.color,
            });
            return { ...prev, cursors: newCursors };
          });
        }
        break;
      }

      case "user:select": {
        const nodeId = event.data.nodeId as string | undefined;
        if (event.userId !== userId) {
          setState((prev) => {
            const newSelections = new Map(prev.selections);
            if (nodeId) {
              newSelections.set(event.userId, nodeId);
            } else {
              newSelections.delete(event.userId);
            }
            return { ...prev, selections: newSelections };
          });
        }
        break;
      }

      case "node:add":
      case "node:update":
      case "node:delete":
      case "node:move": {
        // Update version and refresh mindmap
        if (event.version) {
          setState((prev) => ({ ...prev, version: event.version! }));
        }
        if (roomId) {
          refreshMindmap(roomId);
        }
        break;
      }

      case "sync:full": {
        const mindmap = event.data.mindmap as MindmapData | undefined;
        const participants = event.data.participants as
          | RoomParticipant[]
          | undefined;
        if (mindmap) {
          onMindmapUpdate?.(mindmap);
        }
        if (participants) {
          setState((prev) => ({
            ...prev,
            participants: participants.filter((p) => p.id !== userId),
            version: event.version || prev.version,
          }));
        }
        break;
      }
    }
  };
}
