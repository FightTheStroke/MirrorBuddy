import { MaestroConversationAdapter } from '@/components/chat/adapters';

/**
 * MaestroSession migrated to ConversationShell + UnifiedChat adapter.
 * Feature flag: chat_unified_view.
 */
export const MaestroSession = MaestroConversationAdapter;
