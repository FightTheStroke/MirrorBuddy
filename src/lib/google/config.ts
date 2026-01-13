/**
 * Google OAuth Configuration
 * ADR 0038 - Google Drive Integration
 *
 * Uses environment variables for credentials.
 * Scopes are limited to Drive read-only for file selection.
 */

// OAuth endpoints
export const GOOGLE_OAUTH_ENDPOINTS = {
  authorization: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token',
  revoke: 'https://oauth2.googleapis.com/revoke',
  userinfo: 'https://www.googleapis.com/oauth2/v2/userinfo',
} as const;

// Scopes for Google Drive file picker (read-only)
export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
] as const;

// Get OAuth config from environment
export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  // Determine redirect URI based on environment
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    || process.env.VERCEL_URL
    || 'http://localhost:3000';

  const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/auth/google/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: GOOGLE_DRIVE_SCOPES,
  };
}

// Check if Google OAuth is configured
export function isGoogleOAuthConfigured(): boolean {
  return getGoogleOAuthConfig() !== null;
}

// Supported file types for import
export const SUPPORTED_FILE_TYPES = {
  pdf: {
    mimeTypes: ['application/pdf'],
    extension: '.pdf',
    label: 'PDF',
  },
  image: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    extension: '.jpg,.png,.webp,.gif',
    label: 'Images',
  },
  document: {
    mimeTypes: [
      'application/vnd.google-apps.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    extension: '.doc,.docx',
    label: 'Documents',
  },
} as const;

// All supported MIME types for Drive file filtering
export const ALL_SUPPORTED_MIME_TYPES = [
  ...SUPPORTED_FILE_TYPES.pdf.mimeTypes,
  ...SUPPORTED_FILE_TYPES.image.mimeTypes,
  ...SUPPORTED_FILE_TYPES.document.mimeTypes,
];
