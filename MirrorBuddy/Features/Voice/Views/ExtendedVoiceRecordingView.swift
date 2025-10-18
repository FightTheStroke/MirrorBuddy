//
//  ExtendedVoiceRecordingView.swift
//  MirrorBuddy
//
//  Extended voice recording UI for classroom lessons (up to 6 hours)
//  Subtask 91.4: Recording control UI with accessibility
//

import SwiftUI

/// View for extended voice recording with comprehensive controls
struct ExtendedVoiceRecordingView: View {
    @StateObject private var recordingService = ExtendedVoiceRecordingService.shared
    @Environment(\.dismiss) private var dismiss

    @State private var showPermissionAlert = false
    @State private var showMaxDurationAlert = false
    @State private var recordingPulse = false

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color.red.opacity(recordingService.isRecording ? 0.1 : 0.05),
                    Color.orange.opacity(0.05)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 32) {
                Spacer()

                // Recording indicator and timer
                recordingStatusView

                // Battery indicator
                if recordingService.isRecording {
                    batteryIndicatorView
                }

                Spacer()

                // Control buttons
                controlButtonsView
                    .padding(.bottom, 40)
            }
            .padding()
        }
        .navigationTitle("Registrazione Lezione")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Chiudi") {
                    if recordingService.isRecording {
                        // Show alert before dismissing active recording
                        showMaxDurationAlert = true
                    } else {
                        dismiss()
                    }
                }
            }
        }
        .alert("Permesso Microfono", isPresented: $showPermissionAlert) {
            Button("OK", role: .cancel) {}
            Button("Impostazioni") {
                if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(settingsURL)
                }
            }
        } message: {
            Text("Per registrare le lezioni, devi consentire l'accesso al microfono nelle impostazioni.")
        }
        .alert("Registrazione in Corso", isPresented: $showMaxDurationAlert) {
            Button("Continua Registrazione", role: .cancel) {}
            Button("Ferma e Chiudi", role: .destructive) {
                _Concurrency.Task {
                    _ = try? await recordingService.stopRecording()
                    dismiss()
                }
            }
        } message: {
            Text("Hai una registrazione in corso. Vuoi fermarla?")
        }
    }

    // MARK: - Recording Status View

    private var recordingStatusView: some View {
        VStack(spacing: 16) {
            // Recording indicator pulse animation
            ZStack {
                if recordingService.isRecording && !recordingService.isPaused {
                    Circle()
                        .fill(Color.red.opacity(0.3))
                        .frame(width: 120, height: 120)
                        .scaleEffect(recordingPulse ? 1.3 : 1.0)
                        .opacity(recordingPulse ? 0 : 1)
                        .animation(
                            Animation.easeInOut(duration: 1.5).repeatForever(autoreverses: false),
                            value: recordingPulse
                        )
                        .onAppear {
                            recordingPulse = true
                        }
                }

                Circle()
                    .fill(recordingStateColor)
                    .frame(width: 100, height: 100)
                    .shadow(radius: 10)

                Image(systemName: recordingStateIcon)
                    .font(.system(size: 40))
                    .foregroundStyle(.white)
            }
            .accessibilityLabel(recordingStateAccessibilityLabel)

            // Timer display
            Text(recordingService.formattedDuration)
                .font(.system(size: 48, weight: .bold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(recordingService.isRecording ? .primary : .secondary)
                .accessibilityLabel("Durata registrazione: \(recordingService.formattedDuration)")

            // Status text
            Text(recordingStateText)
                .font(.title3)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Battery Indicator

    private var batteryIndicatorView: some View {
        HStack(spacing: 12) {
            Image(systemName: batteryIcon)
                .font(.title2)
                .foregroundStyle(batteryColor)

            VStack(alignment: .leading, spacing: 4) {
                Text("Batteria")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Text("\(Int(recordingService.batteryLevel * 100))%")
                    .font(.headline)
                    .foregroundStyle(batteryColor)
            }
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(12)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Batteria al \(Int(recordingService.batteryLevel * 100)) percento")
    }

    // MARK: - Control Buttons

    private var controlButtonsView: some View {
        HStack(spacing: 40) {
            // Pause/Resume button (only when recording)
            if recordingService.isRecording {
                Button {
                    if recordingService.isPaused {
                        recordingService.resumeRecording()
                    } else {
                        recordingService.pauseRecording()
                    }
                } label: {
                    VStack(spacing: 8) {
                        Circle()
                            .fill(Color.orange)
                            .frame(width: 70, height: 70)
                            .overlay {
                                Image(systemName: recordingService.isPaused ? "play.fill" : "pause.fill")
                                    .font(.title)
                                    .foregroundStyle(.white)
                            }
                            .shadow(radius: 4)

                        Text(recordingService.isPaused ? "Riprendi" : "Pausa")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .accessibilityLabel(recordingService.isPaused ? "Riprendi registrazione" : "Metti in pausa")
                .accessibilityHint("Tocca due volte per \(recordingService.isPaused ? "riprendere" : "mettere in pausa") la registrazione")
            }

            // Start/Stop button (main control)
            Button {
                handleMainButtonTap()
            } label: {
                VStack(spacing: 8) {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: recordingService.isRecording ? [.red, .red.opacity(0.8)] : [.blue, .purple],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 90, height: 90)
                        .overlay {
                            Image(systemName: recordingService.isRecording ? "stop.fill" : "mic.fill")
                                .font(.system(size: 36))
                                .foregroundStyle(.white)
                        }
                        .shadow(radius: 8)

                    Text(recordingService.isRecording ? "Ferma" : "Inizia")
                        .font(.headline)
                        .foregroundStyle(.primary)
                }
            }
            .accessibilityLabel(recordingService.isRecording ? "Ferma registrazione" : "Inizia registrazione")
            .accessibilityHint("Tocca due volte per \(recordingService.isRecording ? "fermare" : "iniziare") la registrazione della lezione")
            .sensoryFeedback(.impact(intensity: 0.7), trigger: recordingService.isRecording)
        }
    }

    // MARK: - Helper Methods

    private func handleMainButtonTap() {
        if recordingService.isRecording {
            // Stop recording
            _Concurrency.Task {
                _ = try? await recordingService.stopRecording()
            }
        } else {
            // Start recording
            _Concurrency.Task {
                do {
                    try await recordingService.startRecording()
                } catch RecordingError.permissionDenied {
                    showPermissionAlert = true
                } catch {
                    // Handle other errors
                }
            }
        }
    }

    // MARK: - Computed Properties

    private var recordingStateColor: Color {
        if !recordingService.isRecording {
            return .gray
        } else if recordingService.isPaused {
            return .orange
        } else {
            return .red
        }
    }

    private var recordingStateIcon: String {
        if !recordingService.isRecording {
            return "mic.slash.fill"
        } else if recordingService.isPaused {
            return "pause.fill"
        } else {
            return "waveform"
        }
    }

    private var recordingStateText: String {
        if !recordingService.isRecording {
            return "Pronto per Registrare"
        } else if recordingService.isPaused {
            return "In Pausa"
        } else {
            return "Registrazione in Corso"
        }
    }

    private var recordingStateAccessibilityLabel: String {
        if !recordingService.isRecording {
            return "Non in registrazione"
        } else if recordingService.isPaused {
            return "Registrazione in pausa"
        } else {
            return "Registrazione in corso"
        }
    }

    private var batteryIcon: String {
        if recordingService.isLowBattery {
            return "battery.25"
        } else if recordingService.batteryLevel > 0.75 {
            return "battery.100"
        } else if recordingService.batteryLevel > 0.50 {
            return "battery.75"
        } else if recordingService.batteryLevel > 0.25 {
            return "battery.50"
        } else {
            return "battery.25"
        }
    }

    private var batteryColor: Color {
        if recordingService.isLowBattery {
            return .red
        } else if recordingService.batteryLevel > 0.50 {
            return .green
        } else {
            return .orange
        }
    }
}

// MARK: - Preview

#Preview("Idle") {
    NavigationStack {
        ExtendedVoiceRecordingView()
    }
}

#Preview("Recording") {
    let _ = {
        _Concurrency.Task { @MainActor in
            ExtendedVoiceRecordingService.shared.isRecording = true
            ExtendedVoiceRecordingService.shared.recordingDuration = 125.0
            ExtendedVoiceRecordingService.shared.batteryLevel = 0.85
        }
    }()

    NavigationStack {
        ExtendedVoiceRecordingView()
    }
}

#Preview("Paused") {
    let _ = {
        _Concurrency.Task { @MainActor in
            ExtendedVoiceRecordingService.shared.isRecording = true
            ExtendedVoiceRecordingService.shared.isPaused = true
            ExtendedVoiceRecordingService.shared.recordingDuration = 1_845.0
            ExtendedVoiceRecordingService.shared.batteryLevel = 0.42
        }
    }()

    NavigationStack {
        ExtendedVoiceRecordingView()
    }
}

#Preview("Low Battery") {
    let _ = {
        _Concurrency.Task { @MainActor in
            ExtendedVoiceRecordingService.shared.isRecording = true
            ExtendedVoiceRecordingService.shared.recordingDuration = 5_432.0
            ExtendedVoiceRecordingService.shared.batteryLevel = 0.15
            ExtendedVoiceRecordingService.shared.isLowBattery = true
        }
    }()

    NavigationStack {
        ExtendedVoiceRecordingView()
    }
}
