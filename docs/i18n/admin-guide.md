# Admin Guide: Locale Configuration

Manage country-to-locale mappings and assign language maestri teachers per country.

## Overview

The Locale Configuration system (`/admin/locales`) enables admins to:
- Define which countries can access which languages
- Assign primary and secondary language teachers (maestri)
- Enable/disable locales by country
- Maintain audit logs of all changes

## Accessing the Admin UI

**URL**: `https://app.mirrorbuddy.com/admin/locales`

**Prerequisites**:
- Admin account (set via `ADMIN_EMAIL` env var)
- Valid session authentication

## LocaleConfig Model

The `LocaleConfig` model defines the structure:

```typescript
{
  id: string;              // Country code (e.g., "IT", "FR", "DE")
  countryName: string;     // Display name (e.g., "Italia", "France")
  primaryLocale: string;   // Primary locale (e.g., "it", "en", "fr")
  primaryLanguageMaestroId: string;  // ID of primary language teacher
  secondaryLocales: string[];  // Additional supported locales
  enabled: boolean;        // Active/inactive flag
  createdAt: DateTime;     // Timestamp
  updatedAt: DateTime;     // Timestamp
}
```

### Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| **id** | String | ISO 3166-1 alpha-2 country code | "IT", "FR" |
| **countryName** | String | Human-readable country name | "Italia", "France" |
| **primaryLocale** | String | Main BCP 47 language tag | "it-IT", "fr-FR" |
| **primaryLanguageMaestroId** | String | ID of primary language maestro | "manzoni-italian" |
| **secondaryLocales** | String[] | Alternative language options | ["en-US", "it-CH"] |
| **enabled** | Boolean | Whether locale is active | true/false |

## UI Operations

### List View (`/admin/locales`)

**Features**:
- Table of all configured locales
- Search across: country code, name, locale, maestro ID
- Sort by country name (ascending)
- Edit and view buttons per row
- Status indicator: green (Attivo) / gray (Inattivo)

**Columns**:
- Codice Paese (Country Code)
- Nome Paese (Country Name)
- Locale Primario (Primary Locale)
- Maestro Lingua (Language Maestro)
- Locali Secondari (Secondary Locales)
- Stato (Status badge)
- Azioni (Edit button)

### Create New Locale (`/admin/locales/new`)

**Form Fields**:
1. **Codice Paese*** (Country Code) - 2-letter ISO code
   - Auto-validated against existing codes
   - Immutable after creation
2. **Nome Paese*** (Country Name) - Display name
3. **Locale Primario*** (Primary Locale) - BCP 47 format
4. **Maestro Lingua*** (Language Maestro) - Dropdown of available maestri
5. **Locali Secondari** (Secondary Locales) - Multi-select or comma-separated
6. **Stato** (Status) - Checkbox (enabled by default)

**Validation**:
- Country code must not already exist (409 Conflict)
- All required fields must be populated
- Locale codes must match BCP 47 format

### Edit Locale (`/admin/locales/[id]/edit`)

**Editable Fields**:
- Country name
- Primary locale
- Language maestro
- Secondary locales
- Enabled status

**Immutable Field**:
- Country code (id) - cannot be changed after creation

**Changes Tracking**:
- Only modified fields logged to audit trail
- Timestamp updated on save

### Delete Locale

**Method 1**: Via Edit page - delete button at bottom

**Method 2**: Via API - `DELETE /api/admin/locales/[id]`

**Restrictions**:
- No cascading delete protection in v1
- Admin must verify no active users in region before deletion

**Audit Logging**:
- Full deletion logged with admin ID and timestamp

## API Endpoints

### GET /api/admin/locales
Fetch all locale configurations (sorted by country name)

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://app.mirrorbuddy.com/api/admin/locales
```

**Response**:
```json
{
  "locales": [
    { "id": "IT", "countryName": "Italia", ... },
    { "id": "FR", "countryName": "France", ... }
  ]
}
```

### POST /api/admin/locales
Create new locale configuration

```json
{
  "id": "ES",
  "countryName": "España",
  "primaryLocale": "es-ES",
  "primaryLanguageMaestroId": "alex-pina-spanish",
  "secondaryLocales": ["en-US"],
  "enabled": true
}
```

### PUT /api/admin/locales/[id]
Update existing locale (partial updates supported)

```json
{
  "primaryLanguageMaestroId": "new-maestro-id",
  "enabled": false
}
```

### DELETE /api/admin/locales/[id]
Delete locale configuration

## Maestro Assignment

### Primary Maestro Selection

Choose a maestro that matches the primary language:
- Assign **one** maestro per country's primary language
- Maestro must exist in `src/data/maestri/`
- Common examples:
  - Italy (IT) → "manzoni-italian"
  - France (FR) → "victor-hugo-french"
  - Spain (ES) → "alex-pina-spanish"

### Secondary Locales with Alternative Maestri

Secondary locales are listed but don't have dedicated maestro assignments. Users can switch between primary + secondary languages, but primary maestro is the default teacher.

## Audit Logging & Compliance

### LocaleAuditLog Model

Tracks all administrative changes:

```typescript
{
  id: string;              // Unique log ID
  localeId: string;        // Country code (FK)
  adminId: string;         // Admin user ID
  action: enum;            // LOCALE_CREATE | LOCALE_UPDATE | LOCALE_DELETE
  changes: JSON;           // Field-level changes (before/after)
  notes: string;           // Optional context
  createdAt: DateTime;     // Timestamp
}
```

### Audit Events

| Action | Trigger | Logged Data |
|--------|---------|------------|
| LOCALE_CREATE | POST /api/admin/locales | All initial fields |
| LOCALE_UPDATE | PUT /api/admin/locales/[id] | Only changed fields + unchanged context |
| LOCALE_DELETE | DELETE /api/admin/locales/[id] | Full deleted configuration |

### Compliance Notes

- **GDPR**: Audit logs stored separately from user data
- **Retention**: No automatic purge (implement per data governance policy)
- **Access**: Admins only; use `/api/admin/audit-logs` for export
- **Transparency**: Changes visible to all admins in real-time

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Country code exists | Edit existing locale or use unique code |
| Maestro not found | Verify maestro ID in `src/data/maestri/index.ts` |
| Audit log gaps | Check application logs; email admin support |
| Locale not appearing for users | Verify `enabled: true` and primary maestro validity |

## Related Documentation

- **[i18n README](./README.md)** - Architecture & integration guide
- **[Migration Guide](./migration-guide.md)** - Multi-locale data migration
- **Prisma Schema**: `prisma/schema/locale.prisma`
- **API Tests**: `src/app/api/admin/locales/__tests__/`
