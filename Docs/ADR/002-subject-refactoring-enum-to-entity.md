# ADR-002: Subject Refactoring from Enum to Database Entity

**Date**: 2025-10-21
**Status**: Accepted
**Deciders**: Roberto (Developer)
**Context**: Task 83 - Subject System Refactoring

---

## Context and Problem Statement

The original MirrorBuddy design used a Swift `enum Subject` with hardcoded Italian school subjects (Matematica, Fisica, Italiano, etc.). This approach had significant limitations:

1. **No Extensibility**: Users cannot add custom subjects (e.g., "Violino", "Scacchi", "Programmazione")
2. **No User Preferences**: Cannot mark subjects as active/inactive based on user's school curriculum
3. **Hardcoded Localization**: Subject names were hardcoded in Italian, making internationalization difficult
4. **Data Coupling**: All features (Materials, Tasks, MindMaps, Flashcards) were tightly coupled to the enum
5. **No Persistence**: Enum cases cannot store metadata like colors, icons, sort order, or user customizations

**Problem**: How do we make subjects flexible, user-customizable, and localizable while maintaining data integrity and type safety?

---

## Decision Drivers

1. **User Customization**: Mario needs to add subjects not in the standard curriculum (music lessons, chess, coding)
2. **Internationalization**: App must support English and Italian (Task 82)
3. **Data Integrity**: All existing Materials and Tasks must migrate seamlessly
4. **Type Safety**: Maintain compile-time safety where possible
5. **Performance**: Subject queries are frequent - must be fast
6. **Maintainability**: Clear migration path without breaking existing features
7. **Accessibility**: Support dyslexia-friendly customization (colors, icons)

---

## Considered Options

### Option 1: Keep Enum, Add Custom Subject String (REJECTED)
```swift
enum Subject {
    case matematica, fisica, italiano, ...
    case custom(String)
}
```

**Pros**:
- Minimal code changes
- Keeps type safety for built-in subjects

**Cons**:
- Cannot persist custom subject metadata (colors, icons, sort order)
- No way to mark subjects as active/inactive
- Awkward pattern matching with `.custom` case
- Localization still problematic
- Cannot query or filter custom subjects efficiently

### Option 2: Protocol-Based Subject System (REJECTED)
```swift
protocol Subject {
    var id: String { get }
    var displayName: String { get }
    var color: Color { get }
}

enum BuiltInSubject: Subject { ... }
struct CustomSubject: Subject { ... }
```

**Pros**:
- Type-safe polymorphism
- Clear separation of built-in vs custom

**Cons**:
- Complex type erasure for SwiftData relationships
- Difficult to query across different subject types
- Migration complexity
- Over-engineered for the use case

### Option 3: SwiftData @Model SubjectEntity (CHOSEN)
```swift
@Model
final class SubjectEntity {
    var id: UUID
    var localizationKey: String // "subject.matematica"
    var displayName: String      // Computed from localization
    var iconName: String
    var colorName: String
    var sortOrder: Int
    var isActive: Bool
    var isCustom: Bool
}
```

**Pros**:
- Full CRUD operations - users can add/edit/delete subjects
- Metadata persistence (colors, icons, sort order, active state)
- Localization via `localizationKey` + LocalizationManager
- Efficient SwiftData queries and relationships
- CloudKit sync support out of the box
- Clear migration path with SubjectService and DataMigrationService
- Works seamlessly with @Query in SwiftUI

**Cons**:
- Slightly more complex than enum (but manageable)
- Requires data migration for existing records
- No compile-time enforcement of subject validity
- Potential for orphaned records if not handled carefully

---

## Decision Outcome

**Chosen Option**: Option 3 - SwiftData @Model SubjectEntity

### Implementation Details

**1. Core Model (SubjectEntity.swift)**:
```swift
@Model
final class SubjectEntity {
    var id = UUID()
    var localizationKey: String    // "subject.matematica"
    var iconName: String           // "function"
    var colorName: String          // "blue"
    var sortOrder: Int             // Display order
    var isActive: Bool = true      // User can hide subjects
    var isCustom: Bool = false     // Built-in vs user-created

    var displayName: String {
        LocalizationManager.shared.localizedString(for: localizationKey)
    }
}
```

**2. Service Layer (SubjectService.swift)**:
- `initializeDefaultSubjects()` - Seeds 11 built-in Italian school subjects
- `getAllSubjects()` - Fetch all subjects sorted by `sortOrder`
- `getActiveSubjects()` - Fetch only active subjects
- `createCustomSubject()` - User-defined subjects
- `updateSubject()`, `deleteSubject()` - Full CRUD

**3. Data Migration (DataMigrationService.swift)**:
- Detects Materials/Tasks without subject relationships
- Uses `SubjectDetectionService` for keyword-based auto-detection
- Assigns "Other" subject as fallback
- Runs automatically on app launch if needed
- Logs migration statistics

**4. Subject Detection (SubjectDetectionService.swift)**:
- Keyword matching for auto-assigning subjects from text
- Updated to work with `SubjectEntity` instead of `Subject` enum
- Supports custom subjects via fallback keyword matching

**5. Localization Integration**:
- Built-in subjects use localization keys (e.g., `"subject.matematica"`)
- Custom subjects store direct names (e.g., `"Violino"`)
- `LocalizationManager` provides dynamic translation
- Future: Support for localizing custom subject names

---

## Consequences

### Positive

1. **User Flexibility**: Users can add unlimited custom subjects (music, sports, hobbies, tutoring)
2. **Curriculum Adaptation**: Mark irrelevant subjects as inactive (e.g., hide "Religione" if not applicable)
3. **Internationalization Ready**: Localization keys enable seamless English/Italian switching
4. **Rich Metadata**: Each subject has color, icon, and display order - improves UX
5. **CloudKit Sync**: Subject preferences sync across user's devices automatically
6. **Future-Proof**: Easy to add features like subject-specific settings, stats, or achievements
7. **Clean Data Model**: First-class relationships with Material, Task, Flashcard, MindMap
8. **Type-Safe Queries**: SwiftUI `@Query` works beautifully with `SubjectEntity`
9. **Migration Safety**: Comprehensive migration ensures no data loss

### Negative

1. **Migration Complexity**: Requires careful migration of existing data (mitigated by `DataMigrationService`)
2. **No Compile-Time Checks**: Cannot enforce valid subjects at compile time (trade-off for flexibility)
3. **Potential Orphans**: Deleting subjects requires handling dependent records (mitigated by `deleteRule: .nullify`)
4. **Increased Storage**: Each subject is a database record vs zero-cost enum (negligible impact)
5. **Query Overhead**: Fetching subjects requires database query vs enum lookup (cached in practice)
6. **Learning Curve**: New developers must understand SwiftData relationships vs simple enum

### Migration Impact

**Files Modified (Task 83.1-83.5)**:
- `SubjectEntity.swift` - New model
- `SubjectService.swift` - New service layer
- `SubjectDetectionService.swift` - Updated for entity support
- `DataMigrationService.swift` - New migration service
- `MirrorBuddyApp.swift` - Initialize subjects and run migration
- `TaskListView.swift` - Use `@Query` for subjects
- `ContextManager.swift` - Store `SubjectEntity` instead of enum
- `NaturalLanguageTaskParser.swift` - Accept `availableSubjects` parameter

**Files Pending (Task 83.3, deferred as complex)**:
- `SubjectSettingsView.swift` - Full CRUD UI for subjects (not yet implemented)

**Testing Results**:
- ✅ All builds succeed (0 compilation errors)
- ✅ SwiftLint: 0 violations maintained
- ✅ Migration service tested with auto-detection
- ✅ CloudKit sync integration verified

---

## Lessons Learned

1. **Enum Limitations**: Enums are great for fixed, compile-time sets but poor for user-customizable data
2. **SwiftData Strengths**: @Model makes complex data relationships trivial
3. **Migration First**: Design migration strategy before implementing breaking changes
4. **Service Pattern**: SubjectService abstraction makes testing and refactoring easier
5. **Localization Design**: Separating localization keys from display names enables flexibility

---

## Future Considerations

1. **Subject Groups**: Group subjects by category (STEM, Humanities, Arts, Sports)
2. **Subject Icons**: Allow users to choose from icon picker or upload custom icons
3. **Subject Statistics**: Track time spent, completion rates, difficulty ratings per subject
4. **Subject Schedules**: Integrate with calendar for subject-specific timetables
5. **Subject Coaching**: Customize AI coach personality per subject (stricter for Math, encouraging for Arts)
6. **Multi-Language Custom Subjects**: Allow users to translate custom subject names

---

## References

- **Task 83**: Subject Refactoring Epic
- **Task 82**: Localization Epic
- **SOLID Principles**: Single Responsibility (SubjectService), Open/Closed (extensible subjects)
- **DDD Pattern**: SubjectEntity is an aggregate root in the Learning domain
- **SwiftData Best Practices**: @Model with relationships, deleteRule strategies

---

**Related Decisions**:
- ADR-001: Technology Stack (SwiftData chosen for data persistence)
- ADR-003 (Future): Localization Strategy (pending full English translation)

**Reviewed**: 2025-10-21
**Next Review**: After Task 83.6 completion and production deployment
