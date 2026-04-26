/**
 * Tool Orchestrator Types
 * Interfaces and type definitions for the tool execution system
 * Separated for modularity and file size limits
 */

import type { Permission } from './types';
import type { ChatMessage } from '@/types/conversation';
import type { StudentProfile } from '@/types/user';
import type { ToolDataChannelMessage } from './data-channel-protocol';

/**
 * EventBroadcaster - Interface for broadcasting tool events
 * Supports multiple backends: WebRTC DataChannel, SSE, etc.
 * Enables real-time tool event monitoring (F-14)
 */
export interface EventBroadcaster {
  sendEvent(event: ToolDataChannelMessage): boolean;
}

/**
 * Enhanced ToolContext with full execution context
 * Extends base ToolContext with additional metadata for prerequisites and handlers
 */
export interface ToolExecutionContext {
  /** User identifier - required for authentication */
  userId: string;

  /** Session identifier - required for tracking */
  sessionId: string;

  /** Optional maestro identifier for tutor context */
  maestroId?: string;

  /** Optional conversation identifier for persistence */
  conversationId?: string;

  /** Conversation history for context-aware execution */
  conversationHistory: ChatMessage[];

  /** User profile for personalization */
  userProfile: StudentProfile | null;

  /** Currently active tools (prevents recursion) */
  activeTools: string[];

  /** User's granted permissions for authorization checks */
  grantedPermissions?: Permission[];
}
