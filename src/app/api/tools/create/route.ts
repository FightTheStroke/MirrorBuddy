/**
 * API Route: Create Tool
 *
 * Creates a new tool from voice commands and broadcasts events.
 * Part of I-02: Voice Tool Commands.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  createToolState,
  updateToolState,
  completeToolState,
} from '@/lib/realtime/tool-state';
import {
  broadcastToolEvent,
  type ToolType,
} from '@/lib/realtime/tool-events';
import { validateAuth, validateSessionOwnership } from '@/lib/auth/session-auth';

// Valid tool types
const VALID_TOOL_TYPES: ToolType[] = [
  'mindmap',
  'flashcards',
  'quiz',
  'summary',
  'timeline',
  'diagram',
];

interface CreateToolRequest {
  sessionId: string;
  maestroId: string;
  toolType: ToolType;
  title: string;
  subject?: string;
  content: Record<string, unknown>;
}

/**
 * Create a new tool from voice command
 *
 * Body:
 * - sessionId: Current session ID
 * - maestroId: Maestro creating the tool
 * - toolType: Type of tool to create
 * - title: Tool title
 * - subject: Optional subject
 * - content: Tool content/arguments
 */
export async function POST(request: NextRequest) {
  try {
    // #83: Authentication check - tool creation requires authenticated user
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: CreateToolRequest = await request.json();
    const { sessionId, maestroId, toolType, title, subject, content } = body;

    // Validate required fields
    if (!sessionId || !maestroId || !toolType || !title) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['sessionId', 'maestroId', 'toolType', 'title'],
        },
        { status: 400 }
      );
    }

    // Validate tool type
    if (!VALID_TOOL_TYPES.includes(toolType)) {
      return NextResponse.json(
        {
          error: 'Invalid tool type',
          validTypes: VALID_TOOL_TYPES,
        },
        { status: 400 }
      );
    }

    // Validate session ID format
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid sessionId format' },
        { status: 400 }
      );
    }

    // #83: Verify session ownership - user can only create tools in their own sessions
    const ownsSession = await validateSessionOwnership(sessionId, auth.userId);
    if (!ownsSession) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 403 }
      );
    }

    // Generate tool ID
    const toolId = `voice-tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Create tool state
    const toolState = createToolState({
      id: toolId,
      type: toolType,
      sessionId,
      maestroId,
      title,
      subject,
    });

    // Broadcast tool:created event
    broadcastToolEvent({
      id: toolId,
      type: 'tool:created',
      toolType,
      sessionId,
      maestroId,
      timestamp: Date.now(),
      data: {
        title,
        subject,
      },
    });

    logger.info('Tool created from voice command', {
      toolId,
      toolType,
      sessionId,
      maestroId,
      title,
    });

    // If content is provided, update the tool state with it
    if (content && Object.keys(content).length > 0) {
      updateToolState(toolId, {
        content,
        progress: 50,
      });

      // Broadcast progress update
      broadcastToolEvent({
        id: toolId,
        type: 'tool:update',
        toolType,
        sessionId,
        maestroId,
        timestamp: Date.now(),
        data: {
          progress: 50,
        },
      });
    }

    // Complete the tool (for voice commands, content is usually complete)
    // Cast through unknown since voice content may not exactly match ToolContent types
    completeToolState(toolId, content as unknown as Parameters<typeof completeToolState>[1]);

    // Broadcast completion
    broadcastToolEvent({
      id: toolId,
      type: 'tool:complete',
      toolType,
      sessionId,
      maestroId,
      timestamp: Date.now(),
      data: {
        content,
      },
    });

    return NextResponse.json({
      success: true,
      toolId,
      toolType,
      status: toolState.status,
    });
  } catch (error) {
    logger.error('Failed to create tool', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to create tool' },
      { status: 500 }
    );
  }
}

/**
 * Get tool creation info
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/tools/create',
    method: 'POST',
    description: 'Create a tool from voice command',
    toolTypes: VALID_TOOL_TYPES,
    example: {
      sessionId: 'session_abc123',
      maestroId: 'archimede',
      toolType: 'mindmap',
      title: 'I Teoremi di Pitagora',
      subject: 'mathematics',
      content: {
        title: 'I Teoremi di Pitagora',
        topic: 'Teoremi fondamentali della geometria',
        nodes: [
          { id: '1', label: 'Teorema di Pitagora', parentId: null },
          { id: '2', label: 'a² + b² = c²', parentId: '1' },
        ],
      },
    },
  });
}
