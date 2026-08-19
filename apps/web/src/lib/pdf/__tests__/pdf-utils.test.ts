/**
 * @vitest-environment jsdom
 *
 * Unit tests for the PDF helpers.
 *
 * `resizeImageToThumbnail` previously derived the thumbnail height from the
 * canvas default (150px) instead of the source image, so every thumbnail came
 * out squashed. The aspect-ratio test below fails against that old code.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getDocument = vi.fn();
vi.mock('pdfjs-dist', () => ({
  getDocument: (...args: unknown[]) => getDocument(...args),
}));

import { isPDF, getPDFInfo, resizeImageToThumbnail } from '../pdf-utils';
import { PDFProcessingError } from '../pdf-types';

function fileNamed(name: string, type: string): File {
  const file = new File(['x'], name, { type });
  // jsdom's File does not implement arrayBuffer().
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => new ArrayBuffer(8),
  });
  return file;
}

describe('isPDF', () => {
  it('accepts a PDF by mime type', () => {
    expect(isPDF(fileNamed('homework', 'application/pdf'))).toBe(true);
  });

  it('accepts a PDF by extension when the mime type is missing', () => {
    expect(isPDF(fileNamed('HOMEWORK.PDF', ''))).toBe(true);
  });

  it('rejects an image', () => {
    expect(isPDF(fileNamed('photo.png', 'image/png'))).toBe(false);
  });
});

describe('getPDFInfo', () => {
  beforeEach(() => {
    getDocument.mockReset();
  });

  it('reports the page count and filename', async () => {
    getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 7 }) });

    await expect(getPDFInfo(fileNamed('essay.pdf', 'application/pdf'))).resolves.toEqual({
      numPages: 7,
      filename: 'essay.pdf',
    });
  });

  it('reports an encrypted PDF distinctly, so the student can act on it', async () => {
    getDocument.mockImplementation(() => ({
      promise: Promise.reject(new Error('No password given')),
    }));

    await expect(getPDFInfo(fileNamed('locked.pdf', 'application/pdf'))).rejects.toMatchObject({
      code: 'ENCRYPTED',
    });
  });

  it('wraps any other failure as a load error', async () => {
    getDocument.mockImplementation(() => ({
      promise: Promise.reject(new Error('boom')),
    }));

    const error = await getPDFInfo(fileNamed('broken.pdf', 'application/pdf')).catch((e) => e);
    expect(error).toBeInstanceOf(PDFProcessingError);
    expect(error.code).toBe('LOAD_FAILED');
  });
});

describe('resizeImageToThumbnail', () => {
  const SOURCE = 'data:image/jpeg;base64,AAAA';

  it('returns the original when it is already small enough', async () => {
    await expect(resizeImageToThumbnail(SOURCE, 120, 200)).resolves.toBe(SOURCE);
  });

  it('preserves the aspect ratio of the source page', async () => {
    // A4-shaped page: 800x1131. Scaled to 200 wide, the height must follow.
    stubImage({ naturalWidth: 800, naturalHeight: 1131 });
    const canvas = stubCanvas();

    await resizeImageToThumbnail(SOURCE, 800, 200);

    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(283); // round(1131 * 200 / 800)
  });

  it('gives up gracefully when the image cannot be decoded', async () => {
    stubImage({ naturalWidth: 800, naturalHeight: 1131 }, { fail: true });

    await expect(resizeImageToThumbnail(SOURCE, 800, 200)).rejects.toThrow();
  });
});

function stubImage(
  dimensions: { naturalWidth: number; naturalHeight: number },
  options: { fail?: boolean } = {},
) {
  class StubImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = dimensions.naturalWidth;
    naturalHeight = dimensions.naturalHeight;

    set src(_value: string) {
      queueMicrotask(() => (options.fail ? this.onerror?.() : this.onload?.()));
    }
  }

  vi.stubGlobal('Image', StubImage);
}

function stubCanvas() {
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: vi.fn() }),
    toDataURL: () => 'data:image/jpeg;base64,BBBB',
  };

  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) =>
    tag === 'canvas' ? canvas : document.createElement(tag)) as never);

  return canvas;
}
