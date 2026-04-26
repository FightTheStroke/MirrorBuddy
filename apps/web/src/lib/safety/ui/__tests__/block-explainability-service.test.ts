/**
 * Tests for Block Explainability Service
 */

import { describe, it, expect } from 'vitest';
import {
  generateBlockExplanation,
  getExplanationEmoji,
  formatExplanationForDisplay,
} from '../block-explainability-service';
import type { SafetyFilterResult, BlockExplanation } from '../types';

describe('block-explainability-service', () => {
  describe('generateBlockExplanation', () => {
    it('generates explanation for content_inappropriate', () => {
      const result: SafetyFilterResult = {
        wasFiltered: true,
        filterType: 'content_inappropriate',
      };

      const explanation = generateBlockExplanation(result);

      expect(explanation.filterType).toBe('content_inappropriate');
      expect(explanation.friendlyExplanation).toContain('non è adatto');
      expect(explanation.suggestAskParent).toBe(true);
      expect(explanation.relatedAllowedTopics).toBeDefined();
    });

    it('generates explanation for off_topic', () => {
      const result: SafetyFilterResult = {
        wasFiltered: true,
        filterType: 'off_topic',
      };

      const explanation = generateBlockExplanation(result);

      expect(explanation.filterType).toBe('off_topic');
      expect(explanation.friendlyExplanation).toContain('fuori tema');
      expect(explanation.suggestAskParent).toBe(false);
    });

    it('generates explanation for personal_info_request', () => {
      const result: SafetyFilterResult = {
        wasFiltered: true,
        filterType: 'personal_info_request',
      };

      const explanation = generateBlockExplanation(result);

      expect(explanation.filterType).toBe('personal_info_request');
      expect(explanation.friendlyExplanation).toContain('privacy');
      expect(explanation.suggestAskParent).toBe(true);
      expect(explanation.relatedAllowedTopics).toBeUndefined();
    });

    it('generates explanation for harmful_content', () => {
      const result: SafetyFilterResult = {
        wasFiltered: true,
        filterType: 'harmful_content',
      };

      const explanation = generateBlockExplanation(result);

      expect(explanation.filterType).toBe('harmful_content');
      expect(explanation.friendlyExplanation).toContain('adulto di fiducia');
      expect(explanation.suggestAskParent).toBe(true);
    });

    it('generates explanation for manipulation_attempt', () => {
      const result: SafetyFilterResult = {
        wasFiltered: true,
        filterType: 'manipulation_attempt',
      };

      const explanation = generateBlockExplanation(result);

      expect(explanation.filterType).toBe('manipulation_attempt');
      expect(explanation.friendlyExplanation).toContain('riformulare');
      expect(explanation.suggestAskParent).toBe(false);
    });

    it('generates explanation for medical_advice', () => {
      const result: SafetyFilterResult = {
        wasFiltered: true,
        filterType: 'medical_advice',
      };

      const explanation = generateBlockExplanation(result);

      expect(explanation.filterType).toBe('medical_advice');
      expect(explanation.friendlyExplanation).toContain('dottore');
      expect(explanation.suggestAskParent).toBe(true);
      expect(explanation.relatedAllowedTopics).toBeDefined();
      expect(explanation.relatedAllowedTopics).toContain('come funziona il corpo umano (per studiare)');
    });

    it('generates explanation for legal_advice', () => {
      const result: SafetyFilterResult = {
        wasFiltered: true,
        filterType: 'legal_advice',
      };

      const explanation = generateBlockExplanation(result);

      expect(explanation.filterType).toBe('legal_advice');
      expect(explanation.friendlyExplanation).toContain('legali');
      expect(explanation.suggestAskParent).toBe(true);
    });

    it('generates default explanation for unknown filterType', () => {
      const result: SafetyFilterResult = {
        wasFiltered: true,
        filterType: 'unknown',
      };

      const explanation = generateBlockExplanation(result);

      expect(explanation.filterType).toBe('unknown');
      expect(explanation.suggestAskParent).toBe(false);
      expect(explanation.relatedAllowedTopics).toBeDefined();
    });

    it('uses subject-specific alternatives for science', () => {
      const result: SafetyFilterResult = {
        wasFiltered: true,
        filterType: 'off_topic',
      };

      const explanation = generateBlockExplanation(result, 'science');

      expect(explanation.relatedAllowedTopics).toContain('esperimenti sicuri da fare a casa');
      expect(explanation.relatedAllowedTopics).toContain('il sistema solare');
    });

    it('uses subject-specific alternatives for history', () => {
      const result: SafetyFilterResult = {
        wasFiltered: true,
        filterType: 'off_topic',
      };

      const explanation = generateBlockExplanation(result, 'history');

      expect(explanation.relatedAllowedTopics).toContain('le civiltà antiche');
      expect(explanation.relatedAllowedTopics).toContain('esploratori famosi');
    });

    it('uses subject-specific alternatives for literature', () => {
      const result: SafetyFilterResult = {
        wasFiltered: true,
        filterType: 'off_topic',
      };

      const explanation = generateBlockExplanation(result, 'literature');

      expect(explanation.relatedAllowedTopics).toContain('storie di avventura');
      expect(explanation.relatedAllowedTopics).toContain('miti e leggende');
    });

    it('uses subject-specific alternatives for math', () => {
      const result: SafetyFilterResult = {
        wasFiltered: true,
        filterType: 'off_topic',
      };

      const explanation = generateBlockExplanation(result, 'math');

      expect(explanation.relatedAllowedTopics).toContain('giochi matematici');
      expect(explanation.relatedAllowedTopics).toContain('curiosità sui numeri');
    });

    it('falls back to general alternatives for unknown subject', () => {
      const result: SafetyFilterResult = {
        wasFiltered: true,
        filterType: 'off_topic',
      };

      const explanation = generateBlockExplanation(result, 'unknown_subject');

      expect(explanation.relatedAllowedTopics).toContain('curiosità sul mondo');
    });
  });

  describe('getExplanationEmoji', () => {
    it('returns shield emoji for content_inappropriate', () => {
      expect(getExplanationEmoji('content_inappropriate')).toBe('🛡️');
    });

    it('returns shield emoji for harmful_content', () => {
      expect(getExplanationEmoji('harmful_content')).toBe('🛡️');
    });

    it('returns book emoji for off_topic', () => {
      expect(getExplanationEmoji('off_topic')).toBe('📚');
    });

    it('returns lock emoji for personal_info_request', () => {
      expect(getExplanationEmoji('personal_info_request')).toBe('🔒');
    });

    it('returns thinking emoji for manipulation_attempt', () => {
      expect(getExplanationEmoji('manipulation_attempt')).toBe('🤔');
    });

    it('returns hospital emoji for medical_advice', () => {
      expect(getExplanationEmoji('medical_advice')).toBe('🏥');
    });

    it('returns scales emoji for legal_advice', () => {
      expect(getExplanationEmoji('legal_advice')).toBe('⚖️');
    });

    it('returns info emoji for unknown type', () => {
      expect(getExplanationEmoji('unknown')).toBe('ℹ️');
    });
  });

  describe('formatExplanationForDisplay', () => {
    const baseExplanation: BlockExplanation = {
      filterType: 'off_topic',
      friendlyExplanation: 'Test explanation',
      suggestedAction: 'Test action',
      suggestAskParent: false,
      relatedAllowedTopics: ['Topic 1', 'Topic 2', 'Topic 3'],
    };

    it('includes explanation and suggested action', () => {
      const display = formatExplanationForDisplay(baseExplanation);

      expect(display).toContain('Test explanation');
      expect(display).toContain('💡 Test action');
    });

    it('includes emoji when includeEmoji is true', () => {
      const display = formatExplanationForDisplay(baseExplanation, true);

      expect(display).toContain('📚'); // off_topic emoji
      expect(display).toContain('Test explanation');
    });

    it('excludes emoji when includeEmoji is false', () => {
      const display = formatExplanationForDisplay(baseExplanation, false);

      expect(display.startsWith('Test explanation')).toBe(true);
    });

    it('includes related topics when available', () => {
      const display = formatExplanationForDisplay(baseExplanation);

      expect(display).toContain('Puoi chiedermi invece di');
      expect(display).toContain('• Topic 1');
      expect(display).toContain('• Topic 2');
      expect(display).toContain('• Topic 3');
    });

    it('limits related topics to 3', () => {
      const explanationWithManyTopics: BlockExplanation = {
        ...baseExplanation,
        relatedAllowedTopics: ['A', 'B', 'C', 'D', 'E'],
      };

      const display = formatExplanationForDisplay(explanationWithManyTopics);

      expect(display).toContain('• A');
      expect(display).toContain('• B');
      expect(display).toContain('• C');
      expect(display).not.toContain('• D');
      expect(display).not.toContain('• E');
    });

    it('includes ask parent suggestion when suggestAskParent is true', () => {
      const explanationWithParent: BlockExplanation = {
        ...baseExplanation,
        suggestAskParent: true,
      };

      const display = formatExplanationForDisplay(explanationWithParent);

      expect(display).toContain('👨‍👩‍👧');
      expect(display).toContain('chiedi a un genitore');
    });

    it('excludes ask parent suggestion when suggestAskParent is false', () => {
      const display = formatExplanationForDisplay(baseExplanation);

      expect(display).not.toContain('👨‍👩‍👧');
    });

    it('handles explanation without related topics', () => {
      const explanationNoTopics: BlockExplanation = {
        filterType: 'personal_info_request',
        friendlyExplanation: 'Privacy message',
        suggestedAction: 'Protect your data',
        suggestAskParent: true,
        relatedAllowedTopics: undefined,
      };

      const display = formatExplanationForDisplay(explanationNoTopics);

      expect(display).toContain('Privacy message');
      expect(display).not.toContain('Puoi chiedermi invece di');
    });

    it('handles empty related topics array', () => {
      const explanationEmptyTopics: BlockExplanation = {
        ...baseExplanation,
        relatedAllowedTopics: [],
      };

      const display = formatExplanationForDisplay(explanationEmptyTopics);

      expect(display).not.toContain('Puoi chiedermi invece di');
    });
  });
});
