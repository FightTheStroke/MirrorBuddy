import { analyzeAttachmentImage } from './client-api';
import type { AttachmentMimeType, AttachmentPage, AttachmentUpload } from './types';
import { MAX_ATTACHMENT_BYTES } from './limits';

export { MAX_ATTACHMENT_BYTES };
export const ATTACHMENT_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';

export type AttachmentReadErrorCode =
  | 'unsupported'
  | 'encrypted'
  | 'unreadable'
  | 'too_large'
  | 'too_many_pages'
  | 'no_text'
  | 'ocr_failed'
  | 'ocr_needs_account'
  | 'ocr_limit'
  | 'attachment_tool_not_allowed'
  | 'cancelled';

export class AttachmentReadError extends Error {
  constructor(public readonly code: AttachmentReadErrorCode) {
    super(code);
    this.name = 'AttachmentReadError';
  }
}

export interface PdfPageSource {
  getText(): Promise<string>;
  renderJpeg(): Promise<string>;
}

export interface PdfSource {
  numPages: number;
  maxPages: number;
  page(pageNumber: number): Promise<PdfPageSource>;
  destroy(): void;
}

export type PdfLoader = (data: ArrayBuffer) => Promise<PdfSource>;

export interface ReadOptions {
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
  analyze?: (
    image: string,
    pageNumber: number,
    signal?: AbortSignal,
    source?: 'pdf' | 'image',
  ) => Promise<string>;
  loadPdf?: PdfLoader;
  imageToDataUrl?: (file: File, mimeType: AttachmentMimeType) => Promise<string>;
}

export interface ReadResult {
  upload: AttachmentUpload;
  totalPages: number;
  /** Pages with no readable text even after OCR: coverage is partial. */
  skippedPages: number[];
}

const SUPPORTED: Record<string, AttachmentMimeType> = {
  'application/pdf': 'application/pdf',
  'image/jpeg': 'image/jpeg',
  'image/png': 'image/png',
  'image/webp': 'image/webp',
};

export function detectMimeType(file: File): AttachmentMimeType | null {
  return SUPPORTED[file.type] ?? null;
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new AttachmentReadError('cancelled');
}

async function ocr(
  image: string,
  pageNumber: number,
  options: ReadOptions,
  source: 'pdf' | 'image',
): Promise<string> {
  const analyze = options.analyze ?? analyzeAttachmentImage;
  try {
    return (await analyze(image, pageNumber, options.signal, source)).trim();
  } catch (error) {
    throwIfCancelled(options.signal);
    if (error instanceof AttachmentReadError) throw error;
    throw new AttachmentReadError(ocrRefusal(error));
  }
}

const ACCOUNT_REQUIRED = new Set([
  'trial_consent_required',
  'trial_session_required',
  'trial_verification_required',
]);

/** A refusal the student can act on must not look like a temporary failure worth retrying. */
function ocrRefusal(error: unknown): AttachmentReadErrorCode {
  const { status, code } = (error ?? {}) as { status?: unknown; code?: unknown };
  if (typeof code === 'string' && ACCOUNT_REQUIRED.has(code)) return 'ocr_needs_account';
  if (code === 'attachment_tool_not_allowed') return 'attachment_tool_not_allowed';
  if (status === 429) return 'ocr_limit';
  return 'ocr_failed';
}

async function readPdf(file: File, options: ReadOptions): Promise<ReadResult> {
  const loadPdf = options.loadPdf ?? (await import('./client-pdf')).loadPdfWithPdfJs;
  const source = await loadPdf(await file.arrayBuffer());
  try {
    if (source.numPages > source.maxPages) throw new AttachmentReadError('too_many_pages');
    const pages: AttachmentPage[] = [];
    const skippedPages: number[] = [];
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      throwIfCancelled(options.signal);
      const page = await source.page(pageNumber);
      let text = await page.getText();
      if (!text) text = await ocr(await page.renderJpeg(), pageNumber, options, 'pdf');
      if (text) pages.push({ pageNumber, text });
      else skippedPages.push(pageNumber);
      options.onProgress?.(pageNumber, source.numPages);
    }
    if (pages.length === 0) throw new AttachmentReadError('no_text');
    return {
      upload: { name: file.name, mimeType: 'application/pdf', size: file.size, pages },
      totalPages: source.numPages,
      skippedPages,
    };
  } finally {
    source.destroy();
  }
}

async function readImage(
  file: File,
  mimeType: AttachmentMimeType,
  options: ReadOptions,
): Promise<ReadResult> {
  const toDataUrl = options.imageToDataUrl ?? (await import('./client-pdf')).imageFileToDataUrl;
  const text = await ocr(await toDataUrl(file, mimeType), 1, options, 'image');
  options.onProgress?.(1, 1);
  if (!text) throw new AttachmentReadError('no_text');
  return {
    upload: { name: file.name, mimeType, size: file.size, pages: [{ pageNumber: 1, text }] },
    totalPages: 1,
    skippedPages: [],
  };
}

/** Validates, extracts text on the device and OCRs textless pages. Never returns partial success silently. */
export async function readAttachment(file: File, options: ReadOptions = {}): Promise<ReadResult> {
  const mimeType = detectMimeType(file);
  if (!mimeType) throw new AttachmentReadError('unsupported');
  if (file.size > MAX_ATTACHMENT_BYTES) throw new AttachmentReadError('too_large');
  throwIfCancelled(options.signal);
  return mimeType === 'application/pdf'
    ? readPdf(file, options)
    : readImage(file, mimeType, options);
}
