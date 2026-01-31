# PDF Generator

> Accessible PDF generation pipeline for DSA students with 7 profile-specific formatting presets.

## Quick Reference

| Key       | Value                               |
| --------- | ----------------------------------- |
| Path      | `src/lib/pdf-generator/`            |
| API Route | `POST /api/pdf-generator`           |
| Renderer  | `@react-pdf/renderer` (server-side) |
| Profiles  | 7 DSA profiles                      |
| Auth      | `validateAuth()` required           |

## DSA Profiles

| Profile          | Key Features                                           |
| ---------------- | ------------------------------------------------------ |
| `dyslexia`       | OpenDyslexic font, warm background, extra spacing      |
| `dyscalculia`    | Large numbers, colored operators, grid lines           |
| `dysgraphia`     | Border boxes, structured layout, medium weight         |
| `dysorthography` | Underline patterns, syllable highlight, spelling hints |
| `adhd`           | Distraction-free, clear sections, short paragraphs     |
| `dyspraxia`      | Syllable underlines, reading time, pause markers       |
| `stuttering`     | Short sentences, breathing marks, rhythmic layout      |

## Architecture

The pipeline: **Study Kit -> Content Extractor -> Profile Styles -> React-PDF Components -> Buffer**.

`extractStudyKitContent()` parses Study Kit JSON (summary, mindmap, quiz) into `ContentSection[]`. Profile configs define font, spacing, colors, and DSA-specific options. React-PDF components render the styled document server-side via `renderToBuffer()`.

PDFs are returned as binary responses (not stored). Metadata is saved to the `Material` table for the student's Zaino (backpack).

## Key Files

| File                         | Purpose                                           |
| ---------------------------- | ------------------------------------------------- |
| `generate.ts`                | `generateAccessiblePDF()` main entry point        |
| `types.ts`                   | `DSAProfile`, `ProfileConfig`, `ExtractedContent` |
| `profiles/index.ts`          | 7 profile configurations with font/spacing/color  |
| `components/PDFDocument.tsx` | Root React-PDF document component                 |
| `components/PDFTitle.tsx`    | Profile-aware title rendering                     |
| `components/PDFText.tsx`     | Profile-aware text with spacing                   |
| `utils/content-extractor.ts` | Study Kit JSON to `ContentSection[]`              |
| `utils/style-generator.ts`   | Profile config to PDF stylesheet                  |
| `utils/summary-parser.ts`    | Summary content parser                            |
| `utils/mindmap-parser.ts`    | Mindmap content parser                            |
| `utils/quiz-parser.ts`       | Quiz content parser                               |

## Code Patterns

```typescript
// Generate PDF from Study Kit
import { generateAccessiblePDF, isValidProfile } from "@/lib/pdf-generator";

if (isValidProfile(profile)) {
  const { buffer, filename, size } = await generateAccessiblePDF({
    kitId: "kit-123",
    profile: "dyslexia",
    format: "A4",
    studentId: userId,
    studyKit: studyKitData, // pass directly to avoid fetch
  });
}

// Get available profiles for UI
import { getAvailableProfiles } from "@/lib/pdf-generator";
const profiles = getAvailableProfiles(); // { value, label, description }[]
```

## API

```
POST /api/pdf-generator  -> Binary PDF (Content-Type: application/pdf)
  Body: { kitId, profile, format?, materialId? }
  Headers: X-Saved-To-Zaino: true|false

GET  /api/pdf-generator  -> { success, profiles[] }
```

## See Also

- `src/app/api/pdf-generator/route.ts` - API route handler
- `src/lib/accessibility/` - DSA profile definitions (runtime)
- `docs/claude/tools.md` - Study Kit tool pipeline
