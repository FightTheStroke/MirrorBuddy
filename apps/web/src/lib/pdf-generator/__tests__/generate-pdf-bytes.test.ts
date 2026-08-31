/**
 * Tests that the PDF generator emits real, valid PDF bytes with selectable text.
 * These guard the accessibility promise: students run text-to-speech on the export,
 * so the output must be a genuine text PDF (not a rasterised image).
 * @module pdf-generator/generate
 */

import { describe, it, expect } from 'vitest';
import { generatePDFFromContent } from '../generate';
import type { ExtractedContent } from '../types';

const sampleContent: ExtractedContent = {
  title: 'Fotosintesi Clorofilliana',
  subject: 'Scienze',
  sections: [
    { type: 'heading', content: 'Riassunto', level: 2 },
    {
      type: 'paragraph',
      content: 'Le piante trasformano la luce solare in energia chimica.',
    },
    {
      type: 'list',
      content: '',
      items: ['Luce solare', 'Anidride carbonica', 'Acqua'],
    },
  ],
  images: [],
  metadata: {
    wordCount: 9,
    readingTime: 1,
    generatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
    sourceKitId: 'kit-test',
  },
};

describe('generatePDFFromContent — real PDF bytes', () => {
  it('produces a buffer whose header is the %PDF- magic number', async () => {
    const { buffer, size, filename } = await generatePDFFromContent(
      sampleContent,
      'dyslexia',
      'A4',
    );

    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(size).toBe(buffer.byteLength);
    expect(size).toBeGreaterThan(1000);
    expect(filename).toMatch(/\.pdf$/);
  });

  it('embeds the document title as selectable text in the PDF metadata', async () => {
    const { buffer } = await generatePDFFromContent(sampleContent, 'dyslexia', 'A4');
    const raw = buffer.toString('latin1');

    expect(raw).toContain('Fotosintesi');
  });

  it('renders text with a sans-serif font rather than a rasterised image', async () => {
    const { buffer } = await generatePDFFromContent(sampleContent, 'adhd', 'A4');
    const raw = buffer.toString('latin1');

    expect(raw).toContain('/Font');
    expect(raw).toContain('Helvetica');
  });
});
