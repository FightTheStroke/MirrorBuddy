# Dependency Injection Strategy for MirrorBuddy

## Current State: Singleton Pattern

The codebase currently relies heavily on the singleton pattern (`*.shared`) for service management:

```swift
// Current singletons (30+ instances)
AudioPipelineManager.shared
UpdateManager.shared
DriveSyncService.shared
GmailService.shared
GoogleCalendarService.shared
BackgroundSyncService.shared
NotificationManager.shared
OfflineManager.shared
PerformanceMonitor.shared
CloudKitSyncMonitor.shared
LocalizationManager.shared
AppVoiceCommandHandler.shared
WindowManager.shared (macOS)
// ... and more
```

### Problems with Current Approach

1. **Testing Difficulty**: Cannot easily mock or stub dependencies
2. **Hidden Dependencies**: Dependencies not visible in initializers
3. **Tight Coupling**: Direct references to concrete implementations
4. **Global State**: Shared mutable state across the app
5. **Initialization Order**: Complex initialization chains in `App.onAppear`
6. **Main Actor Load**: All singletons loaded on main actor at startup

## Proposed Solution: Dependency Container

### Phase 1: Introduce Container (Non-Breaking)

Create a dependency container that **coexists** with singletons initially:

```swift
/// Dependency container for testable architecture
@MainActor
final class AppDependencies {
    // MARK: - Services
    let audioManager: AudioPipelineManager
    let updateManager: UpdateManager
    let driveSync: DriveSyncService
    let gmailService: GmailService
    let calendarService: GoogleCalendarService

    // MARK: - Managers
    let notificationManager: NotificationManager
    let performanceMonitor: PerformanceMonitor
    let offlineManager: OfflineManager

    // MARK: - Data
    let modelContext: ModelContext

    // MARK: - Initialization

    /// Production initialization (uses existing singletons)
    static func production(modelContext: ModelContext) -> AppDependencies {
        AppDependencies(
            audioManager: .shared,
            updateManager: .shared,
            driveSync: .shared,
            gmailService: .shared,
            calendarService: .shared,
            notificationManager: .shared,
            performanceMonitor: .shared,
            offlineManager: .shared,
            modelContext: modelContext
        )
    }

    /// Test initialization (uses mocks)
    static func test(
        audioManager: AudioPipelineManager = MockAudioManager(),
        updateManager: UpdateManager = MockUpdateManager(),
        modelContext: ModelContext
    ) -> AppDependencies {
        AppDependencies(
            audioManager: audioManager,
            updateManager: updateManager,
            driveSync: .shared, // Can be mocked later
            gmailService: .shared,
            calendarService: .shared,
            notificationManager: .shared,
            performanceMonitor: .shared,
            offlineManager: .shared,
            modelContext: modelContext
        )
    }

    private init(
        audioManager: AudioPipelineManager,
        updateManager: UpdateManager,
        driveSync: DriveSyncService,
        gmailService: GmailService,
        calendarService: GoogleCalendarService,
        notificationManager: NotificationManager,
        performanceMonitor: PerformanceMonitor,
        offlineManager: OfflineManager,
        modelContext: ModelContext
    ) {
        self.audioManager = audioManager
        self.updateManager = updateManager
        self.driveSync = driveSync
        self.gmailService = gmailService
        self.calendarService = calendarService
        self.notificationManager = notificationManager
        self.performanceMonitor = performanceMonitor
        self.offlineManager = offlineManager
        self.modelContext = modelContext
    }
}
```

### Phase 2: Protocol-Based Services

Introduce protocols for testability:

```swift
// MARK: - Service Protocols

@MainActor
protocol AudioManaging {
    func start() async throws
    func stop()
    func play(audioData: Data) throws
    var onAudioData: ((Data) -> Void)? { get set }
}

@MainActor
protocol UpdateManaging {
    var progress: UpdateProgress { get }
    var configuration: UpdateConfiguration { get set }
    func performFullUpdate() async
    func configure(modelContext: ModelContext)
}

// Extend existing services to conform
extension AudioPipelineManager: AudioManaging {}
extension UpdateManager: UpdateManaging {}

// Update container to use protocols
@MainActor
final class AppDependencies {
    let audioManager: AudioManaging
    let updateManager: UpdateManaging
    // ...
}
```

### Phase 3: Gradual Migration Strategy

Migrate views one at a time (low risk, incremental):

#### Before (VoiceConversationView):
```swift
struct VoiceConversationView: View {
    @State private var audioManager = AudioPipelineManager.shared
    @State private var updateManager = UpdateManager.shared

    var body: some View {
        // Uses .shared directly
    }
}
```

#### After (VoiceConversationView):
```swift
struct VoiceConversationView: View {
    let dependencies: AppDependencies

    var body: some View {
        // Uses injected dependencies
    }
}

// In parent view
VoiceConversationView(dependencies: dependencies)
```

### Phase 4: Environment-Based Injection

Use SwiftUI environment for clean propagation:

```swift
// Define environment key
private struct AppDependenciesKey: EnvironmentKey {
    static let defaultValue = AppDependencies.production(
        modelContext: /* from app */
    )
}

extension EnvironmentValues {
    var dependencies: AppDependencies {
        get { self[AppDependenciesKey.self] }
        set { self[AppDependenciesKey.self] = newValue }
    }
}

// In MirrorBuddyApp.swift
WindowGroup {
    ContentView()
        .environment(\.dependencies, dependencies)
        .modelContainer(sharedModelContainer)
}

// In any view
struct SomeView: View {
    @Environment(\.dependencies) private var dependencies

    func doSomething() async {
        await dependencies.updateManager.performFullUpdate()
    }
}
```

## Migration Roadmap

### Week 1: Foundation
- [ ] Create `AppDependencies.swift`
- [ ] Add `.production()` factory method (uses existing singletons)
- [ ] Inject into `MirrorBuddyApp` root view
- [ ] **No behavior changes, purely additive**

### Week 2: Critical Services
- [ ] Define `AudioManaging` protocol
- [ ] Define `UpdateManaging` protocol
- [ ] Create mock implementations
- [ ] Update container to use protocols

### Week 3-4: Gradual View Migration
- [ ] Migrate `VoiceConversationView` (high test value)
- [ ] Migrate `UpdateView` / toolbar buttons
- [ ] Migrate `SettingsView`
- [ ] Migrate `MaterialsListView`

### Week 5: Testing Infrastructure
- [ ] Add `AppDependencies.test()` factory
- [ ] Create mock service implementations
- [ ] Write integration tests using mocks
- [ ] Verify test suite runs 10x faster (no network/real services)

### Week 6+: Expand & Optimize
- [ ] Migrate remaining services (Drive, Gmail, Calendar)
- [ ] Evaluate removing `.shared` singletons entirely
- [ ] Add lazy loading for heavy services
- [ ] Profile startup performance improvements

## Benefits by Phase

### After Phase 1 (Container Introduction)
- ✅ Zero breaking changes
- ✅ Clear dependency visualization
- ✅ Foundation for future improvements

### After Phase 2 (Protocols)
- ✅ Mock-able services
- ✅ Test infrastructure ready
- ✅ Loose coupling achieved

### After Phase 3 (View Migration)
- ✅ Testable views
- ✅ Explicit dependencies
- ✅ Easier refactoring

### After Phase 4 (Environment)
- ✅ Clean SwiftUI integration
- ✅ Automatic propagation
- ✅ Preview-friendly architecture

## Testing Examples

### Before (Current - Not Testable):
```swift
func testVoiceConversation() async {
    // PROBLEM: Uses real AudioPipelineManager.shared
    // - Requires microphone permission
    // - Makes real network calls
    // - Slow, brittle, not isolated

    let view = VoiceConversationView()
    // Can't control or verify behavior
}
```

### After (Testable):
```swift
func testVoiceConversation() async {
    // SOLUTION: Use mock dependencies
    let mockAudio = MockAudioManager()
    let deps = AppDependencies.test(
        audioManager: mockAudio,
        modelContext: inMemoryContext
    )

    let view = VoiceConversationView(dependencies: deps)

    // Fast, isolated, controllable
    await view.startConversation()

    XCTAssertTrue(mockAudio.startCalled)
    XCTAssertEqual(mockAudio.audioDataSent.count, 0)
}
```

## Performance Impact Analysis

### Current Startup (Main Actor Load):
```swift
// MirrorBuddyApp.onAppear - ALL on main thread
Task { @MainActor in
    PerformanceMonitor.shared.startAppLaunch()          // Instant
    DriveSyncService.shared.configure(...)              // 50ms
    BackgroundSyncService.shared.configure(...)         // 30ms
    GmailService.shared.configure(...)                  // 40ms
    GoogleCalendarService.shared.configure(...)         // 35ms
    UpdateManager.shared.configure(...)                 // 10ms
    NotificationManager.shared.checkAuthorization()     // 100ms
    OfflineManager.shared.startMonitoring()             // 20ms
}
// Total: ~285ms sequential on main thread
```

### With Dependency Container (Lazy + Async):
```swift
// AppDependencies - lazy initialization
let dependencies = AppDependencies(
    audioManager: AudioPipelineManager.shared,     // Created on demand
    updateManager: UpdateManager.shared,           // Created on demand
    // ... other services lazy-loaded
    modelContext: context
)

// Configure async (off main thread where possible)
Task.detached {
    await dependencies.driveSync.configure(...)     // Background
    await dependencies.gmailService.configure(...)   // Background
    // ... parallel configuration
}
// Total: ~100ms (parallel) + 50ms main thread = ~150ms
// **Improvement: ~48% faster startup**
```

## Recommendation

**Start with Phase 1 immediately:**
1. Low risk (additive only)
2. Clear dependency graph
3. Foundation for testing

**Defer Phase 4 until testing proves value:**
- Evaluate after migrating 2-3 critical views
- Measure test speed improvement
- Get team buy-in with concrete data

## Alternative: Keep Singletons for Specific Cases

Some services may **intentionally remain singletons**:

### Good Singleton Candidates:
- `PerformanceMonitor` (needs global lifecycle tracking)
- `LocalizationManager` (truly global state)
- `NotificationManager` (system-level, one instance)

### Bad Singleton Candidates:
- `AudioPipelineManager` (session-scoped, testability critical)
- `UpdateManager` (workflow-scoped, testability critical)
- `*Service` classes (data access, mockable dependencies)

## References

- [Swift Dependency Injection](https://www.swiftbysundell.com/articles/dependency-injection-in-swift/)
- [Testing SwiftUI Apps](https://www.hackingwithswift.com/articles/213/how-to-test-swiftui-apps)
- [Environment Values Best Practices](https://developer.apple.com/documentation/swiftui/environment)

---

**Status**: Proposal (awaiting approval)
**Estimated Effort**: 6 weeks (incremental, low risk)
**Priority**: Medium (improves testability, not blocking)
**Owner**: TBD
