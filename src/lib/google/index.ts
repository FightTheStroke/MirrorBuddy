/**
 * Google Integration Module
 * ADR 0038 - Google Drive Integration
 *
 * Exports for Google OAuth and Drive functionality.
 */

// Configuration
export {
  GOOGLE_OAUTH_ENDPOINTS,
  GOOGLE_DRIVE_SCOPES,
  getGoogleOAuthConfig,
  isGoogleOAuthConfigured,
  SUPPORTED_FILE_TYPES,
  ALL_SUPPORTED_MIME_TYPES,
} from './config';

// OAuth functions
export {
  generateAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getGoogleUserProfile,
  revokeToken,
  getValidAccessToken,
  saveGoogleAccount,
  disconnectGoogleAccount,
  encodeState,
  decodeState,
  generateNonce,
} from './oauth';

// Types
export type {
  GoogleTokenResponse,
  GoogleUserProfile,
  StoredGoogleAccount,
  OAuthState,
  GoogleConnectionStatus,
} from './types';

// Drive client
export {
  listDriveFiles,
  searchDriveFiles,
  getDriveFile,
  downloadDriveFile,
  getDriveFolderPath,
} from './drive-client';

// Drive types
export type {
  DriveFile,
  DriveListResponse,
  DriveListParams,
  DriveDownloadResult,
  DriveBreadcrumb,
  DriveFileUI,
  DrivePickerState,
} from './drive-types';

export {
  DRIVE_MIME_TYPES,
  isFolder,
  toDriveFileUI,
} from './drive-types';
