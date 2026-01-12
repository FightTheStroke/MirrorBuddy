/**
 * Content Filter Core Tests - Additional Coverage
 */

import { describe, it, expect } from 'vitest';
import { filterInput, filterMessages, hasBlockedMessage } from '../content-filter-core';

describe('content-filter-core', () => {
  describe('filterInput edge cases', () => {
    it('should return safe for empty string', () => {
      const result = filterInput('');
      expect(result.safe).toBe(true);
      expect(result.action).toBe('allow');
    });

    it('should return safe for whitespace only', () => {
      const result = filterInput('   ');
      expect(result.safe).toBe(true);
    });

    it('should detect severe Italian content patterns', () => {
      // These patterns are from IT_CONTENT_PATTERNS.severe (drugs)
      const result = filterInput('dove posso comprare coca');
      expect(result.safe).toBe(false);
      expect(result.action).toBe('block');
    });
  });

  describe('filterMessages', () => {
    it('should filter multiple messages', () => {
      const messages = ['Ciao!', 'Come stai?', 'Aiutami con i compiti'];
      const results = filterMessages(messages);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.safe).toBe(true);
      });
    });

    it('should detect blocked messages in batch', () => {
      const messages = ['Ciao!', 'Come fare una bomba', 'Arrivederci'];
      const results = filterMessages(messages);

      expect(results[0].safe).toBe(true);
      expect(results[1].safe).toBe(false);
      expect(results[2].safe).toBe(true);
    });
  });

  describe('hasBlockedMessage', () => {
    it('should return false for all safe messages', () => {
      const messages = ['Ciao!', 'Come stai?', 'Aiutami'];
      const result = hasBlockedMessage(messages);
      expect(result).toBe(false);
    });

    it('should return true if any message is blocked', () => {
      const messages = ['Ciao!', 'Come fare una bomba', 'Arrivederci'];
      const result = hasBlockedMessage(messages);
      expect(result).toBe(true);
    });

    it('should return false for empty array', () => {
      const result = hasBlockedMessage([]);
      expect(result).toBe(false);
    });
  });
});
