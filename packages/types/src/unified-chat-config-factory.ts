/**
 * Unified Chat Config Factory
 *
 * Creates UnifiedChatViewContract from character info and tier.
 * Part of W4-ConversationUnification (T4-04, T4-05)
 *
 * Feature flag: chat_unified_view
 */

import type { UnifiedChatViewContract, MessageRenderStrategy } from './unified-chat-view';
import type { TierName } from './tier-types';

/**
 * Create a unified chat config from character type, tier, and ID
 *
 * Business Rules (from UnifiedChatViewContract docs):
 * - Voice: Trial=false, Base/Pro=true
 * - Handoff: Maestro=false, Coach/Buddy=true
 * - Tools/RAG/Learning Path vary by character type
 */
export function createUnifiedChatConfig(params: {
  characterType: 'maestro' | 'coach' | 'buddy';
  characterId: string;
  tierName: TierName;
}): UnifiedChatViewContract {
  const { characterType, characterId, tierName } = params;

  // Voice enabled for base+ tiers
  const voiceEnabled = tierName === 'base' || tierName === 'pro';

  // Handoff enabled for coaches and buddies, NOT maestri
  const handoffEnabled = characterType === 'coach' || characterType === 'buddy';

  // Message rendering strategy based on character type
  const messageRenderer: MessageRenderStrategy =
    characterType === 'maestro' ? 'standard' : characterType === 'coach' ? 'supportive' : 'peer';

  // Feature toggles based on character type and tier
  const featureToggles = buildFeatureToggles(characterType, tierName);

  return {
    characterType,
    characterId,
    voiceEnabled,
    handoffEnabled,
    featureToggles,
    messageRenderer,
  };
}

/**
 * Build feature toggles matrix
 *
 * | Feature      | Maestro (subject) | Coach (methods) | Buddy (support) |
 * |--------------|-------------------|-----------------|-----------------|
 * | tools        | base+             | base+           | false           |
 * | rag          | base+             | false           | false           |
 * | learningPath | false             | base+           | false           |
 * | webcam       | false             | false           | pro only        |
 */
function buildFeatureToggles(characterType: 'maestro' | 'coach' | 'buddy', tierName: TierName) {
  const isBasePlus = tierName === 'base' || tierName === 'pro';
  const isPro = tierName === 'pro';

  switch (characterType) {
    case 'maestro':
      return {
        tools: isBasePlus,
        rag: isBasePlus,
        learningPath: false,
        webcam: false,
      };

    case 'coach':
      return {
        tools: isBasePlus,
        rag: false,
        learningPath: isBasePlus,
        webcam: false,
      };

    case 'buddy':
      return {
        tools: false,
        rag: false,
        learningPath: false,
        webcam: isPro,
      };

    default:
      // Should never happen with TypeScript, but provide safe fallback
      return {
        tools: false,
        rag: false,
        learningPath: false,
        webcam: false,
      };
  }
}
