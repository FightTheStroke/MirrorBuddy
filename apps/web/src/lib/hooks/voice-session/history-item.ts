/**
 * Rebuilding an earlier exchange for the voice session.
 *
 * When a child carries on a conversation, the messages already exchanged are
 * replayed into the new realtime session so the Maestro remembers them. The
 * realtime API labels text by who produced it: what the child said is
 * `input_text`, what the Maestro said is `output_text`. Sending the Maestro's
 * own words back as `input_text` is rejected outright — the session dies before
 * the first word and the child is told the voice is unavailable.
 */

/** Roles a replayed message can carry. */
export type HistoryRole = 'user' | 'assistant';

export interface HistoryMessage {
  role: HistoryRole;
  content: string;
}

/** The realtime content type the API expects for a message from `role`. */
export function contentTypeForRole(role: HistoryRole): 'input_text' | 'output_text' {
  return role === 'assistant' ? 'output_text' : 'input_text';
}

/** A `conversation.item.create` payload replaying one earlier message. */
export function historyItemEvent(message: HistoryMessage) {
  return {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: message.role,
      content: [{ type: contentTypeForRole(message.role), text: message.content }],
    },
  };
}
