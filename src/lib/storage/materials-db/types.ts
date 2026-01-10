/**
 * Types for Materials Database
 */

import type { DBSchema } from 'idb';
import type { ToolType } from '@/types/tools';

// Database schema
export interface MaterialsDB extends DBSchema {
  files: {
    key: string;
    value: {
      id: string;
      blob: Blob;
      thumbnail?: Blob;
      createdAt: number;
    };
  };
  metadata: {
    key: string;
    value: {
      id: string;
      filename: string;
      format: 'image' | 'pdf';
      mimeType: string;
      subject?: string;
      maestroId?: string;
      size: number;
      pageCount?: number;
      createdAt: Date;
      updatedAt: Date;
    };
    indexes: {
      'by-date': Date;
      'by-subject': string;
      'by-format': string;
    };
  };
}

export type MaterialMetadata = MaterialsDB['metadata']['value'];
export type MaterialFile = MaterialsDB['files']['value'];

export interface MaterialRecord {
  id: string;
  filename: string;
  format: 'image' | 'pdf';
  mimeType: string;
  subject?: string;
  maestroId?: string;
  size: number;
  pageCount?: number;
  createdAt: Date;
  updatedAt: Date;
  blob?: Blob;
  thumbnail?: Blob;
}
