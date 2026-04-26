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
import { isValidDriveId, escapeQueryString, makeDriveRequest, getDriveApiBase } from './drive-helpers';
import type {
  DriveFile,
  DriveListResponse,
  DriveListParams,
  DriveDownloadResult,
} from './drive-types';

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

  if (!isValidDriveId(folderId)) {
    logger.error('[Drive Client] Invalid folder ID format:', { folderId });
    return null;
  }

  const queryParts: string[] = ['trashed = false'];
  if (folderId === 'shared') {
    queryParts.push('sharedWithMe = true');
  } else {
    queryParts.push(`'${folderId}' in parents`);
  }

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
    pageToken,
  };

  return makeDriveRequest<DriveListResponse>(
    accessToken,
    '/files',
    params as Partial<Record<string, string | number | boolean | undefined>>
  );
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

  const queryParts = [
    `name contains '${escapeQueryString(query)}'`,
    'trashed = false',
  ];

  const mimeTypeQuery = mimeTypes.map(m => `mimeType = '${m}'`).join(' or ');
  queryParts.push(`(${mimeTypeQuery})`);

  const params: DriveListParams = {
    pageSize,
    q: queryParts.join(' and '),
    orderBy: 'modifiedTime desc',
    fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,iconLink,thumbnailLink,webViewLink,parents)',
    spaces: 'drive',
    pageToken,
  };

  return makeDriveRequest<DriveListResponse>(
    accessToken,
    '/files',
    params as Partial<Record<string, string | number | boolean | undefined>>
  );
}

/**
 * Get file metadata by ID
 * lgtm[js/request-forgery]
 */
export async function getDriveFile(
  userId: string,
  fileId: string
): Promise<DriveFile | null> {
  if (!isValidDriveId(fileId)) {
    logger.error('[Drive Client] Invalid file ID format:', { fileId });
    return null;
  }

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return null;

  return makeDriveRequest<DriveFile>(
    accessToken,
    `/files/${encodeURIComponent(fileId)}`,
    {
      fields: 'id,name,mimeType,size,modifiedTime,iconLink,thumbnailLink,webViewLink,parents',
    }
  );
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

  const file = await getDriveFile(userId, fileId);
  if (!file) return null;

  let downloadUrl: string;
  let exportMimeType: string | null = null;
  const safeFileId = encodeURIComponent(fileId);

  if (file.mimeType.startsWith('application/vnd.google-apps.')) {
    exportMimeType = 'application/pdf';
    downloadUrl = `${getDriveApiBase()}/files/${safeFileId}/export?mimeType=${exportMimeType}`;
  } else {
    downloadUrl = `${getDriveApiBase()}/files/${safeFileId}?alt=media`;
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
  if (!isValidDriveId(folderId)) {
    logger.error('[Drive Client] Invalid folder ID format:', { folderId });
    return [];
  }

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
    currentId = file.parents?.[0] || '';
  }

  path.unshift({ id: 'root', name: 'Il mio Drive' });

  return path;
}
