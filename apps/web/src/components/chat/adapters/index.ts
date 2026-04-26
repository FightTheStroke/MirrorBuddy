/**
 * Chat Adapters - Unified conversation view adapters
 *
 * Wave: W4-ConversationUnification (T4-04, T4-05)
 * Feature flag: chat_unified_view
 *
 * Exports:
 * - MaestroConversationAdapter: Wraps maestro session with ConversationShell
 * - CharacterConversationAdapter: Wraps coach/buddy chat with ConversationShell
 */

export { MaestroConversationAdapter } from './maestro-conversation-adapter';
export { CharacterConversationAdapter } from './character-conversation-adapter';
