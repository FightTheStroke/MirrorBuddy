/**
 * Local Provider Types
 * Type definitions for local filesystem storage
 *
 * Related: ADR-0001, #22 Storage Architecture
 */

/**
 * Metadata file stored alongside each uploaded file
 */
export interface FileMetadata {
  id: string;
  path: string;
  filename: string;
  mimeType: string;
  size: number;
  type: string;
  userId: string;
  checksum?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}
