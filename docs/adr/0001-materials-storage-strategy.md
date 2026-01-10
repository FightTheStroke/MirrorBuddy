# ADR 0001: Materials Storage Strategy

## Status
Accepted

## Date
2025-12-29

## Context

MirrorBuddy needs to store student-generated materials:
- **Homework photos**: Captured via webcam or uploaded, analyzed by AI vision
- **Mind maps**: Generated as PNG/SVG exports
- **PDF documents**: Uploaded study materials (Phase 1A requirement)
- **Voice recordings**: Future - conversation excerpts for review

### Current State (Problems)
| Issue | Impact |
|-------|--------|
| Base64 in localStorage | 5-10MB limit, serialization overhead |
| No server-side persistence | Data lost on logout, no backup |
| Memory-intensive | Base64 is 33% larger than binary |
| No file organization | Cannot manage/delete old files |
| POST body size limits | Large images slow API calls |

### Requirements
1. **Privacy-first**: Student data must be protected (GDPR, educational data)
2. **Offline-capable**: Support offline-first PWA mode
3. **Scalable**: Handle 1000s of students with multiple files each
4. **Cost-efficient**: Educational platform with limited budget
5. **Simple dev experience**: Easy local development without cloud setup

### Options Considered

#### Option 1: SQLite BLOB Storage
Store binary files directly in SQLite/libSQL database.

**Pros:**
- Already using Prisma + libSQL
- Single data store (simplicity)
- Transactional with other data
- Works offline

**Cons:**
- Database grows large quickly
- Poor for files >1MB
- Backup complexity increases
- No CDN integration

#### Option 2: Local Filesystem + Database Metadata
Store files on local disk, metadata in database.

**Pros:**
- Simple development
- Fast local access
- No external dependencies

**Cons:**
- Doesn't scale to production
- No multi-server support
- No CDN/edge delivery
- Deployment complexity

#### Option 3: Azure Blob Storage
Use Azure Blob Storage with SAS tokens.

**Pros:**
- Already using Azure OpenAI (existing account)
- Scalable, reliable, fast
- CDN integration available
- Direct upload with SAS tokens (no server bottleneck)
- Lifecycle policies for auto-cleanup

**Cons:**
- Monthly cost (~$0.02/GB/month)
- Requires internet for all operations
- Additional Azure configuration

#### Option 4: S3-Compatible Storage (Cloudflare R2)
Use Cloudflare R2 or similar S3-compatible storage.

**Pros:**
- No egress fees (R2 specifically)
- S3 API compatibility
- CDN built-in (Cloudflare)
- Competitive pricing

**Cons:**
- Different cloud provider than AI services
- Additional account/configuration

## Decision

**Implement a Provider-Agnostic Storage Service with two implementations:**

1. **Development**: Local filesystem storage (`./uploads/`)
2. **Production**: Azure Blob Storage (aligned with existing Azure infrastructure)

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   StorageService                         │
│  (Abstract Interface)                                    │
├─────────────────────────────────────────────────────────┤
│  upload(file, options): Promise<StoredFile>              │
│  download(fileId): Promise<Blob>                         │
│  getUrl(fileId, expiresIn?): Promise<string>             │
│  delete(fileId): Promise<void>                           │
│  list(prefix?): Promise<StoredFile[]>                    │
└─────────────────────────────────────────────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│  LocalStorageProvider │     │  AzureBlobProvider   │
│  (Development)        │     │  (Production)        │
├─────────────────────┤     ├─────────────────────┤
│  - ./uploads/ dir    │     │  - Azure Blob API    │
│  - Direct file I/O   │     │  - SAS token auth    │
│  - No dependencies   │     │  - CDN optional      │
└─────────────────────┘     └─────────────────────┘
```

### File Organization

```
{container}/
├── homework/
│   └── {userId}/
│       └── {homeworkId}/
│           ├── photo.jpg
│           └── analysis.json
├── mindmaps/
│   └── {userId}/
│       └── {mindmapId}.png
├── documents/
│   └── {userId}/
│       └── {documentId}/
│           ├── original.pdf
│           └── thumbnail.png
└── voice/
    └── {userId}/
        └── {sessionId}/
            └── {timestamp}.webm
```

### Database Schema Addition

```prisma
model StoredFile {
  id          String   @id @default(cuid())
  userId      String
  type        FileType
  path        String   // Storage path (container/path/file)
  filename    String   // Original filename
  mimeType    String
  size        Int      // Bytes
  checksum    String?  // SHA-256 for integrity
  metadata    Json?    // Type-specific metadata
  expiresAt   DateTime? // For temporary files
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([type])
  @@index([expiresAt])
}

enum FileType {
  HOMEWORK_PHOTO
  MINDMAP_EXPORT
  PDF_DOCUMENT
  VOICE_RECORDING
  AVATAR
}
```

### Environment Configuration

```bash
# Storage Provider Selection
STORAGE_PROVIDER=local  # or 'azure'

# Local Storage (Development)
STORAGE_LOCAL_PATH=./uploads

# Azure Blob Storage (Production)
AZURE_STORAGE_ACCOUNT_NAME=mirrorbuddy
AZURE_STORAGE_ACCOUNT_KEY=xxx
AZURE_STORAGE_CONTAINER=student-materials
# OR use connection string:
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...

# Optional: CDN endpoint
AZURE_CDN_ENDPOINT=https://cdn.mirrorbuddy.org

# File Limits
MAX_FILE_SIZE_MB=10
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,application/pdf,audio/webm
```

## Consequences

### Positive
- Clean abstraction allows easy provider switching
- Local dev requires zero cloud configuration
- Production uses battle-tested Azure infrastructure
- Database tracks all files with metadata for queries
- Automatic cleanup via expiration dates
- Consistent file organization

### Negative
- Two implementations to maintain
- Local dev files not synced with cloud
- Requires Azure account configuration for production
- Additional Prisma migration needed

### Risks
- File/database sync issues if operations fail mid-way (mitigate with transactions)
- Storage costs if students upload many large files (mitigate with size limits + lifecycle policies)

## Implementation Tasks

1. **ST-02**: Implement `StorageService` interface + `LocalStorageProvider`
2. Add Prisma schema for `StoredFile`
3. Implement `AzureBlobProvider` (can be deferred to production deployment)
4. Migrate homework-help-view to use StorageService
5. Add file cleanup job for expired files

## References
- [Azure Blob Storage Pricing](https://azure.microsoft.com/en-us/pricing/details/storage/blobs/)
- [Prisma Binary Fields](https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#bytes)
- [Next.js File Uploads](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#file-upload)
- Related: #22 Storage Architecture Decision
