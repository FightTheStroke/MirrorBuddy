import SwiftUI

// MARK: - View Extensions for TTS Integration (Task 73.3)

extension View {
    /// Add TTS capability to any text view
    func withTTS(text: String, enabled: Bool = true) -> some View {
        self.modifier(TTSModifier(text: text, enabled: enabled))
    }

    /// Add TTS button overlay to any view
    func ttsButton(for text: String, position: Alignment = .topTrailing) -> some View {
        self.overlay(alignment: position) {
            TTSFloatingButton(text: text)
        }
    }
}

// MARK: - TTS View Modifier (Task 73.3)

struct TTSModifier: ViewModifier {
    let text: String
    let enabled: Bool

    @ObservedObject private var ttsService = TextToSpeechService.shared
    @State private var showControls = false

    func body(content: Content) -> some View {
        VStack(spacing: 0) {
            content

            if enabled && !text.isEmpty {
                TTSCompactControlsView(text: text) {
                    ttsService.speak(text)
                }
                .padding(.top, 8)
            }
        }
    }
}

// MARK: - TTS Floating Button (Task 73.3)

struct TTSFloatingButton: View {
    let text: String

    @ObservedObject private var ttsService = TextToSpeechService.shared

    var body: some View {
        Button {
            if ttsService.isSpeaking {
                ttsService.stop()
            } else {
                ttsService.speak(text)
            }
        } label: {
            Image(systemName: ttsService.isSpeaking ? "stop.circle.fill" : "speaker.wave.2.circle.fill")
                .font(.title2)
                .foregroundStyle(.white)
                .padding(12)
                .background(Circle().fill(Color.blue))
                .shadow(radius: 4)
        }
        .padding(8)
    }
}

// MARK: - TTS-Enabled Text View (Task 73.3)

struct TTSText: View {
    let text: String
    let font: Font
    let lineSpacing: CGFloat

    @ObservedObject private var ttsService = TextToSpeechService.shared
    @State private var highlightedRange: NSRange?

    init(_ text: String, font: Font = .body, lineSpacing: CGFloat = 8) {
        self.text = text
        self.font = font
        self.lineSpacing = lineSpacing
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Text with potential highlighting
            if let range = highlightedRange {
                highlightedText(range: range)
            } else {
                Text(text)
                    .font(font)
                    .lineSpacing(lineSpacing)
            }

            // TTS controls
            TTSCompactControlsView(text: text) {
                startSpeaking()
            }
        }
    }

    @ViewBuilder
    private func highlightedText(range: NSRange) -> some View {
        // Convert NSRange to String indices
        let start = text.index(text.startIndex, offsetBy: range.location, limitedBy: text.endIndex) ?? text.startIndex
        let end = text.index(start, offsetBy: range.length, limitedBy: text.endIndex) ?? text.endIndex

        let before = String(text[..<start])
        let highlighted = String(text[start..<end])
        let after = String(text[end...])

        (Text(before) +
            Text(highlighted).foregroundStyle(.blue).bold() +
            Text(after))
            .font(font)
            .lineSpacing(lineSpacing)
    }

    private func startSpeaking() {
        // Set up word boundary callback for highlighting
        ttsService.onWordBoundary = { [weak ttsService] range in
            guard ttsService?.currentText == text else { return }
            highlightedRange = range
        }

        ttsService.onSpeechFinished = { [weak ttsService] in
            highlightedRange = nil
            ttsService?.onWordBoundary = nil
        }

        ttsService.speak(text)
    }
}

// MARK: - Mind Map Node TTS (Task 73.3)

extension View {
    /// Add TTS to mind map nodes
    func mindMapNodeTTS(node: MindMapNode) -> some View {
        self.contextMenu {
            Button {
                let text = "\(node.title). \(node.content ?? "")"
                TextToSpeechService.shared.speak(text)
            } label: {
                Label("Ascolta Nodo", systemImage: "speaker.wave.2")
            }
        }
    }
}

// MARK: - Long Content Reading (Task 73.3)

struct LongContentReader: View {
    let content: String
    let title: String

    @ObservedObject private var ttsService = TextToSpeechService.shared
    @State private var isReading = false
    @State private var showSettings = false

    var body: some View {
        VStack(spacing: 16) {
            // Title
            Text(title)
                .font(.title2)
                .fontWeight(.bold)

            // Content
            ScrollView {
                Text(content)
                    .font(.body)
                    .lineSpacing(8)
                    .padding()
            }

            // Controls
            HStack {
                Button {
                    showSettings = true
                } label: {
                    Image(systemName: "gear")
                }

                Spacer()

                if isReading {
                    Button {
                        ttsService.stop()
                        isReading = false
                    } label: {
                        Label("Stop", systemImage: "stop.fill")
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.red)
                } else {
                    Button {
                        startLongReading()
                    } label: {
                        Label("Inizia Lettura", systemImage: "play.fill")
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
            .padding()

            // Progress
            if isReading {
                TTSProgressView()
            }
        }
        .sheet(isPresented: $showSettings) {
            TTSSettingsView()
        }
        .onAppear {
            setupCallbacks()
        }
    }

    private func setupCallbacks() {
        ttsService.onSpeechFinished = { [weak ttsService] in
            isReading = false
            ttsService?.onSpeechFinished = nil
        }
    }

    private func startLongReading() {
        isReading = true
        ttsService.speakLongText(content)
    }
}

// MARK: - Flashcard TTS (Task 73.3)

extension View {
    /// Add TTS to flashcard views
    func flashcardTTS(question: String, answer: String) -> some View {
        self.toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button {
                        TextToSpeechService.shared.speak(question)
                    } label: {
                        Label("Leggi Domanda", systemImage: "speaker.wave.2")
                    }

                    Button {
                        TextToSpeechService.shared.speak(answer)
                    } label: {
                        Label("Leggi Risposta", systemImage: "speaker.wave.2")
                    }

                    Button {
                        let fullText = "Domanda: \(question). Risposta: \(answer)"
                        TextToSpeechService.shared.speak(fullText)
                    } label: {
                        Label("Leggi Tutto", systemImage: "speaker.wave.3")
                    }
                } label: {
                    Image(systemName: "speaker.wave.2")
                }
            }
        }
    }
}

// MARK: - Preview

#Preview("TTS Text") {
    TTSText(
        "Questo è un esempio di testo con supporto TTS integrato. Il testo può essere letto ad alta voce e le parole verranno evidenziate durante la lettura.",
        font: .body,
        lineSpacing: 8
    )
    .padding()
}

#Preview("Long Content Reader") {
    LongContentReader(
        content: String(repeating: "Questo è un paragrafo di esempio. ", count: 50),
        title: "Lettura Contenuti Lunghi"
    )
}
