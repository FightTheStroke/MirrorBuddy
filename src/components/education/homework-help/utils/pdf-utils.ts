/**
 * @file pdf-utils.ts
 * @brief PDF processing utilities
 */

import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export const MAX_PDF_PAGES = 5;

export async function renderPdfPage(
  pdfDoc: pdfjs.PDFDocumentProxy,
  pageNum: number
): Promise<string> {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2.0 });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: context,
    viewport,
    canvas,
  } as Parameters<typeof page.render>[0]).promise;
  return canvas.toDataURL('image/png');
}

export async function processPdfFile(
  file: File
): Promise<{
  pages: string[];
  totalPages: number;
  error: string | null;
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    let pdf: pdfjs.PDFDocumentProxy;
    try {
      pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    } catch (pdfLoadError) {
      const errorMsg =
        pdfLoadError instanceof Error
          ? pdfLoadError.message
          : 'Errore sconosciuto';
      if (errorMsg.includes('password') || errorMsg.includes('encrypted')) {
        return {
          pages: [],
          totalPages: 0,
          error:
            'Questo PDF è protetto da password. Rimuovi la protezione e riprova.',
        };
      } else {
        return {
          pages: [],
          totalPages: 0,
          error:
            'Impossibile leggere il PDF. Il file potrebbe essere corrotto.',
        };
      }
    }

    const totalPages = pdf.numPages;
    const pagesToRender = Math.min(totalPages, MAX_PDF_PAGES);

    const pageImages: string[] = [];
    for (let i = 1; i <= pagesToRender; i++) {
      const imageData = await renderPdfPage(pdf, i);
      pageImages.push(imageData);
    }

    let error: string | null = null;
    if (totalPages > MAX_PDF_PAGES) {
      error = `Il PDF ha ${totalPages} pagine. Verranno caricate solo le prime ${MAX_PDF_PAGES}.`;
    }

    return {
      pages: pageImages,
      totalPages: pagesToRender,
      error,
    };
  } catch (error) {
    console.error('PDF processing error:', error);
    return {
      pages: [],
      totalPages: 0,
      error: 'Errore durante l\'elaborazione del PDF. Riprova.',
    };
  }
}

