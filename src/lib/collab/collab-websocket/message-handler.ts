/**
 * @file message-handler.ts
 * @brief Main message handler router
 */

import { logger } from "@/lib/logger";
import type { MindmapNode as ExportNode } from "@/lib/tools/mindmap-export/index";
import type { MindmapNode as _MindmapNode } from "@/types/tools";
import { convertExportNodeToToolNode } from "../mindmap-room/node-converter";
import type { CollabMessage } from "./types";
import { connections } from "./connection-manager";
import { sendToConnection } from "./messaging-utils";
import {
  handleCreateRoom,
  handleJoinRoom,
  handleLeaveRoom,
  handleCloseRoom,
} from "./room-handlers";
import { handleCursorMove, handleNodeSelect } from "./cursor-handlers";
import {
  handleNodeAdd,
  handleNodeUpdate,
  handleNodeDelete,
  handleNodeMove,
  handleSyncRequest,
} from "./node-handlers";

export function handleMessage(
  connectionId: string,
  message: CollabMessage,
): void {
  const connection = connections.get(connectionId);
  if (!connection) {
    logger.warn("Message from unknown connection", { connectionId });
    return;
  }

  connection.lastPing = Date.now();
  connection.isAlive = true;

  logger.debug("WebSocket message received", {
    connectionId,
    userId: connection.userId,
    type: message.type,
  });

  switch (message.type) {
    case "ping":
      sendToConnection(connectionId, { type: "pong", data: {} });
      break;

    case "pong":
      connection.isAlive = true;
      break;

    case "room:create": {
      const data = message.data as {
        mindmap: { title: string; root: ExportNode };
        user: { id: string; name: string; avatar: string };
      };
      handleCreateRoom(connectionId, data);
      break;
    }

    case "room:join":
      handleJoinRoom(
        connectionId,
        message.roomId!,
        message.data as {
          user: { id: string; name: string; avatar: string };
        },
      );
      break;

    case "room:leave":
      handleLeaveRoom(connectionId);
      break;

    case "room:close":
      handleCloseRoom(connectionId);
      break;

    case "cursor:move":
      handleCursorMove(
        connectionId,
        message.data as {
          cursor: { x: number; y: number };
        },
      );
      break;

    case "node:select":
      handleNodeSelect(
        connectionId,
        message.data as {
          nodeId?: string;
        },
      );
      break;

    case "node:add": {
      const data = message.data as {
        node: ExportNode;
        parentId: string;
      };
      handleNodeAdd(connectionId, {
        node: convertExportNodeToToolNode(data.node),
        parentId: data.parentId,
      });
      break;
    }

    case "node:update": {
      const data = message.data as {
        nodeId: string;
        changes: Partial<ExportNode>;
      };
      handleNodeUpdate(connectionId, {
        nodeId: data.nodeId,
        changes: data.changes,
      });
      break;
    }

    case "node:delete":
      handleNodeDelete(
        connectionId,
        message.data as {
          nodeId: string;
        },
      );
      break;

    case "node:move":
      handleNodeMove(
        connectionId,
        message.data as {
          nodeId: string;
          newParentId: string;
        },
      );
      break;

    case "sync:request":
      handleSyncRequest(connectionId);
      break;

    default:
      logger.warn("Unknown message type", { type: message.type });
  }
}
