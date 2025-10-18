import AVFoundation
import SwiftUI

/// TTS playback controls UI (Task 73.2)
struct TTSControlsView: View {
    @ObservedObject var ttsService = TextToSpeechService.shared
    @State private var showSettings = false

    var body: some View {
        HStack(spacing: 20) {
            // Settings button
            Button {
                showSettings = true
            } label: {
                Image(systemName: "gear")
                    .font(.title2)
                    .frame(width: 44, height: 44)
                    .foregroundStyle(.secondary)
            }
            .accessibilityLabel("Impostazioni voce")

            Spacer()

            // Previous/Skip back (placeholder for future implementation)
            Button {
                // Skip back 10 seconds
            } label: {
                Image(systemName: "gobackward.10")
                    .font(.title2)
                    .frame(width: 44, height: 44)
            }
            .disabled(!ttsService.isSpeaking)
            .accessibilityLabel("Indietro 10 secondi")

            // Play/Pause button
            Button {
                if ttsService.isSpeaking {
                    if ttsService.isPaused {
                        ttsService.resume()
                    } else {
                        ttsService.pause()
                    }
                }
            } label: {
                Image(systemName: ttsService.isPaused ? "play.circle.fill" : "pause.circle.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(.blue)
            }
            .disabled(!ttsService.isSpeaking)
            .accessibilityLabel(ttsService.isPaused ? "Riproduci" : "Pausa")

            // Stop button
            Button {
                ttsService.stop()
            } label: {
                Image(systemName: "stop.circle.fill")
                    .font(.system(size: 44))
                    .foregroundStyle(.red)
            }
            .disabled(!ttsService.isSpeaking)
            .accessibilityLabel("Stop")

            // Next/Skip forward (placeholder for future implementation)
            Button {
                // Skip forward 10 seconds
            } label: {
                Image(systemName: "goforward.10")
                    .font(.title2)
                    .frame(width: 44, height: 44)
            }
            .disabled(!ttsService.isSpeaking)
            .accessibilityLabel("Avanti 10 secondi")

            Spacer()

            // Volume indicator
            Image(systemName: volumeIcon)
                .font(.title3)
                .foregroundStyle(.secondary)
                .accessibilityHidden(true)
        }
        .padding()
        .background(Color(.systemBackground))
        .sheet(isPresented: $showSettings) {
            TTSSettingsView()
        }
    }

    private var volumeIcon: String {
        let volume = ttsService.volume
        if volume > 0.66 {
            return "speaker.wave.3.fill"
        } else if volume > 0.33 {
            return "speaker.wave.2.fill"
        } else if volume > 0 {
            return "speaker.wave.1.fill"
        } else {
            return "speaker.slash.fill"
        }
    }
}

/// Compact TTS controls for inline use
struct TTSCompactControlsView: View {
    @ObservedObject var ttsService = TextToSpeechService.shared
    let text: String
    let onPlay: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Play/Pause/Stop button
            Button {
                if ttsService.isSpeaking {
                    if ttsService.isPaused {
                        ttsService.resume()
                    } else {
                        ttsService.pause()
                    }
                } else {
                    onPlay()
                }
            } label: {
                Image(systemName: buttonIcon)
                    .font(.title3)
                    .frame(width: 44, height: 44)
                    .foregroundStyle(.blue)
            }
            .accessibilityLabel(buttonAccessibilityLabel)

            if ttsService.isSpeaking {
                // Progress indicator
                ProgressView(value: ttsService.currentProgress)
                    .progressViewStyle(.linear)

                // Stop button
                Button {
                    ttsService.stop()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
                .accessibilityLabel("Stop")
            } else {
                Text("Ascolta il testo")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var buttonIcon: String {
        if ttsService.isSpeaking {
            return ttsService.isPaused ? "play.circle.fill" : "pause.circle.fill"
        } else {
            return "play.circle.fill"
        }
    }

    private var buttonAccessibilityLabel: String {
        if ttsService.isSpeaking {
            return ttsService.isPaused ? "Riproduci" : "Pausa"
        } else {
            return "Ascolta testo"
        }
    }
}

/// TTS progress bar with time indicators
struct TTSProgressView: View {
    @ObservedObject var ttsService = TextToSpeechService.shared

    var body: some View {
        VStack(spacing: 8) {
            // Progress bar
            ProgressView(value: ttsService.currentProgress)
                .progressViewStyle(.linear)
                .tint(.blue)

            // Time indicators (placeholder - would need actual duration tracking)
            HStack {
                Text(formattedProgress)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Spacer()

                if ttsService.isSpeaking {
                    Text("In riproduzione...")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    Text("Pronto")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.horizontal)
    }

    private var formattedProgress: String {
        let progress = Int(ttsService.currentProgress * 100)
        return "\(progress)%"
    }
}

#Preview("TTS Controls") {
    VStack(spacing: 20) {
        TTSControlsView()
            .padding()

        Divider()

        TTSCompactControlsView(text: "Sample text to speak") {
            TextToSpeechService.shared.speak("Sample text to speak")
        }
        .padding()

        TTSProgressView()
            .padding()

        Spacer()
    }
}
