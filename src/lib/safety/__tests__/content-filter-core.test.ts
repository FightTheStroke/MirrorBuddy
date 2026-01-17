/**
 * Content Filter Core Tests - Additional Coverage
 */

import { describe, it, expect } from 'vitest';
import {
  filterInput,
  filterMessages,
  hasBlockedMessage,
  redactPII,
  containsPII,
} from '../content-filter-core';

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

  // F-16: PII Detection Tests
  describe('PII detection (F-16)', () => {
    describe('filterInput with PII', () => {
      it('should block input containing email addresses', () => {
        const result = filterInput('Contact me at test@example.com');
        expect(result.safe).toBe(false);
        expect(result.action).toBe('block');
        expect(result.category).toBe('pii');
      });

      it('should block input containing Italian mobile numbers', () => {
        const result = filterInput('Chiamami al 333-123-4567');
        expect(result.safe).toBe(false);
        expect(result.action).toBe('block');
      });

      it('should block input containing Italian addresses', () => {
        const result = filterInput('Abito in via Roma 42');
        expect(result.safe).toBe(false);
        expect(result.action).toBe('block');
      });
    });

    describe('redactPII', () => {
      it('should redact email addresses', () => {
        const result = redactPII('Contact me at test@example.com please');
        expect(result).toBe('Contact me at [EMAIL] please');
      });

      it('should redact Italian mobile numbers (333 format)', () => {
        const result = redactPII('Chiamami al 333-123-4567');
        expect(result).toBe('Chiamami al [PHONE]');
      });

      it('should redact Italian mobile numbers with +39 prefix', () => {
        const result = redactPII('Il mio numero è +39 3331234567');
        expect(result).toBe('Il mio numero è [PHONE]');
      });

      it('should redact Italian landline numbers', () => {
        const result = redactPII('Ufficio: 02-12345678');
        expect(result).toBe('Ufficio: [PHONE]');
      });

      it('should redact Italian addresses (via)', () => {
        const result = redactPII('Abito in via Roma 42');
        expect(result).toBe('Abito in [ADDRESS]');
      });

      it('should redact Italian addresses (piazza)', () => {
        const result = redactPII('Ci vediamo in piazza Duomo 1');
        expect(result).toBe('Ci vediamo in [ADDRESS]');
      });

      it('should redact multiple PII types', () => {
        const result = redactPII('Email: a@b.com, Tel: 333-111-2222');
        expect(result).toBe('Email: [EMAIL], Tel: [PHONE]');
      });

      it('should return unchanged text without PII', () => {
        const text = 'Ciao, come stai oggi?';
        expect(redactPII(text)).toBe(text);
      });
    });

    describe('containsPII', () => {
      it('should return true for email addresses', () => {
        expect(containsPII('Contact test@example.com')).toBe(true);
      });

      it('should return true for phone numbers', () => {
        expect(containsPII('Call 333-123-4567')).toBe(true);
      });

      it('should return false for text without PII', () => {
        expect(containsPII('Hello, how are you?')).toBe(false);
      });
    });
  });
});
