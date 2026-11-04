export const CONVERSATION_ATTACHMENT_TOOL_TYPE = 'conversation_attachment';

export interface AttachmentPage {
  pageNumber: number;
  text: string;
}

export type AttachmentMimeType = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';

export interface AttachmentDocument {
  id: string;
  name: string;
  mimeType: AttachmentMimeType;
  size: number;
  pages: AttachmentPage[];
}

export type AttachmentUpload = Omit<AttachmentDocument, 'id'>;
