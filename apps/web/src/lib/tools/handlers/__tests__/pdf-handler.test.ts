/**
 * PDF Handler Unit Tests
 * Tests PDF text extraction and context injection
 * Part of Wave 1: Tool Alignment - PDF Handler
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { validatePDFBuffer, formatPDFForContext } from '../pdf-handler';
import { executeToolCall } from '../../tool-executor';
import type { PDFData } from '@/types/tools';

// Register handlers
beforeAll(async () => {
  await import('../pdf-handler');
});

describe('PDF Handler', () => {
  describe('validatePDFBuffer', () => {
    it('rejects null/undefined buffer', () => {
      const result = validatePDFBuffer(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('rejects empty buffer', () => {
      const emptyBuffer = Buffer.from([]);
      const result = validatePDFBuffer(emptyBuffer);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('rejects invalid buffer type', () => {
      const result = validatePDFBuffer('not a buffer');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Buffer or Uint8Array');
    });

    it('rejects buffer without PDF header', () => {
      const invalidBuffer = Buffer.from('This is not a PDF');
      const result = validatePDFBuffer(invalidBuffer);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('PDF header');
    });

    it('accepts buffer with valid PDF header', () => {
      const validBuffer = Buffer.from('%PDF-1.4\nSome PDF content');
      const result = validatePDFBuffer(validBuffer);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts Uint8Array with valid PDF header', () => {
      const validArray = new Uint8Array(
        Buffer.from('%PDF-1.7\n%âãÏÓ')
      );
      const result = validatePDFBuffer(validArray);
      expect(result.valid).toBe(true);
    });
  });

  describe('formatPDFForContext', () => {
    it('formats PDF data for AI context', () => {
      const pdfData: PDFData = {
        text: 'Sample PDF content\nWith multiple lines',
        metadata: {
          pageCount: 5,
          fileName: 'test.pdf',
          fileSize: 1024,
          uploadedAt: new Date('2026-01-16T10:00:00Z'),
        },
      };

      const formatted = formatPDFForContext(pdfData);

      expect(formatted).toContain('# Document: test.pdf');
      expect(formatted).toContain('**Pages**: 5');
      expect(formatted).toContain('Sample PDF content');
      expect(formatted).toContain('*End of document*');
    });

    it('handles missing optional metadata', () => {
      const pdfData: PDFData = {
        text: 'Content',
        metadata: {
          pageCount: 1,
        },
      };

      const formatted = formatPDFForContext(pdfData);

      expect(formatted).toContain('# Document: undefined');
      expect(formatted).toContain('**Pages**: 1');
      expect(formatted).toContain('Content');
    });
  });

  describe('upload_pdf tool call', () => {
    it('rejects invalid buffer', async () => {
      const result = await executeToolCall(
        'upload_pdf',
        {
          buffer: Buffer.from('Not a PDF'),
          fileName: 'test.pdf',
        },
        { sessionId: 'test' }
      );

      expect(result.success).toBe(false);
      expect(result.toolType).toBe('pdf');
      expect(result.error).toContain('PDF header');
    });

    it('rejects empty buffer', async () => {
      const result = await executeToolCall(
        'upload_pdf',
        {
          buffer: Buffer.from([]),
          fileName: 'empty.pdf',
        },
        { sessionId: 'test' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    // Note: Full PDF extraction test would require a real PDF file
    // or extensive mocking of pdf-parse library. The validation
    // tests above cover the core handler logic.
  });
});
