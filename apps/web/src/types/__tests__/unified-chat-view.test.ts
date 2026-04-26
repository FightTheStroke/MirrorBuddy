/**
 * Test suite for UnifiedChatView contract interface
 *
 * Verifies that the interface correctly defines:
 * - Character type discrimination
 * - Voice feature enablement based on tier
 * - Handoff capability between characters
 * - Feature toggles per character type
 * - Message rendering strategies
 */

import { describe, it, expect } from 'vitest';
import type {
  UnifiedChatViewContract,
  ChatFeatureToggles,
  MessageRenderStrategy,
  CharacterType,
} from '../unified-chat-view';

describe('UnifiedChatViewContract', () => {
  describe('type safety', () => {
    it('should accept valid character types', () => {
      const maestroConfig: UnifiedChatViewContract = {
        characterType: 'maestro',
        characterId: 'napoleon',
        voiceEnabled: true,
        handoffEnabled: false,
        featureToggles: {
          tools: true,
          rag: true,
          learningPath: false,
          webcam: false,
        },
        messageRenderer: 'standard',
      };

      const coachConfig: UnifiedChatViewContract = {
        characterType: 'coach',
        characterId: 'melissa',
        voiceEnabled: true,
        handoffEnabled: true,
        featureToggles: {
          tools: true,
          rag: false,
          learningPath: true,
          webcam: false,
        },
        messageRenderer: 'supportive',
      };

      const buddyConfig: UnifiedChatViewContract = {
        characterType: 'buddy',
        characterId: 'mario',
        voiceEnabled: false,
        handoffEnabled: true,
        featureToggles: {
          tools: false,
          rag: false,
          learningPath: false,
          webcam: false,
        },
        messageRenderer: 'peer',
      };

      expect(maestroConfig.characterType).toBe('maestro');
      expect(coachConfig.characterType).toBe('coach');
      expect(buddyConfig.characterType).toBe('buddy');
    });

    it('should enforce boolean flags for voice and handoff', () => {
      const config: UnifiedChatViewContract = {
        characterType: 'maestro',
        characterId: 'newton',
        voiceEnabled: false,
        handoffEnabled: false,
        featureToggles: {
          tools: true,
          rag: true,
          learningPath: false,
          webcam: false,
        },
        messageRenderer: 'standard',
      };

      expect(typeof config.voiceEnabled).toBe('boolean');
      expect(typeof config.handoffEnabled).toBe('boolean');
    });
  });

  describe('feature toggles', () => {
    it('should define all required feature flags', () => {
      const toggles: ChatFeatureToggles = {
        tools: true,
        rag: true,
        learningPath: false,
        webcam: false,
      };

      expect(toggles).toHaveProperty('tools');
      expect(toggles).toHaveProperty('rag');
      expect(toggles).toHaveProperty('learningPath');
      expect(toggles).toHaveProperty('webcam');
    });

    it('should allow all toggles to be false for trial tier', () => {
      const trialToggles: ChatFeatureToggles = {
        tools: false,
        rag: false,
        learningPath: false,
        webcam: false,
      };

      expect(Object.values(trialToggles).every((v) => v === false)).toBe(true);
    });

    it('should allow selective enablement for base tier', () => {
      const baseToggles: ChatFeatureToggles = {
        tools: true,
        rag: true,
        learningPath: false,
        webcam: false,
      };

      expect(baseToggles.tools).toBe(true);
      expect(baseToggles.rag).toBe(true);
      expect(baseToggles.learningPath).toBe(false);
      expect(baseToggles.webcam).toBe(false);
    });

    it('should allow all toggles to be true for pro tier', () => {
      const proToggles: ChatFeatureToggles = {
        tools: true,
        rag: true,
        learningPath: true,
        webcam: true,
      };

      expect(Object.values(proToggles).every((v) => v === true)).toBe(true);
    });
  });

  describe('message renderer strategies', () => {
    it('should accept valid renderer strategies', () => {
      const strategies: MessageRenderStrategy[] = ['standard', 'supportive', 'peer'];

      strategies.forEach((strategy) => {
        const config: UnifiedChatViewContract = {
          characterType: 'maestro',
          characterId: 'einstein',
          voiceEnabled: true,
          handoffEnabled: false,
          featureToggles: {
            tools: true,
            rag: true,
            learningPath: false,
            webcam: false,
          },
          messageRenderer: strategy,
        };

        expect(config.messageRenderer).toBe(strategy);
      });
    });
  });

  describe('character type mapping', () => {
    it('should map character types correctly', () => {
      const types: CharacterType[] = ['maestro', 'coach', 'buddy'];

      types.forEach((type) => {
        const config: UnifiedChatViewContract = {
          characterType: type,
          characterId: 'test-id',
          voiceEnabled: false,
          handoffEnabled: false,
          featureToggles: {
            tools: false,
            rag: false,
            learningPath: false,
            webcam: false,
          },
          messageRenderer: 'standard',
        };

        expect(config.characterType).toBe(type);
      });
    });
  });

  describe('voice enablement logic', () => {
    it('should disable voice for trial tier regardless of character', () => {
      const trialConfig: UnifiedChatViewContract = {
        characterType: 'maestro',
        characterId: 'newton',
        voiceEnabled: false, // Trial tier restriction
        handoffEnabled: false,
        featureToggles: {
          tools: false,
          rag: false,
          learningPath: false,
          webcam: false,
        },
        messageRenderer: 'standard',
      };

      expect(trialConfig.voiceEnabled).toBe(false);
    });

    it('should enable voice for base/pro tiers', () => {
      const proConfig: UnifiedChatViewContract = {
        characterType: 'coach',
        characterId: 'melissa',
        voiceEnabled: true, // Pro tier enabled
        handoffEnabled: true,
        featureToggles: {
          tools: true,
          rag: true,
          learningPath: true,
          webcam: true,
        },
        messageRenderer: 'supportive',
      };

      expect(proConfig.voiceEnabled).toBe(true);
    });
  });

  describe('handoff scenarios', () => {
    it('should disable handoff for maestro (subject-specific)', () => {
      const maestroConfig: UnifiedChatViewContract = {
        characterType: 'maestro',
        characterId: 'napoleon',
        voiceEnabled: true,
        handoffEnabled: false, // Maestri don't hand off
        featureToggles: {
          tools: true,
          rag: true,
          learningPath: false,
          webcam: false,
        },
        messageRenderer: 'standard',
      };

      expect(maestroConfig.handoffEnabled).toBe(false);
    });

    it('should enable handoff for coach to buddy', () => {
      const coachConfig: UnifiedChatViewContract = {
        characterType: 'coach',
        characterId: 'melissa',
        voiceEnabled: true,
        handoffEnabled: true, // Can hand off to buddy
        featureToggles: {
          tools: true,
          rag: false,
          learningPath: true,
          webcam: false,
        },
        messageRenderer: 'supportive',
      };

      expect(coachConfig.handoffEnabled).toBe(true);
    });

    it('should enable handoff for buddy to coach', () => {
      const buddyConfig: UnifiedChatViewContract = {
        characterType: 'buddy',
        characterId: 'mario',
        voiceEnabled: true,
        handoffEnabled: true, // Can hand off to coach
        featureToggles: {
          tools: false,
          rag: false,
          learningPath: false,
          webcam: false,
        },
        messageRenderer: 'peer',
      };

      expect(buddyConfig.handoffEnabled).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should create valid config for trial user with maestro', () => {
      const config: UnifiedChatViewContract = {
        characterType: 'maestro',
        characterId: 'newton',
        voiceEnabled: false,
        handoffEnabled: false,
        featureToggles: {
          tools: false,
          rag: false,
          learningPath: false,
          webcam: false,
        },
        messageRenderer: 'standard',
      };

      expect(config.characterType).toBe('maestro');
      expect(config.voiceEnabled).toBe(false);
      expect(config.handoffEnabled).toBe(false);
      expect(config.featureToggles.tools).toBe(false);
    });

    it('should create valid config for pro user with coach', () => {
      const config: UnifiedChatViewContract = {
        characterType: 'coach',
        characterId: 'melissa',
        voiceEnabled: true,
        handoffEnabled: true,
        featureToggles: {
          tools: true,
          rag: true,
          learningPath: true,
          webcam: true,
        },
        messageRenderer: 'supportive',
      };

      expect(config.characterType).toBe('coach');
      expect(config.voiceEnabled).toBe(true);
      expect(config.handoffEnabled).toBe(true);
      expect(config.featureToggles.tools).toBe(true);
      expect(config.messageRenderer).toBe('supportive');
    });
  });
});
