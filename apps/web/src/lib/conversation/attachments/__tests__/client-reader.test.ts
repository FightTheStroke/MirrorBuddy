import { describe, it, expect, vi } from 'vitest';
import {
  readAttachment,
  AttachmentReadError,
  MAX_ATTACHMENT_BYTES,
  type PdfLoader,
  type PdfSource,
} from '../client-reader';

function file(name: string, type: string, size = 10): File {
  return new File([new Uint8Array(size)], name, { type });
}

function pdfSource(texts: string[], maxPages = 5): PdfSource {
  return {
    numPages: texts.length,
    maxPages,
    destroy: vi.fn(),
    page: async (n) => ({
      getText: async () => texts[n - 1],
      renderJpeg: async () => `data:image/jpeg;base64,page${n}`,
    }),
  };
}

const loader =
  (source: PdfSource): PdfLoader =>
  async () =>
    source;

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return (error as AttachmentReadError).code;
  }
  return 'resolved';
}

describe('readAttachment', () => {
  it('rejects unsupported types and oversize files before reading', async () => {
    expect(await codeOf(readAttachment(file('a.txt', 'text/plain')))).toBe('unsupported');
    const big = file('a.pdf', 'application/pdf', MAX_ATTACHMENT_BYTES + 1);
    expect(await codeOf(readAttachment(big))).toBe('too_large');
  });

  it('extracts readable PDF text without calling OCR', async () => {
    const analyze = vi.fn();
    const result = await readAttachment(file('a.pdf', 'application/pdf'), {
      loadPdf: loader(pdfSource(['Roma fu fondata', 'Seconda pagina'])),
      analyze,
    });
    expect(analyze).not.toHaveBeenCalled();
    expect(result.upload.pages).toEqual([
      { pageNumber: 1, text: 'Roma fu fondata' },
      { pageNumber: 2, text: 'Seconda pagina' },
    ]);
    expect(result.skippedPages).toEqual([]);
  });

  it('OCRs textless pages and reports pages that stay unreadable', async () => {
    const analyze = vi.fn(async (_image: string, page: number) => (page === 2 ? 'scanned' : ''));
    const result = await readAttachment(file('a.pdf', 'application/pdf'), {
      loadPdf: loader(pdfSource(['text', '', ''])),
      analyze,
    });
    expect(result.upload.pages.map((p) => p.text)).toEqual(['text', 'scanned']);
    expect(analyze).toHaveBeenNthCalledWith(1, 'data:image/jpeg;base64,page2', 2, undefined, 'pdf');
    expect(result.skippedPages).toEqual([3]);
    expect(result.totalPages).toBe(3);
  });

  it('fails instead of truncating when the PDF has too many pages', async () => {
    const source = pdfSource(['a', 'b', 'c'], 2);
    expect(
      await codeOf(readAttachment(file('a.pdf', 'application/pdf'), { loadPdf: loader(source) })),
    ).toBe('too_many_pages');
    expect(source.destroy).toHaveBeenCalled();
  });

  it('fails with no_text when nothing is readable, and surfaces OCR errors', async () => {
    const empty = loader(pdfSource(['']));
    const pdf = file('a.pdf', 'application/pdf');
    expect(await codeOf(readAttachment(pdf, { loadPdf: empty, analyze: async () => '' }))).toBe(
      'no_text',
    );
    const failing = vi.fn().mockRejectedValue(new Error('boom'));
    expect(await codeOf(readAttachment(pdf, { loadPdf: empty, analyze: failing }))).toBe(
      'ocr_failed',
    );
  });

  it('propagates encrypted PDFs from the loader', async () => {
    const encrypted: PdfLoader = async () => {
      throw new AttachmentReadError('encrypted');
    };
    expect(
      await codeOf(readAttachment(file('a.pdf', 'application/pdf'), { loadPdf: encrypted })),
    ).toBe('encrypted');
  });

  it('stops when cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    expect(
      await codeOf(readAttachment(file('a.pdf', 'application/pdf'), { signal: controller.signal })),
    ).toBe('cancelled');
  });

  it('OCRs images into one page', async () => {
    const analyze = vi.fn(async () => 'testo foto');
    const result = await readAttachment(file('p.png', 'image/png'), {
      imageToDataUrl: async () => 'data:image/png;base64,xx',
      analyze,
    });
    expect(analyze).toHaveBeenCalledWith('data:image/png;base64,xx', 1, undefined, 'image');
    expect(result.upload).toMatchObject({
      mimeType: 'image/png',
      pages: [{ pageNumber: 1, text: 'testo foto' }],
    });
  });
});
