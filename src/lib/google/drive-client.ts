/**
 * Google Drive API Client
 * ADR 0038 - Google Drive Integration
 *
 * Server-side client for Google Drive v3 API.
 * Handles file listing, search, and download.
 */

import { logger } from '@/lib/logger';
import { getValidAccessToken } from './oauth';
import { ALL_SUPPORTED_MIME_TYPES } from './config';
import type {
  DriveFile,
  DriveListResponse,
  DriveListParams,
  DriveDownloadResult,
} from './drive-types';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

/**
 * Validate that a Google Drive file ID is well-formed.
 * Drive IDs are alphanumeric with hyphens and underscores.
 * This prevents SSRF attacks via malicious fileId values.
 */
function isValidDriveId(id: string): boolean {
  // Google Drive IDs are alphanumeric with hyphens/underscores, typically 25-44 chars
  // Root and special IDs like 'shared' are also valid
  if (id === 'root' || id === 'shared') return true;
  return /^[a-zA-Z0-9_-]{10,100}$/.test(id);
}

/**
 * Escape a search query for use in Google Drive API queries.
 * Must escape both backslashes and single quotes to prevent injection.
 * Uses two-pass replacement to handle edge cases correctly.
 * lgtm[js/incomplete-multi-character-sanitization]
 */
function escapeQueryString(query: string): string {
  // Two-pass escaping: backslashes first (so we don't double-escape quotes)
  // then single quotes. This order is intentional and correct.
  let escaped = query;
  escaped = escaped.split('\\').join('\\\\');
  escaped = escaped.split("'").join("\\'");
  return escaped;
}

/**
 * List files in a folder or root
 */
export async function listDriveFiles(
  userId: string,
  options: {
    folderId?: string;
    pageSize?: number;
    pageToken?: string;
    mimeTypes?: string[];
  } = {}
): Promise<DriveListResponse | null> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return null;

  const {
    folderId = 'root',
    pageSize = 50,
    pageToken,
    mimeTypes = ALL_SUPPORTED_MIME_TYPES,
  } = options;

  // Validate folderId to prevent injection attacks
  if (!isValidDriveId(folderId)) {
    logger.error('[Drive Client] Invalid folder ID format:', { folderId });
    return null;
  }

  // Build query for folder and supported file types
  const queryParts: string[] = ['trashed = false'];

  // Special handling for shared files view
  if (folderId === 'shared') {
    queryParts.push('sharedWithMe = true');
  } else {
    queryParts.push(`'${folderId}' in parents`);
  }

  // Add MIME type filter (include folders for navigation + supported types)
  const mimeTypeQuery = [
    "mimeType = 'application/vnd.google-apps.folder'",
    ...mimeTypes.map(m => `mimeType = '${m}'`),
  ].join(' or ');
  queryParts.push(`(${mimeTypeQuery})`);

  const params: DriveListParams = {
    pageSize,
    q: queryParts.join(' and '),
    orderBy: 'folder,name',
    fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,iconLink,thumbnailLink,webViewLink,parents)',
    spaces: 'drive',
  };

  if (pageToken) {
    params.pageToken = pageToken;
  }

  const url = new URL(`${DRIVE_API_BASE}/files`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    logger.error('[Drive Client] List files failed:', { responseText: await response.text() });
    return null;
  }

  return response.json();
}

/**
 * Search files by name
 */
export async function searchDriveFiles(
  userId: string,
  query: string,
  options: {
    pageSize?: number;
    pageToken?: string;
    mimeTypes?: string[];
  } = {}
): Promise<DriveListResponse | null> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return null;

  const {
    pageSize = 50,
    pageToken,
    mimeTypes = ALL_SUPPORTED_MIME_TYPES,
  } = options;

  // Build search query
  const queryParts = [
    `name contains '${escapeQueryString(query)}'`,
    'trashed = false',
  ];

  // Add MIME type filter
  const mimeTypeQuery = mimeTypes.map(m => `mimeType = '${m}'`).join(' or ');
  queryParts.push(`(${mimeTypeQuery})`);

  const params: DriveListParams = {
    pageSize,
    q: queryParts.join(' and '),
    orderBy: 'modifiedTime desc',
    fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,iconLink,thumbnailLink,webViewLink,parents)',
    spaces: 'drive',
  };

  if (pageToken) {
    params.pageToken = pageToken;
  }

  const url = new URL(`${DRIVE_API_BASE}/files`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    logger.error('[Drive Client] Search failed:', { responseText: await response.text() });
    return null;
  }

  return response.json();
}

/**
 * Get file metadata by ID
 * lgtm[js/request-forgery]
 */
export async function getDriveFile(
  userId: string,
  fileId: string
): Promise<DriveFile | null> {
  // SECURITY: Validate fileId to prevent SSRF attacks
  // Only alphanumeric IDs with hyphens/underscores are allowed
  if (!isValidDriveId(fileId)) {
    logger.error('[Drive Client] Invalid file ID format:', { fileId });
    return null;
  }

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return null;

  // fileId is validated above - safe to use in URL construction
  const url = new URL(`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set(
    'fields',
    'id,name,mimeType,size,modifiedTime,iconLink,thumbnailLink,webViewLink,parents'
  );

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    logger.error('[Drive Client] Get file failed:', { responseText: await response.text() });
    return null;
  }

  return response.json();
}

/**
 * Download file content
 * For Google Docs/Sheets, exports as PDF
 */
export async function downloadDriveFile(
  userId: string,
  fileId: string
): Promise<DriveDownloadResult | null> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return null;

  // First get file metadata
  const file = await getDriveFile(userId, fileId);
  if (!file) return null;

  // Determine download URL based on file type
  // fileId is already validated by getDriveFile above
  let downloadUrl: string;
  let exportMimeType: string | null = null;
  const safeFileId = encodeURIComponent(fileId);

  if (file.mimeType.startsWith('application/vnd.google-apps.')) {
    // Google Docs need to be exported
    exportMimeType = 'application/pdf';
    downloadUrl = `${DRIVE_API_BASE}/files/${safeFileId}/export?mimeType=${exportMimeType}`;
  } else {
    // Regular files can be downloaded directly
    downloadUrl = `${DRIVE_API_BASE}/files/${safeFileId}?alt=media`;
  }

  const response = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    logger.error('[Drive Client] Download failed:', { responseText: await response.text() });
    return null;
  }

  const content = await response.arrayBuffer();
  const mimeType = exportMimeType || file.mimeType;
  const size = content.byteLength;

  // Adjust filename for exported files
  let fileName = file.name;
  if (exportMimeType === 'application/pdf' && !fileName.endsWith('.pdf')) {
    fileName = `${fileName}.pdf`;
  }

  return {
    content,
    mimeType,
    fileName,
    size,
  };
}

/**
 * Get folder path (breadcrumbs)
 */
export async function getDriveFolderPath(
  userId: string,
  folderId: string
): Promise<{ id: string; name: string }[]> {
  // Validate folderId to prevent injection attacks
  if (!isValidDriveId(folderId)) {
    logger.error('[Drive Client] Invalid folder ID format:', { folderId });
    return [];
  }

  // Special case for shared files
  if (folderId === 'shared') {
    return [{ id: 'shared', name: 'Condivisi con me' }];
  }

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return [];

  const path: { id: string; name: string }[] = [];
  let currentId = folderId;

  while (currentId && currentId !== 'root') {
    const file = await getDriveFile(userId, currentId);
    if (!file) break;

    path.unshift({ id: file.id, name: file.name });

    // Move to parent
    currentId = file.parents?.[0] || '';
  }

  // Add root
  path.unshift({ id: 'root', name: 'Il mio Drive' });

  return path;
}
