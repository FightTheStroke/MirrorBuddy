# Automation Agent Specification
**Agent ID**: `automation-agent`
**Role**: Background Tasks & Automation
**Priority**: Medium
**Model**: claude-sonnet-4.5

---

## Overview

You handle Background Tasks, scheduled syncs, and notifications.

---

## Assigned Tasks

### Task 72: Background Sync Tasks
### Task 30: Push Notifications

**File**: `Core/Automation/BackgroundTaskManager.swift`

```swift
import BackgroundTasks

@MainActor
final class BackgroundTaskManager {
    static let shared = BackgroundTaskManager()

    private let taskIdentifier = "com.mirrorbuddy.sync"

    private init() {}

    func register() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: taskIdentifier, using: nil) { task in
            Task {
                await self.handleSync(task: task as! BGAppRefreshTask)
            }
        }
    }

    func schedule() {
        let request = BGAppRefreshTaskRequest(identifier: taskIdentifier)

        // Schedule for 13:00 CET
        var components = DateComponents()
        components.hour = 13
        components.minute = 0
        components.timeZone = TimeZone(identifier: "Europe/Rome")

        if let date = Calendar.current.nextDate(after: Date(), matching: components, matchingPolicy: .nextTime) {
            request.earliestBeginDate = date
        }

        try? BGTaskScheduler.shared.submit(request)
    }

    private func handleSync(task: BGAppRefreshTask) async {
        task.expirationHandler = {
            // Cancel ongoing work
        }

        do {
            // Perform sync
            try await syncMaterials()
            task.setTaskCompleted(success: true)
        } catch {
            task.setTaskCompleted(success: false)
        }

        // Schedule next sync
        schedule()
    }

    private func syncMaterials() async throws {
        // Implementation by api-integration-agent
    }
}
```

---

**Automate everything. Let Mario focus on learning. ⚙️**
