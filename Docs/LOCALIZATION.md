# Localization Guide

MirrorBuddy is fully localized with Italian as the primary language and English as secondary. The app uses Xcode 15+ String Catalogs for modern, efficient localization.

## Current Languages

- 🇮🇹 **Italian (it)** - Primary/Default language
- 🇬🇧 **English (en)** - Secondary language

## File Structure

```
MirrorBuddy/
├── Resources/
│   └── Localizable.xcstrings    # String Catalog with all translations
└── Core/
    ├── Models/
    │   ├── Subject.swift          # Uses localized subject names
    │   └── UserProgress.swift     # Uses localized achievement names
    └── Utilities/
        └── LocalizationManager.swift  # Manages language switching
```

## How to Add New Strings

### 1. Add to String Catalog

Edit `MirrorBuddy/Resources/Localizable.xcstrings`:

```json
{
  "strings": {
    "your.new.key": {
      "comment": "Description of when this string is used",
      "extractionState": "manual",
      "localizations": {
        "en": {
          "stringUnit": {
            "state": "translated",
            "value": "Your English Text"
          }
        },
        "it": {
          "stringUnit": {
            "state": "translated",
            "value": "Il Tuo Testo Italiano"
          }
        }
      }
    }
  }
}
```

### 2. Use in SwiftUI Code

```swift
// For Text views
Text("your.new.key")

// For String interpolation
Text("\(String(localized: "your.new.key")) value")

// For LocalizedStringKey
.navigationTitle("your.new.key")

// For accessibility
.accessibilityLabel("your.new.key")
```

## Naming Conventions

Use dot-separated keys organized by feature:

- `dashboard.*` - Dashboard-related strings
- `materials.*` - Material management strings
- `subject.*` - Subject names
- `achievement.*` - Achievement names
- `settings.*` - Settings screen strings
- `common.*` - Common/shared strings
- `error.*` - Error messages

### Examples

```
dashboard.title
materials.empty.title
materials.empty.description
materials.add.sample
materials.add.accessibility
subject.matematica
achievement.firstMaterial
achievement.firstMaterial.desc
common.add
common.cancel
common.save
error.network.title
error.network.description
```

## How to Add a New Language

### 1. Add to String Catalog

Edit `Localizable.xcstrings` and add the new language code to all existing strings:

```json
{
  "sourceLanguage": "it",
  "strings": {
    "dashboard.title": {
      "localizations": {
        "en": { "stringUnit": { "state": "translated", "value": "MirrorBuddy" }},
        "it": { "stringUnit": { "state": "translated", "value": "MirrorBuddy" }},
        "es": { "stringUnit": { "state": "translated", "value": "MirrorBuddy" }}
      }
    }
  }
}
```

### 2. Add to LocalizationManager

Edit `LocalizationManager.swift`:

```swift
enum Language: String, CaseIterable, Identifiable {
    case italian = "it"
    case english = "en"
    case spanish = "es"  // Add new language

    var displayName: String {
        switch self {
        case .italian: return "Italiano"
        case .english: return "English"
        case .spanish: return "Español"  // Add display name
        }
    }
}
```

### 3. Test the New Language

Use Xcode scheme to test:
1. Product → Scheme → Edit Scheme...
2. Run → Options → App Language → Select your language
3. Run the app

## Testing Localizations

### Method 1: Xcode Scheme

1. Product → Scheme → Edit Scheme...
2. Run → Options → App Language
3. Select Italian or English
4. Run the app

### Method 2: Simulator Settings

1. Run app in Simulator
2. Settings → General → Language & Region
3. Add Italian or English
4. Relaunch the app

### Method 3: String Catalog Preview

1. Open `Localizable.xcstrings` in Xcode
2. Use the built-in preview to see all translations side-by-side
3. Verify completeness and context

## Translation Guidelines

### General Principles

1. **Formality**: Use informal "tu" form in Italian, appropriate for a student-facing app
2. **Clarity**: Prefer simple, direct translations over literary ones
3. **Consistency**: Use the same terms throughout (e.g., always "materiale" not "documento")
4. **Context**: Add comments to explain when/where strings are used
5. **Length**: Try to keep translations similar in length to avoid UI overflow

### Specific Terms

| English | Italian | Notes |
|---------|---------|-------|
| Material | Materiale | Study material/document |
| Mind Map | Mappa Mentale | Visual concept map |
| Flashcard | Flashcard | Keep in English, widely understood |
| Subject | Materia | School subject |
| Achievement | Obiettivo/Traguardo | Gamification achievement |
| Study | Studiare | Verb form as needed |
| Review | Ripassare | For flashcard review |

### Subject Names (DO NOT TRANSLATE)

Mario's subjects should keep their Italian names even in English version:
- Educazione Civica → "Civic Education" ✓
- Scienze Motorie → "Physical Education" ✓
- Storia e Geografia → "History and Geography" ✓

But **SOSTEGNO** stays as "Support" in English.

### Accessibility Labels

Always provide clear, descriptive labels:

```swift
Button("materials.add") {
    // ...
}
.accessibilityLabel("materials.add.accessibility")  // "Add study material"
.accessibilityHint("materials.add.hint")  // "Double tap to add"
```

## Dynamic Language Switching

The app uses `LocalizationManager` for runtime language switching:

```swift
import SwiftUI

struct SettingsView: View {
    @Environment(\.localizationManager) var localizationManager

    var body: some View {
        Picker("Language", selection: $localizationManager.currentLanguage) {
            ForEach(LocalizationManager.Language.allCases) { language in
                Text(language.displayName).tag(language)
            }
        }
    }
}
```

Language preference is automatically saved to UserDefaults.

## Common Issues

### Issue: String not localizing

**Solution**: Check that:
1. Key exists in `Localizable.xcstrings`
2. Both `it` and `en` translations exist
3. Key is used correctly: `Text("your.key")` not `Text(verbatim: "your.key")`

### Issue: Xcode not finding strings

**Solution**:
1. Clean build folder (Cmd+Shift+K)
2. Rebuild (Cmd+B)
3. Verify `Localizable.xcstrings` is included in target

### Issue: Wrong language showing

**Solution**:
1. Check Simulator/Device language settings
2. Check Xcode scheme settings
3. Delete app and reinstall

## Best Practices

1. ✅ **Always add both IT and EN** translations at the same time
2. ✅ **Use comments** to provide context for translators
3. ✅ **Group related strings** with consistent prefixes
4. ✅ **Test both languages** before committing
5. ✅ **Keep keys semantic** (e.g., `materials.empty.title` not `emptyText1`)
6. ❌ **Never hardcode strings** in views - always use localization
7. ❌ **Don't use `Text(verbatim:)`** unless displaying user content
8. ❌ **Don't translate technical terms** like API names or code

## Statistics

Current localization coverage:
- ✅ Italian: 100% (primary language)
- ✅ English: 100%
- 📊 Total strings: ~60
- 📊 Localized models: Subject (11), Achievement (7)
- 📊 Localized views: ContentView

## Future Languages

To add more languages in the future:
1. Add language code to all strings in `Localizable.xcstrings`
2. Add to `LocalizationManager.Language` enum
3. Test thoroughly
4. Update this documentation

Potential languages based on user base:
- 🇪🇸 Spanish
- 🇫🇷 French
- 🇩🇪 German
- 🇵🇹 Portuguese
