# Dashboard Redesign - Design Specification
> Task 137.2: Detailed design specification for new dashboard layout
> Date: October 18, 2025
> Based on: DASHBOARD_UX_ANALYSIS.md pain points

## Executive Summary

This specification defines the redesigned dashboard that addresses all 8 identified UX pain points with a focus on processing status visibility, material state distinction, and personalized daily priorities.

## Design Principles

1. **Status First**: Always show what's happening and what's ready
2. **Contextual Priority**: Surface the most relevant materials for today
3. **Progressive Disclosure**: Start with essentials, reveal details on demand
4. **Consistent Patterns**: Use familiar iOS patterns (grouped lists, cards, badges)
5. **Performance**: Lazy loading, efficient queries, smooth animations

## Information Architecture

```
DashboardView (Redesigned)
├── ProcessingStatusBanner (conditional)
├── ScrollView
│   ├── TodayCard
│   ├── InLavorazioneSection (conditional)
│   ├── ProntePerStudiareSection
│   ├── DaAscoltareSection (conditional)
│   └── TuttiIMaterialiSection (collapsible)
└── FloatingActionButtons (existing)
```

## Component Specifications

### 1. ProcessingStatusBanner

**Purpose**: Real-time feedback during material processing

**Visibility Rules**:
- Show when ANY material has `processingStatus == .processing`
- Hide when all materials are `.completed` or `.failed`
- Auto-dismiss after 3 seconds once processing completes

**Layout**:
```swift
HStack {
    ProgressView()
        .controlSize(.small)

    VStack(alignment: .leading) {
        Text("Elaborazione in corso")
            .font(.subheadline)
            .fontWeight(.semibold)

        Text("Sto generando mappe mentali per [materialName]")
            .font(.caption)
            .foregroundStyle(.secondary)
    }

    Spacer()

    Button("Dettagli") {
        // Show processing detail sheet
    }
}
.padding()
.background(.thinMaterial)
.clipShape(RoundedRectangle(cornerRadius: 12))
.shadow(radius: 4)
.transition(.move(edge: .top).combined(with: .opacity))
```

**Behavior**:
- Animate in/out with slide from top
- Update text dynamically as different materials process
- Show count if multiple materials processing: "Elaborazione 3 materiali..."
- Tappable to show detailed processing status modal

### 2. TodayCard

**Purpose**: Personalized daily priorities and quick actions

**Data Sources**:
- Materials with upcoming deadlines (within 7 days)
- Materials recently accessed (last 3 days)
- Materials ready for spaced repetition review
- Study streak from UserDefaults/SwiftData

**Layout**:
```swift
VStack(alignment: .leading, spacing: 16) {
    // Header
    HStack {
        Image(systemName: "sun.max.fill")
            .foregroundStyle(.orange)
        Text("Oggi")
            .font(.title2)
            .fontWeight(.bold)
        Spacer()
        Text(Date().formatted(date: .abbreviated, time: .omitted))
            .font(.caption)
            .foregroundStyle(.secondary)
    }

    // Priority Materials (max 3)
    ForEach(todayPriorities) { material in
        TodayMaterialRow(material: material)
    }

    // Quick Stats
    HStack(spacing: 20) {
        StatBadge(icon: "flame", value: "\(studyStreak)", label: "giorni")
        StatBadge(icon: "checkmark.circle", value: "\(completedToday)", label: "oggi")
        StatBadge(icon: "target", value: "\(upcomingDeadlines)", label: "scadenze")
    }

    // Voice Coach Quick Launch
    VoiceCoachQuickLaunch()
}
.padding()
.background(
    LinearGradient(
        colors: [.blue.opacity(0.1), .purple.opacity(0.1)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
)
.clipShape(RoundedRectangle(cornerRadius: 16))
```

**Priority Algorithm**:
```swift
func calculateTodayPriorities() -> [Material] {
    let now = Date()

    return materials
        .filter { $0.processingStatus == .completed }
        .sorted { material1, material2 in
            let score1 = calculatePriorityScore(material1, now: now)
            let score2 = calculatePriorityScore(material2, now: now)
            return score1 > score2
        }
        .prefix(3)
        .map { $0 }
}

func calculatePriorityScore(_ material: Material, now: Date) -> Double {
    var score = 0.0

    // Deadline proximity (highest priority)
    if let deadline = material.tasks?.first?.dueDate {
        let daysUntil = Calendar.current.dateComponents([.day], from: now, to: deadline).day ?? 999
        if daysUntil <= 0 {
            score += 100 // Overdue!
        } else if daysUntil <= 1 {
            score += 80 // Due today/tomorrow
        } else if daysUntil <= 7 {
            score += 40 // Due this week
        }
    }

    // Has study assets ready
    if material.mindMap != nil {
        score += 20
    }
    if !(material.flashcards?.isEmpty ?? true) {
        score += 15
    }

    // Recent activity
    if let lastAccessed = material.lastAccessedAt {
        let daysAgo = Calendar.current.dateComponents([.day], from: lastAccessed, to: now).day ?? 999
        if daysAgo <= 1 {
            score += 10 // Recently studied
        }
    }

    // New material (never accessed)
    if material.lastAccessedAt == nil {
        score += 25
    }

    return score
}
```

### 3. InLavorazioneSection

**Purpose**: Show materials currently being processed

**Query**:
```swift
let descriptor = FetchDescriptor<Material>(
    predicate: #Predicate { material in
        material.processingStatus == .processing ||
        material.processingStatus == .pending
    },
    sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
)
```

**Layout**:
```swift
if !processingMaterials.isEmpty {
    VStack(alignment: .leading, spacing: 12) {
        SectionHeader(
            icon: "gearshape.2",
            title: "In Lavorazione",
            count: processingMaterials.count,
            color: .orange
        )

        ForEach(processingMaterials) { material in
            ProcessingMaterialCard(material: material)
        }
    }
}
```

**ProcessingMaterialCard Design**:
- Horizontal layout with thumbnail, title, progress indicator
- Real-time progress bar showing processing step
- Current step text: "Generazione mappa mentale..."
- Estimated time remaining (if available)

### 4. ProntePerStudiareSection

**Purpose**: Materials with complete study assets ready to use

**Query**:
```swift
let descriptor = FetchDescriptor<Material>(
    predicate: #Predicate { material in
        material.processingStatus == .completed &&
        (material.mindMap != nil || !(material.flashcards?.isEmpty ?? true))
    },
    sortBy: [SortDescriptor(\.lastAccessedAt, order: .reverse)]
)
```

**Layout**:
```swift
VStack(alignment: .leading, spacing: 12) {
    SectionHeader(
        icon: "checkmark.circle.fill",
        title: "Pronte per Studiare",
        count: readyMaterials.count,
        color: .green
    )

    // Grid layout for ready materials
    LazyVGrid(columns: [
        GridItem(.flexible()),
        GridItem(.flexible())
    ], spacing: 16) {
        ForEach(readyMaterials) { material in
            MaterialCardView(material: material) {
                // Navigate to detail
            }
        }
    }
}
```

**Visual Indicators**:
- Green checkmark badge overlay
- Show asset icons: brain (mind map), cards (flashcards)
- Subtle glow effect on tap

### 5. DaAscoltareSection

**Purpose**: Materials with audio transcripts or voice lessons

**Query**:
```swift
let descriptor = FetchDescriptor<Material>(
    predicate: #Predicate { material in
        material.transcript != nil ||
        !(material.voiceConversations?.isEmpty ?? true)
    },
    sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
)
```

**Layout**:
```swift
if !audioMaterials.isEmpty {
    VStack(alignment: .leading, spacing: 12) {
        SectionHeader(
            icon: "waveform",
            title: "Da Ascoltare",
            count: audioMaterials.count,
            color: .blue
        )

        // Horizontal scroll for audio materials
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(audioMaterials) { material in
                    AudioMaterialCard(material: material)
                }
            }
            .padding(.horizontal)
        }
    }
}
```

**AudioMaterialCard Design**:
- Compact card (200pt wide)
- Waveform visualization or audio icon
- Duration label
- Play button overlay

### 6. TuttiIMaterialiSection

**Purpose**: Complete material library with grouping options

**States**:
- Collapsed by default (show count only)
- Expanded shows subject-grouped materials
- Search and filter options when expanded

**Layout (Collapsed)**:
```swift
Button {
    withAnimation {
        isExpanded.toggle()
    }
} label: {
    HStack {
        Image(systemName: "folder")
        Text("Tutti i Materiali")
            .font(.headline)
        Spacer()
        Text("\(allMaterials.count)")
            .foregroundStyle(.secondary)
        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
    }
    .padding()
    .background(.thinMaterial)
    .clipShape(RoundedRectangle(cornerRadius: 12))
}
```

**Layout (Expanded)**:
```swift
VStack(alignment: .leading, spacing: 16) {
    // Search and filters
    SearchAndFilterBar()

    // Subject groups
    ForEach(subjects) { subject in
        SubjectMaterialsGroup(subject: subject)
    }
}
```

## Component Reuse

### Existing Components to Reuse
- `MaterialCardView`: Already has processing status badges ✅
- `SubjectBadge`: Subject color coding ✅
- `ContextBannerView`: Can be repurposed for processing banner ✅

### New Components to Create
- `TodayCard`: Brand new priority card
- `TodayMaterialRow`: Compact material row for Today card
- `StatBadge`: Study statistics badges
- `VoiceCoachQuickLaunch`: Quick access to voice coach
- `SectionHeader`: Consistent section headers with icons
- `ProcessingMaterialCard`: Processing status card
- `AudioMaterialCard`: Audio material card

## State Management

```swift
@Observable
final class DashboardViewModel {
    // Data
    var materials: [Material] = []
    var processingMaterials: [Material] = []
    var readyMaterials: [Material] = []
    var audioMaterials: [Material] = []
    var todayPriorities: [Material] = []

    // UI State
    var isExpanded = false
    var showProcessingBanner = false
    var processingMessage = ""

    // Statistics
    var studyStreak: Int = 0
    var completedToday: Int = 0
    var upcomingDeadlines: Int = 0

    func refresh(context: ModelContext) async {
        // Fetch all materials
        materials = try? context.fetch(FetchDescriptor<Material>())

        // Categorize
        processingMaterials = materials.filter {
            $0.processingStatus != .completed
        }
        readyMaterials = materials.filter {
            $0.processingStatus == .completed &&
            ($0.mindMap != nil || !($0.flashcards?.isEmpty ?? true))
        }
        audioMaterials = materials.filter {
            $0.transcript != nil || !($0.voiceConversations?.isEmpty ?? true)
        }

        // Calculate priorities
        todayPriorities = calculateTodayPriorities()

        // Update statistics
        updateStatistics()

        // Processing banner
        showProcessingBanner = !processingMaterials.isEmpty
        if let processing = processingMaterials.first {
            processingMessage = "Sto elaborando \(processing.title)..."
        }
    }
}
```

## Accessibility

### VoiceOver Support
- All sections have clear headings with `.accessibilityAddTraits(.isHeader)`
- Processing status announced: "Material being processed: [name]"
- Today priorities announced with context: "Priority 1: [name], due tomorrow"
- Section counts announced: "Ready to study, 5 materials"

### Dynamic Type
- All text uses standard text styles (`.headline`, `.body`, `.caption`)
- Cards use `.minimumScaleFactor(0.8)` to prevent overflow
- Maximum scale: `.dynamicTypeSize(...DynamicTypeSize.xxxLarge)`

### Color Contrast
- Processing badge: Orange on light background (4.5:1 contrast)
- Ready badge: Green checkmark with white fill (7:1 contrast)
- Audio badge: Blue on light background (4.5:1 contrast)

### Touch Targets
- All interactive elements: minimum 44×44pt
- Card spacing: minimum 12pt between cards
- Section headers: Full width tappable for expansion

## Performance Optimization

### Lazy Loading
- Use `LazyVGrid` for material grids
- Use `LazyVStack` for long material lists
- Load thumbnails asynchronously with placeholders

### Efficient Queries
- Separate fetch descriptors for each section
- Use `#Predicate` macros for SwiftData optimization
- Batch size limits: max 20 materials per section initially

### Animation Performance
- Use `.animation(.easeInOut(duration: 0.3))` for smooth transitions
- Avoid animating large lists (use `.animation(nil)`)
- Prefer `.transition(.opacity)` over complex transitions

## Dark Mode Support

### Colors
- Processing banner: `.thinMaterial` adapts automatically
- Section backgrounds: `.secondarySystemGroupedBackground`
- Badges: Semi-transparent with blur effect
- Gradients: Adjust opacity in dark mode (0.2 → 0.1)

### Shadows
- Light mode: `Color.black.opacity(0.1)`
- Dark mode: `Color.black.opacity(0.4)`
- Conditional: `colorScheme == .dark ? 0.4 : 0.1`

## Implementation Phases

### Phase 1: Core Structure (Current Sprint)
1. Create new `DashboardViewRedesigned.swift` file
2. Implement `DashboardViewModel` with data categorization
3. Build `TodayCard` component
4. Build section headers and basic layout

### Phase 2: Processing Status (Current Sprint)
1. Implement `ProcessingStatusBanner` with real-time updates
2. Create `ProcessingMaterialCard` component
3. Hook into MaterialProcessingPipeline progress callbacks

### Phase 3: Material Sections (Current Sprint)
1. Implement "Pronte per Studiare" grid
2. Implement "Da Ascoltare" horizontal scroll
3. Implement "Tutti i Materiali" collapsible section

### Phase 4: Polish & Testing (Next Sprint)
1. Add animations and transitions
2. Implement search and filtering
3. Accessibility testing
4. Performance profiling
5. User testing with Mario

## Success Metrics

### User Experience
- Time to find material: < 5 seconds (vs 15s current)
- Processing awareness: 100% users understand what's happening
- Daily engagement: +30% through Today card

### Technical
- View rendering time: < 100ms
- Smooth 60fps scrolling on iPhone SE (oldest target)
- Memory usage: < 50MB for dashboard alone

## Migration Strategy

1. **Parallel Development**: Build new dashboard alongside existing
2. **Feature Flag**: Add `useRedesignedDashboard` toggle in Settings
3. **A/B Testing**: Roll out to 50% of users first
4. **Feedback Loop**: Collect user feedback for 2 weeks
5. **Full Rollout**: Replace old dashboard completely

## Files to Create/Modify

### New Files
- `DashboardViewRedesigned.swift` (main view)
- `DashboardViewModel.swift` (observable state)
- `TodayCard.swift` (today priorities)
- `ProcessingStatusBanner.swift` (processing feedback)
- `SectionHeader.swift` (reusable headers)

### Files to Modify
- `MainTabView.swift` - Switch dashboard view
- `DashboardView.swift` - Rename to `DashboardViewLegacy.swift`
- `MaterialCardView.swift` - Add processing state animations

---

**Status**: Ready for implementation
**Next Step**: Begin Phase 1 implementation
**Owner**: Task 137.2
**Review**: UX team approval required before Phase 4

