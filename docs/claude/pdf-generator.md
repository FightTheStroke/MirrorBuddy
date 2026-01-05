# PDF Generator - Accessible Study Materials

Generate accessible PDFs optimized for 7 DSA profiles from Study Kit content.

## DSA Profiles

| Profile | Italian | Key Features |
|---------|---------|--------------|
| `dyslexia` | Dislessia | Large font (18pt), 1.8x line height, warm background (#fffbeb) |
| `dyscalculia` | Discalculia | Colored operators, grid lines, step-by-step math |
| `dysgraphia` | Disgrafia | Structured layout, 2.0x line height, border boxes |
| `dysorthography` | Disortografia | Syllable highlights, spelling patterns, colored word parts |
| `adhd` | DOP/ADHD | Distraction-free, clear sections, progress indicators |
| `dyspraxia` | Disprassia | Chunked text, reading time estimates, pause markers |
| `stuttering` | Balbuzie | Short sentences, breathing marks, rhythmic layout |

## Architecture

| Layer | File | Purpose |
|-------|------|---------|
| Types | `src/lib/pdf-generator/types.ts` | DSAProfile, ProfileConfig, PDFGeneratorRequest |
| Profiles | `src/lib/pdf-generator/profiles/index.ts` | 7 profile configurations |
| Styles | `src/lib/pdf-generator/utils/style-generator.ts` | generateStyles(), getColorScheme() |
| Content | `src/lib/pdf-generator/utils/content-extractor.ts` | extractStudyKitContent(), estimateReadingTime() |
| Components | `src/lib/pdf-generator/components/*.tsx` | PDFDocument, PDFText, PDFTitle, PDFList, PDFImage |
| Generator | `src/lib/pdf-generator/generate.ts` | generateAccessiblePDF(), generatePDFFromContent() |
| API | `src/app/api/pdf-generator/route.ts` | POST (generate), GET (profiles) |
| UI | `src/components/study-kit/ExportPDFModal.tsx` | Profile selection modal |

## API Endpoints

### POST /api/pdf-generator

Generate accessible PDF from Study Kit.

```typescript
// Request
{
  kitId: string;           // Study Kit ID (required)
  materialId?: string;     // Specific material only
  profile: DSAProfile;     // One of 7 profiles (required)
  format?: 'A4' | 'Letter'; // Default: 'A4'
}

// Response: PDF binary with headers
// Content-Type: application/pdf
// Content-Disposition: attachment; filename="Title_DSA_Dislessia.pdf"
// X-Saved-To-Zaino: true/false
```

### GET /api/pdf-generator

Get available profiles for UI.

```typescript
// Response
{
  success: true,
  profiles: [
    { value: 'dyslexia', label: 'Dislessia', description: '...' },
    // ...7 profiles
  ]
}
```

## Profile Configuration

Each profile in `profiles/index.ts` has:

```typescript
interface ProfileConfig {
  name: DSAProfile;
  nameIt: string;           // Italian name
  description: string;
  fontFamily: 'Helvetica';  // Built-in PDF font
  fontSize: number;         // 14-18pt
  lineHeight: number;       // 1.6-2.0
  letterSpacing: number;    // 0.04-0.12
  wordSpacing: number;      // 0.08-0.16
  backgroundColor: string;  // Hex color
  textColor: string;        // Hex color
  paragraphSpacing: number; // 20-28pt
  headingScale: number;     // 1.3-1.4
  options: ProfileOptions;  // Profile-specific flags
}
```

## Zaino Integration

PDFs are automatically saved to student's Zaino (backpack):

```typescript
// In API route (lines 119-145)
await prisma.material.create({
  data: {
    userId,
    toolId: `pdf-${kitId}-${profile}-${Date.now()}`,
    toolType: 'pdf-export',
    title: filename,
    content: JSON.stringify({ sourceKitId, dsaProfile, format, size }),
    subject: studyKit.subject,
    preview: `PDF accessibile per ${profile}`,
  },
});
```

## UI Components

### ExportPDFModal

Located at `src/components/study-kit/ExportPDFModal.tsx`:

- Profile selection grid (7 DSA profiles)
- Format selection (A4/Letter)
- Loading state during generation
- Toast notifications (success/error)
- Auto-download on completion

## Testing

```bash
# Run unit tests (123 tests)
npx vitest run src/lib/pdf-generator/__tests__/

# Test files:
# - profiles.test.ts (63 tests) - Profile configurations
# - generate.test.ts (19 tests) - isValidProfile, getAvailableProfiles
# - content-extractor.test.ts (15 tests) - estimateReadingTime
# - style-generator.test.ts (26 tests) - generateStyles, getColorScheme
```

## Dependencies

- `@react-pdf/renderer` v4.1.5 - PDF generation
- Prisma - Zaino storage
- Built-in fonts: Helvetica (no custom font loading required)

## Accessibility Fonts (Future)

Prepared in `public/fonts/` for future enhancement:
- OpenDyslexic-Regular.ttf
- ComicSansMS.ttf
- Verdana.ttf

Currently using Helvetica (built-in) for all profiles.
