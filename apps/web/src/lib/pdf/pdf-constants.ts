/**
 * Maximum number of pages to process
 * Prevents overwhelming the Vision API with too many requests.
 * Kept free of pdfjs so server code can import it.
 */
export const MAX_PDF_PAGES = 5;
