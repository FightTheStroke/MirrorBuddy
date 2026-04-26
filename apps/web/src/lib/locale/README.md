# Locale Configuration with Language Maestri

This module provides utilities for managing locale configurations with language maestri selectors.

## Language Maestri

MirrorBuddy supports 6 language maestri across 5 languages:

| Language | Maestro(s)           | ID(s)                                     |
| -------- | -------------------- | ----------------------------------------- |
| Italian  | Alessandro Manzoni   | `manzoni-italiano`                        |
| English  | William Shakespeare  | `shakespeare-inglese`                     |
| French   | Molière              | `moliere-french`                          |
| German   | Goethe               | `goethe-german`                           |
| Spanish  | Cervantes, Álex Pina | `cervantes-spanish`, `alex-pina-spagnolo` |

## Usage

### Get Language Maestri

```typescript
import { getLanguageMaestri } from "@/lib/locale/maestri-helpers";

const languageMaestri = getLanguageMaestri();
// Returns array of MaestroFull objects for language subjects only
```

### Get Maestro Options for Selectors

```typescript
import { getLanguageMaestroOptions } from "@/lib/locale/maestri-helpers";

const options = getLanguageMaestroOptions();
// Returns:
// [
//   {
//     id: "manzoni-italiano",
//     displayName: "Alessandro Manzoni",
//     subject: "italian",
//     subjectLabel: "Italiano"
//   },
//   ...
// ]
```

### Validate Maestro ID

```typescript
import { isValidLanguageMaestro } from "@/lib/locale/maestri-helpers";

isValidLanguageMaestro("manzoni-italiano"); // true
isValidLanguageMaestro("euclide-matematica"); // false (not a language maestro)
```

## LocaleConfigService (Runtime Resolution)

The `LocaleConfigService` provides efficient runtime locale resolution with caching.

### Get Enabled Locales

```typescript
import { localeConfigService } from "@/lib/locale/locale-config-service";

// Get all enabled locale configurations
const locales = await localeConfigService.getEnabledLocales();
// Returns: LocaleConfig[] (only enabled configurations)
```

### Resolve Country to Locale

```typescript
// Get locale configuration for a specific country
const locale = await localeConfigService.getLocaleForCountry("IT");
// Returns: LocaleConfig or null if not found/disabled

// Properties available:
// - locale.id: "IT" (country code)
// - locale.countryName: "Italia"
// - locale.primaryLocale: "it"
// - locale.primaryLanguageMaestroId: "manzoni-italiano"
// - locale.secondaryLocales: ["en", "fr"]
```

### Get Language Maestro for Country

```typescript
// Get the primary language maestro for a country
const maestroId = await localeConfigService.getMaestroForCountry("IT");
// Returns: "manzoni-italiano" or null if not found
```

### Cache Management

```typescript
// Invalidate cache after creating/updating/deleting locale configs
localeConfigService.invalidateCache();

// Get cache statistics for monitoring
const stats = localeConfigService.getCacheStats();
// Returns: { size, enabledLocalesCount, lastUpdate, isStale }
```

**Performance Features:**

- In-memory caching with 5-minute TTL
- Automatic cache refresh on stale data
- Singleton pattern for consistent state
- Graceful error handling (returns null/empty array on errors)

## Admin UI

### Create New Locale Configuration

Navigate to `/admin/locales` and click "Nuova Configurazione".

**Form Fields:**

- **Country Code** (required): 2-letter ISO 3166-1 alpha-2 code (e.g., IT, FR, DE)
- **Country Name** (required): Display name (e.g., Italia, France, Germany)
- **Primary Locale** (required): ISO 639-1 language code (e.g., it, en, fr)
- **Primary Language Maestro** (required): Select from dropdown of language maestri
- **Secondary Locales** (optional): Comma-separated list (e.g., en, de, fr)
- **Enabled**: Toggle to activate/deactivate configuration

### Edit Existing Configuration

From the locales table, click "Modifica" on any configuration to edit.

**Note:** The country code field is read-only when editing (it's the primary key).

## API Routes

### Create Locale

```
POST /api/admin/locales
```

### Get All Locales

```
GET /api/admin/locales
```

### Get Single Locale

```
GET /api/admin/locales/[id]
```

### Update Locale

```
PUT /api/admin/locales/[id]
```

### Delete Locale

```
DELETE /api/admin/locales/[id]
```

## Database Schema

```prisma
model LocaleConfig {
  id                       String   @id // Country code (e.g., "IT", "FR", "DE")
  countryName              String   // Display name
  primaryLocale            String   // Primary locale code
  primaryLanguageMaestroId String   // Maestro ID for primary language teacher
  secondaryLocales         String[] // Additional supported locale codes
  enabled                  Boolean  @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Tests

Run unit tests:

```bash
# Test maestri helpers
npm run test:unit -- maestri-helpers.test.ts

# Test locale config service
npm run test:unit -- locale-config-service.test.ts
```

**maestri-helpers.test.ts** coverage:

- Language maestri filtering
- Maestro options generation
- Validation of maestro IDs
- Subject label translation

**locale-config-service.test.ts** coverage:

- Get enabled locales with caching
- Resolve country to locale configuration
- Get maestro for country
- Cache invalidation and refresh
- Error handling (database failures)
- Cache statistics monitoring
