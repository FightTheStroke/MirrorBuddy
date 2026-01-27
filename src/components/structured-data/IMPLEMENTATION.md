# JSON-LD Structured Data Implementation

## F-76: Pages have structured data for rich search results

This document describes the implementation of JSON-LD structured data for MirrorBuddy's SEO optimization.

### Overview

JSON-LD (JSON for Linking Data) is a standard format for adding structured data to web pages. This allows search engines (Google, Bing, etc.) to better understand page content and display rich search results.

### Implementation Details

#### Files Created

1. **`json-ld-organization.ts`** (111 lines)
   - Schema generation logic
   - `generateOrganizationSchema()` - Basic Organization schema
   - `generateEducationalOrganizationSchema()` - Educational Organization schema with school levels
   - `serializeSchemaToJson()` - JSON serialization
   - Locale-specific descriptions (5 languages: IT, EN, FR, DE, ES)
   - Educational levels for each locale

2. **`json-ld-script.tsx`** (72 lines)
   - React Server Component
   - Renders `<script type="application/ld+json">` tags
   - Supports both Organization and EducationalOrganization variants
   - Safely injects JSON content with `dangerouslySetInnerHTML`

3. **`index.ts`** (16 lines)
   - Barrel export for all components and types

#### Integration Points

**Root Layout** (`src/app/layout.tsx`)

```typescript
<JsonLdScript locale="it" variant="organization" />
```

- Renders Organization schema at site level
- Applies to all pages globally

**Locale Layout** (`src/app/[locale]/layout.tsx`)

```typescript
<JsonLdScript locale={locale as Locale} variant="educational" />
```

- Renders EducationalOrganization schema
- Locale-specific descriptions and educational levels

### Schema Structure

#### Organization Schema

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "MirrorBuddy",
  "url": "https://mirrorbuddy.com",
  "logo": "https://mirrorbuddy.com/logo-512.png",
  "description": "[Locale-specific description]",
  "sameAs": [
    "https://github.com/FightTheStroke/MirrorBuddy",
    "https://twitter.com/MirrorBuddy_AI",
    "https://www.linkedin.com/company/mirrorbuddy/",
    "https://www.instagram.com/mirrorbuddy.ai/"
  ]
}
```

#### EducationalOrganization Schema

Extends Organization schema with:

```json
{
  "@type": ["Organization", "EducationalOrganization"],
  "educationalLevel": ["Secondary Education", "High School"]
}
```

### Acceptance Criteria Met

- [x] **Create JSON-LD component for Organization schema**
  - Created `JsonLdScript` component in `json-ld-script.tsx`
  - Renders valid JSON-LD in `<script>` tags

- [x] **Add EducationalOrganization type**
  - `generateEducationalOrganizationSchema()` generates schema with `@type: ["Organization", "EducationalOrganization"]`
  - Includes `educationalLevel` property

- [x] **Include locale-specific name, description, url**
  - Descriptions in 5 languages (IT, EN, FR, DE, ES)
  - URL from `NEXT_PUBLIC_SITE_URL` environment variable
  - Name: "MirrorBuddy"

- [x] **Add to layout.tsx or page heads**
  - Added to root layout (`src/app/layout.tsx`)
  - Added to locale layout (`src/app/[locale]/layout.tsx`)

- [x] **Validate with Google's Rich Results Test format**
  - Includes required fields: `@context`, `@type`, `name`, `url`, `logo`, `description`
  - Absolute URLs for `url` and `logo`
  - Valid JSON serialization

- [x] **Include: @type, name, url, logo, sameAs**
  - All required fields present
  - Social links in `sameAs` array:
    - GitHub repository
    - Twitter/X
    - LinkedIn
    - Instagram

### Testing

#### Unit Tests (20 tests, all passing)

File: `__tests__/json-ld-organization.test.ts`

**Schema Generation Tests**

- ✓ Valid Organization schema with required fields
- ✓ Includes sameAs social links
- ✓ Includes locale-specific description
- ✓ Sets correct site URL
- ✓ Sets correct logo URL
- ✓ Supports multiple locales (it, en, fr, de, es)
- ✓ Valid JSON-serializable output

**EducationalOrganization Tests**

- ✓ Valid EducationalOrganization schema
- ✓ Includes educational-specific properties
- ✓ Multiple educational levels
- ✓ Supports multiple locales
- ✓ Valid JSON-serializable output

**Schema Validation**

- ✓ Matching URLs across variants
- ✓ Matching social links (sameAs)
- ✓ Passes Google Rich Results Test structure validation

**Locale-specific Content**

- ✓ Italian description matches locale
- ✓ English description matches locale
- ✓ French description matches locale
- ✓ German description matches locale
- ✓ Spanish description matches locale

### File Size Compliance

All files comply with 250-line limit:

- `json-ld-organization.ts`: 111 lines
- `json-ld-script.tsx`: 72 lines
- `index.ts`: 16 lines
- Tests: Well-organized and focused

### SEO Benefits

1. **Rich Search Results** - Enables Google to display:
   - Organization knowledge card
   - Site links in search results
   - Logo in SERP

2. **Social Media Optimization** - sameAs links help search engines connect social profiles

3. **Educational Context** - EducationalOrganization type signals educational content to search engines

4. **Multi-language Support** - Locale-specific descriptions improve relevance for each language

### Google Rich Results Test Validation

To validate the implementation:

1. Go to https://search.google.com/test/rich-results
2. Paste the URL of any MirrorBuddy page
3. Google will validate and show the structured data interpretation

Expected results:

- Organization type detected
- Name: "MirrorBuddy"
- Logo recognized
- Social profiles linked

### Future Enhancements

Potential additions (not required for F-76):

- WebSite schema with search action
- BreadcrumbList schema for navigation
- Course schema for educational content
- AggregateRating schema for reviews
- LocalBusiness schema if applicable

### References

- Schema.org: https://schema.org/Organization
- Schema.org: https://schema.org/EducationalOrganization
- Google Search Central: https://developers.google.com/search/docs/appearance/structured-data
- JSON-LD Specification: https://json-ld.org/
