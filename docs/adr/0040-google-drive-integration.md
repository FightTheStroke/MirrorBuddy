# ADR 0040: Google Drive Integration

## Status
Accepted

## Date
2026-01-12

## Context

MirrorBuddy users want to import study materials directly from Google Drive instead of only uploading from local filesystem. This is especially useful for:

1. **Students using Chromebooks**: Primary storage is Google Drive
2. **Shared family materials**: Parents store PDFs in shared Drive folders
3. **Cross-device access**: Materials uploaded on one device available everywhere
4. **School integration**: Many Italian schools use Google Workspace for Education

Requirements:
1. **OAuth 2.0 authentication**: Secure server-side flow
2. **Read-only access**: Only read files, never modify user's Drive
3. **Cross-tool usage**: Works in Study Kit, Homework Help, and future tools
4. **Settings integration**: Connect/disconnect in user settings
5. **Privacy**: Minimal scope, clear user consent

## Decision

**Implement Google Drive integration using server-side OAuth 2.0 flow with minimal scopes.**

### Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   User      │────▶│  Settings Page   │────▶│   Google    │
│   (Browser) │     │  /settings       │     │   OAuth     │
└─────────────┘     └────────┬─────────┘     └─────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ OAuth Callback │
                    │ /api/auth/     │
                    │ google/callback│
                    └────────┬───────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       ┌────────────┐ ┌────────────┐ ┌────────────┐
       │ Google     │ │ Prisma     │ │  Drive     │
       │ OAuth      │ │ Database   │ │  API v3    │
       │ Library    │ │ (tokens)   │ │            │
       └────────────┘ └────────────┘ └────────────┘
```

### OAuth Scopes

Minimal read-only scopes:
```typescript
const GOOGLE_SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/drive.readonly',
];
```

### Components

#### 1. OAuth Library (`src/lib/google/oauth.ts`)

Server-side OAuth implementation:

```typescript
// Generate auth URL with state for CSRF protection
export function generateAuthUrl(userId: string, redirectUri: string): string;

// Exchange code for tokens
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<OAuthTokens>;

// Refresh expired access token
export async function refreshAccessToken(
  refreshToken: string
): Promise<RefreshedTokens>;

// Get valid access token (auto-refresh if expired)
export async function getValidAccessToken(userId: string): Promise<string>;
```

#### 2. Drive Client (`src/lib/google/drive-client.ts`)

Google Drive API wrapper:

```typescript
// List files in folder
export async function listDriveFiles(
  accessToken: string,
  folderId?: string,
  pageToken?: string,
  pageSize?: number
): Promise<DriveListResponse>;

// Search files by name
export async function searchDriveFiles(
  accessToken: string,
  query: string
): Promise<DriveListResponse>;

// Download file content
export async function downloadDriveFile(
  accessToken: string,
  fileId: string
): Promise<Buffer>;
```

#### 3. API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/google` | GET | Initiate OAuth flow |
| `/api/auth/google/callback` | GET | Handle OAuth callback |
| `/api/auth/google/status` | GET | Check connection status |
| `/api/auth/google/disconnect` | POST | Disconnect account |
| `/api/google-drive/files` | GET | List/search files |
| `/api/google-drive/files/[id]/download` | GET | Download file |

#### 4. React Components (`src/components/google-drive/`)

```typescript
// Hook for Google Drive state
const { isConnected, connect, files, navigateToFolder } = useGoogleDrive({ userId });

// File picker with folder navigation
<GoogleDrivePicker userId={userId} onFileSelect={handleSelect} />

// Unified picker (local + Drive)
<UnifiedFilePicker userId={userId} onFileSelect={handleSelect} />

// Settings card for connection management
<GoogleAccountCard userId={userId} />
```

### Database Model

```prisma
model GoogleAccount {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  googleId     String   @unique
  email        String
  displayName  String?
  avatarUrl    String?

  accessToken  String
  refreshToken String?
  tokenType    String   @default("Bearer")
  expiresAt    DateTime
  scopes       String   @default("[]")

  isConnected  Boolean  @default(true)
  lastUsedAt   DateTime @default(now())

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([userId])
  @@index([googleId])
}
```

### Security Considerations

1. **CSRF Protection**: State parameter in OAuth flow contains encrypted userId
2. **Token Storage**: Refresh tokens stored encrypted in database
3. **Minimal Scopes**: Only `drive.readonly`, no write access
4. **Token Refresh**: Automatic refresh before expiration
5. **Disconnect**: Proper token cleanup on disconnect

### Tool Integration

Study Kit and Homework Help use `UnifiedFilePicker`:

```typescript
<UnifiedFilePicker
  userId={getUserId()}
  onFileSelect={(file) => {
    if (file.source === 'google-drive') {
      // Download from Drive, then process
      const blob = await fetch(`/api/google-drive/files/${file.driveFile.id}/download`);
      // ... process blob
    } else {
      // Local file, process directly
      // ... process file.file
    }
  }}
  accept=".pdf"
  acceptedMimeTypes={['application/pdf']}
/>
```

## Consequences

### Positive
- **User convenience**: Import directly from cloud storage
- **Cross-device access**: Materials available everywhere
- **School compatibility**: Works with Google Workspace for Education
- **Minimal permissions**: Read-only access maintains trust

### Negative
- **External dependency**: Relies on Google OAuth service
- **Token management**: Must handle refresh, expiration, revocation
- **Additional latency**: Download step before processing

### Mitigations
- Graceful degradation when Google unavailable
- Clear error messages for auth failures
- Caching of file listings for faster navigation

## Files

- `src/lib/google/` - OAuth and Drive API clients
- `src/components/google-drive/` - React components
- `src/app/api/auth/google/` - OAuth routes
- `src/app/api/google-drive/` - Drive API routes
- `prisma/schema.prisma` - GoogleAccount model

## Environment Variables

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
NEXTAUTH_URL=http://localhost:3000
```

## References

- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API v3](https://developers.google.com/drive/api/v3/reference)
- ADR 0015: Database-First Architecture
