// ============================================================================
// API ROUTE: Mindmap Modification via SSE Broadcast
// Receives voice commands for mindmap modifications and broadcasts to clients
// Part of Phase 7: Voice Commands for Mindmaps
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { broadcastToolEvent, type MindmapModifyCommand } from '@/lib/realtime/tool-events';
import { nanoid } from 'nanoid';

interface ModifyRequest {
  sessionId: string;
  command: MindmapModifyCommand;
  args: Record<string, unknown>;
}

const VALID_COMMANDS: MindmapModifyCommand[] = [
  'mindmap_add_node',
  'mindmap_connect_nodes',
  'mindmap_expand_node',
  'mindmap_delete_node',
  'mindmap_focus_node',
  'mindmap_set_color',
];

export async function POST(request: NextRequest) {
  try {
    const body: ModifyRequest = await request.json();
    const { sessionId, command, args } = body;

    // Validate required fields
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    if (!command || !VALID_COMMANDS.includes(command)) {
      return NextResponse.json(
        { error: 'Invalid command', validCommands: VALID_COMMANDS },
        { status: 400 }
      );
    }

    // Validate session ID format (prevent injection)
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid sessionId format' },
        { status: 400 }
      );
    }

    // Broadcast the modification event
    broadcastToolEvent({
      id: nanoid(),
      type: 'mindmap:modify',
      toolType: 'mindmap',
      sessionId,
      maestroId: 'voice', // Voice commands don't have a specific maestro
      timestamp: Date.now(),
      data: {
        command,
        args,
      },
    });

    logger.info('Mindmap modification broadcast', {
      sessionId,
      command,
      args,
    });

    return NextResponse.json({
      success: true,
      message: 'Modification broadcast',
    });
  } catch (error) {
    logger.error('Failed to process mindmap modification', {
      error: String(error),
    });

    return NextResponse.json(
      { error: 'Failed to process modification', message: String(error) },
      { status: 500 }
    );
  }
}
