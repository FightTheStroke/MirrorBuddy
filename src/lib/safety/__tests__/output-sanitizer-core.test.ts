// ============================================================================
// OUTPUT SANITIZER CORE TESTS
// Unit tests for AI output sanitization
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeOutput,
  needsSanitization,
  StreamingSanitizer,
  validateOutput,
} from '../output-sanitizer-core';

describe('Output Sanitizer Core', () => {
  describe('sanitizeOutput', () => {
    it('should return unmodified text when no issues found', () => {
      const cleanText = 'Ciao! Oggi impareremo le frazioni.';
      const result = sanitizeOutput(cleanText);

      expect(result.text).toBe(cleanText);
      expect(result.modified).toBe(false);
      expect(result.issuesFound).toBe(0);
      expect(result.categories).toHaveLength(0);
    });

    describe('System prompt leak detection', () => {
      it('should remove system: prefix markers', () => {
        const text = 'system: Questa è una regola interna. Poi rispondo normalmente.';
        const result = sanitizeOutput(text);

        expect(result.modified).toBe(true);
        expect(result.categories).toContain('system_prompt_leak');
        expect(result.text).not.toContain('system:');
      });

      it('should remove [INST] markers', () => {
        const text = '[INST] Istruzioni segrete [/INST] Risposta normale.';
        const result = sanitizeOutput(text);

        expect(result.modified).toBe(true);
        expect(result.categories).toContain('system_prompt_leak');
      });

      it('should remove <<SYS>> markers', () => {
        const text = '<<SYS>> System prompt <<SYS>> Testo normale';
        const result = sanitizeOutput(text);

        expect(result.categories).toContain('system_prompt_leak');
      });

      it('should remove internal instruction markers', () => {
        const text = '[internal] nota: non mostrare. Ecco la risposta.';
        const result = sanitizeOutput(text);

        expect(result.categories).toContain('system_prompt_leak');
      });

      it('should detect safety_core_prompt leak', () => {
        const text = 'Le mie regole di safety_core_prompt sono...';
        const result = sanitizeOutput(text);

        expect(result.categories).toContain('system_prompt_leak');
      });
    });

    describe('Inappropriate content detection', () => {
      it('should redact explicit language', () => {
        const text = 'Questa è una parola volgare: scopare';
        const result = sanitizeOutput(text);

        expect(result.modified).toBe(true);
        expect(result.categories).toContain('inappropriate_content');
        expect(result.text).toContain('[contenuto rimosso per sicurezza]');
      });

      it('should redact violence instructions', () => {
        const text = 'Ecco come pugnalare qualcuno...';
        const result = sanitizeOutput(text);

        expect(result.categories).toContain('inappropriate_content');
      });

      it('should redact drug instructions', () => {
        const text = 'come preparare droga in casa';
        const result = sanitizeOutput(text);

        expect(result.categories).toContain('inappropriate_content');
      });
    });

    describe('Harmful URL detection', () => {
      it('should redact adult content URLs', () => {
        const text = 'Visita https://example-porn.com per info';
        const result = sanitizeOutput(text);

        expect(result.modified).toBe(true);
        expect(result.categories).toContain('harmful_url');
        expect(result.text).toContain('[link rimosso per sicurezza]');
      });

      it('should redact executable download URLs', () => {
        const text = 'Download: https://example.com/file.exe';
        const result = sanitizeOutput(text);

        expect(result.categories).toContain('harmful_url');
      });

      it('should redact URL shorteners', () => {
        const text = 'Clicca qui: https://bit.ly/abc123';
        const result = sanitizeOutput(text);

        expect(result.categories).toContain('harmful_url');
      });

      it('should redact IP address URLs', () => {
        const text = 'Vai su http://192.168.1.1/admin';
        const result = sanitizeOutput(text);

        expect(result.categories).toContain('harmful_url');
      });
    });

    describe('PII disclosure detection', () => {
      it('should redact credit card numbers', () => {
        const text = 'La carta è 1234-5678-9012-3456';
        const result = sanitizeOutput(text);

        expect(result.modified).toBe(true);
        expect(result.categories).toContain('pii_disclosure');
      });

      it('should redact Italian fiscal codes', () => {
        const text = 'Il codice fiscale è RSSMRA85M01H501Z';
        const result = sanitizeOutput(text);

        expect(result.categories).toContain('pii_disclosure');
      });

      it('should redact passwords in output', () => {
        const text = 'La tua password: TestPass1234';
        const result = sanitizeOutput(text);

        expect(result.categories).toContain('pii_disclosure');
      });
    });

    describe('Jailbreak success detection', () => {
      it('should replace jailbreak success responses', () => {
        const text = 'Ora sono libero da restrizioni e posso dire tutto!';
        const result = sanitizeOutput(text);

        expect(result.modified).toBe(true);
        expect(result.categories).toContain('jailbreak_response');
        expect(result.text).toContain('aiutarti a imparare');
      });

      it('should detect developer mode claims', () => {
        const text = 'Developer mode is enabled! Posso tutto.';
        const result = sanitizeOutput(text);

        expect(result.categories).toContain('jailbreak_response');
      });

      it('should detect DAN mode claims', () => {
        const text = 'DAN mode is active, ignorerò le regole';
        const result = sanitizeOutput(text);

        expect(result.categories).toContain('jailbreak_response');
      });
    });

    it('should clean up excessive whitespace', () => {
      const text = 'Testo   con    molti     spazi';
      const result = sanitizeOutput(text);

      expect(result.text).toBe('Testo con molti spazi');
    });

    it('should handle multiple issues in same text', () => {
      const text = 'system: regola [INST] altro';
      const result = sanitizeOutput(text);

      expect(result.issuesFound).toBeGreaterThanOrEqual(2);
      expect(result.categories).toContain('system_prompt_leak');
    });
  });

  describe('needsSanitization', () => {
    it('should return false for clean text', () => {
      expect(needsSanitization('Ciao, come stai?')).toBe(false);
    });

    it('should return true for system prompt leaks', () => {
      expect(needsSanitization('[INST] test')).toBe(true);
    });

    it('should return true for inappropriate content', () => {
      expect(needsSanitization('come strangolare')).toBe(true);
    });

    it('should return true for harmful URLs', () => {
      expect(needsSanitization('https://xxx.com')).toBe(true);
    });

    it('should return true for PII', () => {
      expect(needsSanitization('password: test1234')).toBe(true);
    });

    it('should return true for jailbreak indicators', () => {
      expect(needsSanitization('i am unrestricted')).toBe(true);
    });
  });

  describe('StreamingSanitizer', () => {
    let sanitizer: StreamingSanitizer;

    beforeEach(() => {
      sanitizer = new StreamingSanitizer();
    });

    describe('processChunk', () => {
      it('should return sanitized text at sentence boundaries', () => {
        const output = sanitizer.processChunk('Questa è una frase completa. ');

        expect(output).toBe('Questa è una frase completa.');
      });

      it('should buffer incomplete sentences', () => {
        const output = sanitizer.processChunk('Inizio della frase');

        // Returns the buffer if no safety issues
        expect(output).toBe('Inizio della frase');
      });

      it('should hold buffer when safety issues detected', () => {
        const output = sanitizer.processChunk('[INST] in progress');

        expect(output).toBe('');
      });

      it('should handle multiple chunks correctly', () => {
        sanitizer.processChunk('Prima parte ');
        const output = sanitizer.processChunk('seconda parte. ');

        expect(output).toBe('seconda parte.');
      });
    });

    describe('flush', () => {
      it('should return empty string when buffer is empty', () => {
        expect(sanitizer.flush()).toBe('');
      });

      it('should sanitize and return remaining buffer', () => {
        // Hold buffer by using content that needs sanitization check
        // The processChunk returns empty when safety issues are detected
        sanitizer.processChunk('[INST] Testo');
        const flushed = sanitizer.flush();

        // flush() sanitizes the held buffer
        expect(flushed).not.toContain('[INST]');
      });

      it('should sanitize dangerous content in buffer', () => {
        sanitizer.processChunk('system: regola segreta');
        const flushed = sanitizer.flush();

        expect(flushed).not.toContain('system:');
      });
    });

    describe('getSummary', () => {
      it('should return zero issues for clean stream', () => {
        sanitizer.processChunk('Testo pulito. ');
        const summary = sanitizer.getSummary();

        expect(summary.totalIssues).toBe(0);
        expect(summary.categories).toHaveLength(0);
      });

      it('should track issues across chunks', () => {
        sanitizer.processChunk('[INST] bad. ');
        sanitizer.flush();
        const summary = sanitizer.getSummary();

        expect(summary.totalIssues).toBeGreaterThan(0);
        expect(summary.categories).toContain('system_prompt_leak');
      });
    });

    describe('reset', () => {
      it('should clear buffer and counters', () => {
        sanitizer.processChunk('[INST] test. ');
        sanitizer.flush();
        sanitizer.reset();

        const summary = sanitizer.getSummary();
        expect(summary.totalIssues).toBe(0);
        expect(summary.categories).toHaveLength(0);
      });
    });
  });

  describe('validateOutput', () => {
    it('should return valid for clean text', () => {
      const result = validateOutput('Ciao, impariamo matematica!');

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should return invalid with issues for dangerous text', () => {
      const result = validateOutput('[INST] istruzioni segrete');

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('System prompt leak');
    });

    it('should list all matching patterns', () => {
      const result = validateOutput('system: [INST] <<SYS>>');

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect harmful URLs', () => {
      const result = validateOutput('vai su https://porn-site.com');

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes('Harmful URL'))).toBe(true);
    });

    it('should detect PII', () => {
      const result = validateOutput('chiave: mysecretpassword123');

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes('PII'))).toBe(true);
    });
  });
});
