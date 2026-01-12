# Google Drive Integration

Import study materials directly from Google Drive.

## Architecture

See ADR 0040 for full architecture details.

## Quick Reference

### OAuth Library

Location: `src/lib/google/oauth.ts`

```typescript
import { generateAuthUrl, getValidAccessToken, disconnectGoogleAccount } from '@/lib/google';

// Start OAuth flow
const authUrl = generateAuthUrl(userId, redirectUri);

// Get valid access token (auto-refreshes if expired)
const token = await getValidAccessToken(userId);

// Disconnect account
await disconnectGoogleAccount(userId);
```

### Drive Client

Location: `src/lib/google/drive-client.ts`

```typescript
import { listDriveFiles, searchDriveFiles, downloadDriveFile } from '@/lib/google';

// List files in folder
const { files, nextPageToken } = await listDriveFiles(accessToken, folderId);

// Search files
const { files } = await searchDriveFiles(accessToken, 'biology notes');

// Download file
const buffer = await downloadDriveFile(accessToken, fileId);
```

### React Components

Location: `src/components/google-drive/`

```typescript
import {
  GoogleDrivePicker,
  GoogleAccountCard,
  UnifiedFilePicker,
  useGoogleDrive,
} from '@/components/google-drive';

// Hook for Drive state
const {
  isConnected,
  connect,
  disconnect,
  files,
  navigateToFolder,
  searchFiles,
} = useGoogleDrive({ userId });

// File picker with folder navigation
<GoogleDrivePicker
  userId={userId}
  onFileSelect={(file) => console.log(file)}
  acceptedTypes={['application/pdf', 'image/*']}
/>

// Settings card for connection management
<GoogleAccountCard userId={userId} />

// Combined local + Drive picker
<UnifiedFilePicker
  userId={userId}
  onFileSelect={handleFileSelect}
  accept=".pdf"
  acceptedMimeTypes={['application/pdf']}
/>
```

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/google` | GET | Start OAuth flow |
| `/api/auth/google/callback` | GET | Handle OAuth callback |
| `/api/auth/google/status` | GET | Check connection status |
| `/api/auth/google/disconnect` | POST | Disconnect account |
| `/api/google-drive/files` | GET | List/search files |
| `/api/google-drive/files/[id]/download` | GET | Download file |

### Query Parameters

**`/api/google-drive/files`**:
- `folderId` - Folder ID (default: 'root')
- `q` - Search query
- `pageToken` - Pagination token
- `pageSize` - Results per page (max 100)

## Database Model

```prisma
model GoogleAccount {
  id           String   @id @default(cuid())
  userId       String   @unique
  googleId     String   @unique
  email        String
  displayName  String?
  avatarUrl    String?
  accessToken  String
  refreshToken String?
  expiresAt    DateTime
  isConnected  Boolean  @default(true)
}
```

## Environment Variables

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
NEXTAUTH_URL=http://localhost:3000
```

## Integration Example

### Study Kit

```typescript
// In StudyKitUpload.tsx
import { UnifiedFilePicker, type SelectedFile } from '@/components/google-drive';

const handleFileSelect = async (selected: SelectedFile) => {
  let file: File;

  if (selected.source === 'google-drive' && selected.driveFile) {
    // Download from Drive first
    const response = await fetch(`/api/google-drive/files/${selected.driveFile.id}/download`);
    const blob = await response.blob();
    file = new File([blob], selected.name, { type: selected.mimeType });
  } else {
    file = selected.file!;
  }

  // Process file (same as local upload)
  const formData = new FormData();
  formData.append('file', file);
  await fetch('/api/study-kit/upload', { method: 'POST', body: formData });
};
```

### Homework Help

```typescript
// In homework-help.tsx
const handleDriveFileSelect = async (driveFile: DriveFileUI) => {
  const response = await fetch(`/api/google-drive/files/${driveFile.id}/download`);
  const blob = await response.blob();
  const file = new File([blob], driveFile.name, { type: driveFile.mimeType });

  // Use existing file handling
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  handleFileSelect({ target: { files: dataTransfer.files } });
};
```

## Scopes

The integration requests minimal read-only scopes:

```typescript
const GOOGLE_SCOPES = [
  'openid',           // OpenID Connect
  'profile',          // User profile
  'email',            // Email address
  'https://www.googleapis.com/auth/drive.readonly',  // Read-only Drive access
];
```

## Security

1. **Server-side OAuth**: Tokens never exposed to browser
2. **CSRF protection**: State parameter validated on callback
3. **Token refresh**: Automatic refresh before expiration
4. **Minimal scopes**: Only read access, no write/delete
5. **Secure storage**: Tokens in database, not localStorage
