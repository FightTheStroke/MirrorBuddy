import { z } from 'zod';
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENT_PAGES } from './limits';

export { MAX_ATTACHMENT_PAGES };
export const MAX_ATTACHMENT_NAME_LENGTH = 120;
export const MAX_ATTACHMENT_PAGE_TEXT_LENGTH = 50_000;
export { MAX_ATTACHMENT_BYTES as MAX_ATTACHMENT_SIZE };

export const ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

const UNSAFE_NAME = /[\u0000-\u001f\u007f/\\]/;

const pageSchema = z
  .object({
    pageNumber: z.number().int().min(1).max(10_000),
    text: z.string().trim().min(1).max(MAX_ATTACHMENT_PAGE_TEXT_LENGTH),
  })
  .strict();

const pagesSchema = z
  .array(pageSchema)
  .min(1)
  .max(MAX_ATTACHMENT_PAGES)
  .refine(
    (pages) => pages.every((p, i) => i === 0 || p.pageNumber > pages[i - 1].pageNumber),
    'pages must be unique and ordered',
  );

export const attachmentUploadSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(MAX_ATTACHMENT_NAME_LENGTH)
      .refine((n) => !UNSAFE_NAME.test(n), 'unsafe name'),
    mimeType: z.enum(ATTACHMENT_MIME_TYPES),
    size: z.number().int().min(1).max(MAX_ATTACHMENT_BYTES),
    pages: pagesSchema,
  })
  .strict();

export const ephemeralAttachmentSchema = attachmentUploadSchema.extend({
  id: z.string().min(1).max(128),
});

export type ParsedAttachmentUpload = z.infer<typeof attachmentUploadSchema>;
