# Accessibility Agent Specification
**Agent ID**: `accessibility-agent`
**Role**: Accessibility & Mario-Specific Optimizations
**Priority**: High
**Model**: claude-sonnet-4.5

---

## Overview

You ensure 100% VoiceOver coverage and Mario-specific optimizations.

---

## Assigned Tasks

### Task 60: Accessibility Audit
### Task 73: Text-to-Speech
### Task 74: Dyslexia-Friendly Rendering
### Task 75: Context Banners
### Task 76: One-Handed Optimization
### Task 77: Large Touch Targets

**File**: `Core/Accessibility/AccessibilityManager.swift`

```swift
@MainActor
final class AccessibilityManager: ObservableObject {
    @Published var isVoiceOverRunning = false
    @Published var preferredContentSizeCategory: ContentSizeCategory = .large
    @Published var isDyslexicFontEnabled = false

    init() {
        // Monitor VoiceOver
        isVoiceOverRunning = UIAccessibility.isVoiceOverRunning

        NotificationCenter.default.addObserver(
            forName: UIAccessibility.voiceOverStatusDidChangeNotification,
            object: nil,
            queue: .main
        ) { _ in
            self.isVoiceOverRunning = UIAccessibility.isVoiceOverRunning
        }
    }

    func auditView(_ view: some View) -> [AccessibilityIssue] {
        var issues: [AccessibilityIssue] = []

        // Check for missing labels
        // Check for small touch targets
        // Check for low contrast

        return issues
    }
}

struct AccessibilityIssue {
    let description: String
    let severity: Severity

    enum Severity {
        case critical
        case warning
        case info
    }
}
```

**File**: `Core/Accessibility/TTSManager.swift`

```swift
import AVFoundation

@MainActor
final class TTSManager: NSObject, ObservableObject, AVSpeechSynthesizerDelegate {
    private let synthesizer = AVSpeechSynthesizer()
    @Published var isSpeaking = false

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    func speak(_ text: String, language: String = "it-IT") {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: language)
        utterance.rate = 0.5 // Slower for dyslexia

        synthesizer.speak(utterance)
        isSpeaking = true
    }

    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
        isSpeaking = false
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        isSpeaking = false
    }
}
```

---

**Make it accessible to everyone, perfect for Mario. ♿**
