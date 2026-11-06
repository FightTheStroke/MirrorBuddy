import { MAX_PDF_PAGES } from '@/lib/pdf/pdf-constants';

/** Chat attachments are capped below general material storage so a student's file stays quick to read. */
export const MAX_ATTACHMENT_MB = 5;
export const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_MB * 1024 * 1024;
export const MAX_ATTACHMENT_PAGES = MAX_PDF_PAGES;

/** Values for every attachment message that states a limit, so the UI and the checks never disagree. */
export const ATTACHMENT_LIMIT_PARAMS = { pages: MAX_ATTACHMENT_PAGES, mb: MAX_ATTACHMENT_MB };
