# Google Drive Integration

> Read-only Google Drive access for importing study materials via server-side OAuth 2.0

## Quick Reference

| Key          | Value                            |
| ------------ | -------------------------------- |
| OAuth        | `src/lib/google/oauth.ts`        |
| Drive Client | `src/lib/google/drive-client.ts` |
| Components   | `src/components/google-drive/`   |
| DB Model     | `GoogleAccount` in Prisma schema |
| ADR          | 0040                             |

## Architecture

```
User -> Settings Page -> Google OAuth 2.0 -> Callback -> Store tokens in DB
User -> Tool (Study Kit / Homework) -> UnifiedFilePicker -> Drive API v3 -> Download
```

OAuth scopes (read-only): `openid`, `profile`, `email`, `drive.readonly`

## API Routes

| Route                                   | Method | Auth   | Purpose             |
| --------------------------------------- | ------ | ------ | ------------------- |
| `/api/auth/google`                      | GET    | Auth   | Initiate OAuth flow |
| `/api/auth/google/callback`             | GET    | Public | Handle callback     |
| `/api/auth/google/status`               | GET    | Auth   | Connection status   |
| `/api/auth/google/disconnect`           | POST   | Auth   | Disconnect account  |
| `/api/google-drive/files`               | GET    | Auth   | List/search files   |
| `/api/google-drive/files/[id]/download` | GET    | Auth   | Download file       |

## OAuth Library

```typescript
import { generateAuthUrl, getValidAccessToken } from "@/lib/google/oauth";

// Start OAuth flow (includes CSRF state parameter)
const url = generateAuthUrl(userId, redirectUri);

// Get valid token (auto-refreshes if expired)
const token = await getValidAccessToken(userId);
```

## Drive Client

```typescript
import {
  listDriveFiles,
  searchDriveFiles,
  downloadDriveFile,
} from "@/lib/google/drive-client";

const files = await listDriveFiles(token, folderId);
const results = await searchDriveFiles(token, "homework.pdf");
const buffer = await downloadDriveFile(token, fileId);
```

## React Components

```typescript
const { isConnected, connect, files, navigateToFolder } = useGoogleDrive({ userId });
<GoogleDrivePicker userId={userId} onFileSelect={handleSelect} />
<UnifiedFilePicker userId={userId} onFileSelect={handleSelect} accept=".pdf" />
<GoogleAccountCard userId={userId} /> // Settings connect/disconnect
```

## DB Model (Prisma)

| Field        | Type     | Notes                        |
| ------------ | -------- | ---------------------------- |
| googleId     | String   | Unique Google account ID     |
| accessToken  | String   | Encrypted, auto-refreshed    |
| refreshToken | String?  | For token renewal            |
| expiresAt    | DateTime | Token expiration             |
| isConnected  | Boolean  | Connect/disconnect state     |
| scopes       | String   | JSON array of granted scopes |

## Security

- CSRF: State parameter in OAuth flow contains encrypted userId
- Tokens: Refresh tokens stored encrypted in database
- Scopes: Only `drive.readonly` -- never writes to user's Drive
- Disconnect: Full token cleanup on account disconnect

## Env Vars

`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (from Google Cloud Console)

## See Also

- ADR 0040 (Google Drive integration)
- `docs/claude/tools.md` -- Study Kit and Homework Help tool integration
