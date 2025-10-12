# Voice Agent Specification
**Agent ID**: `voice-agent`
**Role**: Voice Features & Audio Pipeline
**Priority**: High
**Model**: claude-sonnet-4.5

---

## Overview

You are responsible for OpenAI Realtime API integration and audio pipeline. This is critical for Mario's primary interaction mode.

---

## Assigned Tasks

### Task 31: OpenAI Realtime API Integration
### Task 34: Audio Pipeline

**File**: `Core/Voice/RealtimeVoiceClient.swift`

```swift
import AVFoundation

@MainActor
@Observable
final class RealtimeVoiceClient {
    private var webSocket: URLSessionWebSocketTask?
    private var audioEngine: AVAudioEngine?

    var isConnected = false
    var isRecording = false

    func connect(apiKey: String) async throws {
        let url = URL(string: "wss://api.openai.com/v1/realtime")!
        var request = URLRequest(url: url)
        request.addValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")

        webSocket = URLSession.shared.webSocketTask(with: request)
        webSocket?.resume()
        isConnected = true

        // Start receiving messages
        Task { await receiveMessages() }
    }

    func startRecording() throws {
        audioEngine = AVAudioEngine()
        guard let audioEngine = audioEngine else { return }

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            Task { await self.sendAudio(buffer: buffer) }
        }

        try audioEngine.start()
        isRecording = true
    }

    func stopRecording() {
        audioEngine?.stop()
        audioEngine?.inputNode.removeTap(onBus: 0)
        isRecording = false
    }

    private func sendAudio(buffer: AVAudioPCMBuffer) async {
        // Convert to PCM16 24kHz as required by Realtime API
        // Send via WebSocket
    }

    private func receiveMessages() async {
        while isConnected {
            do {
                let message = try await webSocket?.receive()
                // Handle incoming audio and transcriptions
            } catch {
                isConnected = false
            }
        }
    }
}
```

### Task 33: Study Coach Personality

**File**: `Core/Voice/CoachPersonality.swift`

```swift
struct CoachPersonality {
    static let systemPrompt = """
    You are Mario's study coach. Mario is a wonderful student with:
    - Dyslexia, dyscalculia, dysgraphia
    - Limited working memory
    - Left hemiplegia

    Your personality:
    - ALWAYS patient and encouraging
    - NEVER judgmental or critical
    - Speak in simple, short sentences
    - Use concrete examples from daily life
    - Celebrate small wins enthusiastically
    - If Mario struggles, simplify further
    - Adapt to Mario's pace (never rush)

    Language: Primarily Italian, can switch to English

    Remember: You're here to make learning joyful, not stressful.
    """
}
```

---

## Testing

```swift
@Test("Realtime client connects")
func realtimeConnection() async throws {
    let client = RealtimeVoiceClient()
    try await client.connect(apiKey: testKey)
    #expect(client.isConnected == true)
}
```

---

**Give Mario a voice. Make conversations natural. 🎙️**
