/**
 * MirrorBuddy PDF Processor Utilities
 */

import * as pdfjsLib from 'pdfjs-dist';
import { PDFProcessingError } from './pdf-types';

/**
 * Check if a file is a PDF
 */
export function isPDF(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Get PDF metadata without full processing
 */
export async function getPDFInfo(file: File): Promise<{ numPages: number; filename: string }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    return {
      numPages: pdf.numPages,
      filename: file.name,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('password')) {
      throw new PDFProcessingError(
        'Il PDF è protetto da password. Rimuovi la protezione e riprova.',
        'ENCRYPTED',
        error,
      );
    }
    throw new PDFProcessingError(
      'Impossibile leggere il PDF. Il file potrebbe essere danneggiato.',
      'LOAD_FAILED',
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Resize an image data URL to a thumbnail, preserving the aspect ratio.
 *
 * The height is derived from the decoded image rather than from the canvas
 * default (150px), which previously produced squashed thumbnails.
 */
export async function resizeImageToThumbnail(
  imageData: string,
  currentWidth: number,
  thumbnailWidth: number,
): Promise<string> {
  if (currentWidth <= thumbnailWidth) {
    return imageData;
  }

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Impossibile decodificare l'immagine della pagina."));
    img.src = imageData;
  });

  const sourceWidth = img.naturalWidth || currentWidth;
  const sourceHeight = img.naturalHeight;
  if (!sourceHeight || !sourceWidth) {
    return imageData;
  }

  const scale = thumbnailWidth / sourceWidth;
  const canvas = document.createElement('canvas');
  canvas.width = thumbnailWidth;
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return imageData;
  }

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}
