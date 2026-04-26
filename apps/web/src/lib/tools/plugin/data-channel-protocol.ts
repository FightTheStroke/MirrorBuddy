/**
 * Tool Event Protocol for WebRTC DataChannel
 * Defines message types and serialization for tool events over DataChannel
 * Enables real-time tool communication alongside audio stream (F-14)
 */

/**
 * ToolEventType - Enumeration of tool event types for DataChannel communication
 * Maps to tool lifecycle stages during proposal and execution
 */
export enum ToolEventType {
  // Tool has been proposed by AI and sent to client
  TOOL_PROPOSED = "TOOL_PROPOSED",

  // User has accepted the proposed tool
  TOOL_ACCEPTED = "TOOL_ACCEPTED",

  // User has rejected the proposed tool
  TOOL_REJECTED = "TOOL_REJECTED",

  // Tool execution has started on client
  TOOL_EXECUTING = "TOOL_EXECUTING",

  // Tool execution completed successfully
  TOOL_COMPLETED = "TOOL_COMPLETED",

  // Tool execution failed with error
  TOOL_ERROR = "TOOL_ERROR",
}

/**
 * ToolDataChannelMessage - Message structure for tool events on DataChannel
 * All messages include type, toolId, optional payload, and server timestamp
 */
export interface ToolDataChannelMessage {
  // Type of tool event
  type: ToolEventType;

  // Unique identifier for the tool
  toolId: string;

  // Optional tool metadata for SSE bridge
  toolType?: string;
  sessionId?: string;
  maestroId?: string;

  // Optional payload data (varies by event type)
  payload?: Record<string, unknown> | string | number | boolean;

  // Server timestamp (ISO 8601 format) for ordering and debugging
  timestamp: number;
}

/**
 * serializeMessage - Convert ToolDataChannelMessage to JSON string
 * Used for sending messages over WebRTC DataChannel
 *
 * @param msg - The message to serialize
 * @returns JSON string representation of the message
 * @throws Error if serialization fails
 */
export function serializeMessage(msg: ToolDataChannelMessage): string {
  try {
    return JSON.stringify(msg);
  } catch (error) {
    const err = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to serialize tool message: ${err}`);
  }
}

/**
 * deserializeMessage - Parse JSON string to ToolDataChannelMessage
 * Used for receiving messages from WebRTC DataChannel
 *
 * @param data - JSON string to deserialize
 * @returns Parsed message or null if invalid
 */
export function deserializeMessage(
  data: string,
): ToolDataChannelMessage | null {
  try {
    const parsed = JSON.parse(data);

    // Validate required fields
    if (
      !parsed.type ||
      !Object.values(ToolEventType).includes(parsed.type) ||
      !parsed.toolId ||
      typeof parsed.timestamp !== "number"
    ) {
      return null;
    }

    return {
      type: parsed.type as ToolEventType,
      toolId: parsed.toolId as string,
      payload: parsed.payload,
      timestamp: parsed.timestamp as number,
    };
  } catch {
    return null;
  }
}

/**
 * Helper to create a tool event message
 * Automatically sets timestamp to current time
 *
 * @param type - The event type
 * @param toolId - The tool identifier
 * @param payload - Optional message payload
 * @returns A new ToolDataChannelMessage
 */
export function createToolMessage(
  type: ToolEventType,
  toolId: string,
  payload?: Record<string, unknown> | string | number | boolean,
  meta?: {
    toolType?: string;
    sessionId?: string;
    maestroId?: string;
  },
): ToolDataChannelMessage {
  return {
    type,
    toolId,
    toolType: meta?.toolType,
    sessionId: meta?.sessionId,
    maestroId: meta?.maestroId,
    payload,
    timestamp: Date.now(),
  };
}
