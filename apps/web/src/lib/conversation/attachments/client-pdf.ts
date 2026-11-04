import type { AttachmentMimeType } from './types';
import { AttachmentReadError, type PdfLoader, type PdfSource } from './client-reader';

interface PdfJsTextItem {
  str?: string;
}

const RENDER_SCALE = 1.5;
const JPEG_QUALITY = 0.8;

function isPasswordError(error: unknown): boolean {
  return error instanceof Error && error.name === 'PasswordException';
}

/** Self-hosted worker (same origin, CSP-safe); eval disabled; no CDN. */
export const loadPdfWithPdfJs: PdfLoader = async (data) => {
  const [pdfjs, processor, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('@/lib/pdf/pdf-processor'),
    import('@/lib/pdf/pdf-worker'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.PDF_WORKER_SRC;

  // Variable, not literal: older pdf.js typings lack the flag, newer builds ignore it.
  const params = { data, isEvalSupported: false };
  const task = pdfjs.getDocument(params);
  let document;
  try {
    document = await task.promise;
  } catch (error) {
    throw new AttachmentReadError(isPasswordError(error) ? 'encrypted' : 'unreadable');
  }

  const source: PdfSource = {
    numPages: document.numPages,
    maxPages: processor.MAX_PDF_PAGES,
    destroy: () => void task.destroy(),
    page: async (pageNumber) => {
      const page = await document.getPage(pageNumber);
      return {
        getText: async () => {
          const content = await page.getTextContent();
          return (content.items as PdfJsTextItem[])
            .map((item) => item.str ?? '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        },
        renderJpeg: async () => {
          const viewport = page.getViewport({ scale: RENDER_SCALE });
          const canvas = window.document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext('2d');
          if (!context) throw new AttachmentReadError('unreadable');
          await page.render({ canvasContext: context, canvas, viewport }).promise;
          return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        },
      };
    },
  };
  return source;
};

const MAX_IMAGE_EDGE = 1600;

export async function imageFileToDataUrl(
  file: File,
  mimeType: AttachmentMimeType,
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new AttachmentReadError('unreadable'));
      element.src = objectUrl;
    });
    const ratio = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new AttachmentReadError('unreadable');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(mimeType === 'image/png' ? 'image/png' : 'image/jpeg', JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
