//
//  LessonRecordingView.swift
//  MirrorBuddy
//
//  Ambient recording UI with storage monitoring and background support (Task 129.1)
//

import SwiftUI

struct LessonRecordingView: View {
    @StateObject private var recordingService = LessonRecordingService.shared
    @State private var showingTitleInput = false
    @State private var recordingTitle = ""
    @State private var showingStopConfirmation = false
    @State private var errorMessage: String?
    @State private var showingError = false

    var body: some View {
        NavigationStack {
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: recordingService.isRecording
                        ? [Color.red.opacity(0.1), Color.orange.opacity(0.1)]
                        : [Color.blue.opacity(0.1), Color.purple.opacity(0.1)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                VStack(spacing: 24) {
                    if recordingService.isRecording {
                        // Active recording state
                        activeRecordingView
                    } else {
                        // Ready to record state
                        readyToRecordView
                    }
                }
                .padding()
            }
            .navigationTitle("Lesson Recording")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showingTitleInput) {
                titleInputSheet
            }
            .confirmationDialog(
                "Stop Recording",
                isPresented: $showingStopConfirmation,
                titleVisibility: .visible
            ) {
                Button("Stop and Transcribe", role: .destructive) {
                    Task {
                        await stopRecording()
                    }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("The recording will be processed and transcribed. This may take several minutes.")
            }
            .alert("Recording Error", isPresented: $showingError) {
                Button("OK", role: .cancel) {}
            } message: {
                if let error = errorMessage {
                    Text(error)
                }
            }
        }
    }

    // MARK: - Active Recording View

    private var activeRecordingView: some View {
        VStack(spacing: 32) {
            // Recording indicator
            VStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(Color.red.opacity(0.2))
                        .frame(width: 120, height: 120)
                        .overlay(
                            Circle()
                                .stroke(Color.red, lineWidth: 3)
                                .scaleEffect(recordingPulse ? 1.2 : 1.0)
                                .opacity(recordingPulse ? 0 : 1)
                        )

                    Image(systemName: "mic.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.red)
                }

                Text("Recording in Progress")
                    .font(.title2)
                    .fontWeight(.semibold)

                Text(formattedDuration(recordingService.recordingDuration))
                    .font(.system(size: 48, weight: .bold, design: .monospaced))
                    .foregroundColor(.primary)

                if let recording = recordingService.currentRecording {
                    Text(recording.title)
                        .font(.headline)
                        .foregroundColor(.secondary)
                }
            }

            // Storage monitoring
            storageMonitorCard

            // Background mode message
            backgroundModeCard

            Spacer()

            // Recording controls
            HStack(spacing: 20) {
                // Pause/Resume button
                Button {
                    Task {
                        await togglePause()
                    }
                } label: {
                    Image(systemName: recordingService.extendedRecorder.isPaused ? "play.fill" : "pause.fill")
                        .font(.title2)
                        .frame(width: 64, height: 64)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .clipShape(Circle())
                }

                // Stop button
                Button {
                    showingStopConfirmation = true
                } label: {
                    Image(systemName: "stop.fill")
                        .font(.title2)
                        .frame(width: 80, height: 80)
                        .background(Color.red)
                        .foregroundColor(.white)
                        .clipShape(Circle())
                }
            }
            .padding(.bottom, 32)
        }
        .onAppear {
            startPulseAnimation()
        }
    }

    // MARK: - Ready to Record View

    private var readyToRecordView: some View {
    VStack(spacing: 32) {
    Spacer()

    VStack(spacing: 16) {
    Image(systemName: "waveform.circle.fill")
    .font(.system(size: 100))
    .foregroundColor(.blue)
    .symbolEffect(.pulse)

    Text("Ready to Record")
    .font(.title)
    .fontWeight(.bold)

    Text("Tap the button below to start recording your lesson. The app will continue recording even when in the background.")
    .font(.body)
    .foregroundColor(.secondary)
    .multilineTextAlignment(.center)
    .padding(.horizontal)
    }

    // Storage info
    storageInfoCard

    Spacer()

    // Start recording button
    Button {
    showingTitleInput = true
    } label: {
    HStack {
    Image(systemName: "mic.fill")
    Text("Start Recording")
    .fontWeight(.semibold)
    }
    .font(.title3)
    .foregroundColor(.white)
    .frame(maxWidth: .infinity)
    .padding()
    .background(
    hasEnoughStorage
    ? Color.red
    : Color.gray
    )
    .cornerRadius(16)
    }
    .disabled(!hasEnoughStorage)
    .padding(.bottom, 32)
    }
    }

    // MARK: - Storage Monitor Card

    private var storageMonitorCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Storage", systemImage: "internaldrive")
                .font(.headline)

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Available")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(formatBytes(recordingService.storageAvailable))
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text("Estimated Size")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(estimatedRecordingSize)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }
            }

            // Storage bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.2))

                    RoundedRectangle(cornerRadius: 4)
                        .fill(storageColor)
                        .frame(width: storageBarWidth(geometry.size.width))
                }
            }
            .frame(height: 8)

            if !hasEnoughStorage {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                    Text("Low storage space")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
            }
        }
        .padding()
        .background(Color(uiColor: .systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }

    // MARK: - Storage Info Card

    private var storageInfoCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "internaldrive")
                    .foregroundColor(.blue)
                Text("Storage Information")
                    .font(.headline)
            }

            Divider()

            HStack {
                Text("Available:")
                    .foregroundColor(.secondary)
                Spacer()
                Text(formatBytes(recordingService.storageAvailable))
                    .fontWeight(.semibold)
            }

            HStack {
                Text("Per Hour:")
                    .foregroundColor(.secondary)
                Spacer()
                Text("~60 MB")
                    .fontWeight(.semibold)
            }

            if !hasEnoughStorage {
                Divider()
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                    Text("Free up storage space before recording")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
            }
        }
        .padding()
        .background(Color(uiColor: .secondarySystemBackground))
        .cornerRadius(12)
    }

    // MARK: - Background Mode Card

    private var backgroundModeCard: some View {
        HStack(spacing: 12) {
            Image(systemName: "iphone.radiowaves.left.and.right")
                .font(.title2)
                .foregroundColor(.blue)

            VStack(alignment: .leading, spacing: 4) {
                Text("Background Mode Active")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Text("Recording continues when app is in background")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
        .padding()
        .background(Color.blue.opacity(0.1))
        .cornerRadius(12)
    }

    // MARK: - Title Input Sheet

    private var titleInputSheet: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Lesson Title", text: $recordingTitle)
                        .textInputAutocapitalization(.words)
                } header: {
                    Text("Recording Title")
                } footer: {
                    Text("Give your recording a descriptive title to find it easily later.")
                }

                Section {
                    HStack {
                        Image(systemName: "info.circle")
                            .foregroundColor(.blue)
                        Text("The recording will continue even when the app is in the background.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("New Recording")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showingTitleInput = false
                        recordingTitle = ""
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Start") {
                        showingTitleInput = false
                        Task {
                            await startRecording()
                        }
                    }
                    .disabled(recordingTitle.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }

    // MARK: - Helper Properties

    @State private var recordingPulse = false

    private var hasEnoughStorage: Bool {
        recordingService.storageAvailable > 500 * 1_024 * 1_024 // 500 MB minimum
    }

    private var estimatedRecordingSize: String {
        let durationHours = recordingService.recordingDuration / 3_600
        let estimatedSize = Int64(durationHours * 60 * 1_024 * 1_024) // 60 MB per hour
        return formatBytes(max(10 * 1_024 * 1_024, estimatedSize)) // Minimum 10 MB
    }

    private var storageColor: Color {
        let usageRatio = Double(recordingService.estimatedStorageNeeded) / Double(recordingService.storageAvailable)
        if usageRatio > 0.8 {
            return .red
        } else if usageRatio > 0.5 {
            return .orange
        } else {
            return .green
        }
    }

    private func storageBarWidth(_ totalWidth: CGFloat) -> CGFloat {
        let usageRatio = Double(recordingService.estimatedStorageNeeded) / Double(recordingService.storageAvailable)
        return totalWidth * min(CGFloat(usageRatio), 1.0)
    }

    // MARK: - Helper Methods

    private func startPulseAnimation() {
        withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
            recordingPulse = true
        }
    }

    private func formattedDuration(_ duration: TimeInterval) -> String {
        let hours = Int(duration) / 3_600
        let minutes = (Int(duration) % 3_600) / 60
        let seconds = Int(duration) % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }

    private func formatBytes(_ bytes: Int64) -> String {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: bytes)
    }

    // MARK: - Actions

    private func startRecording() async {
        recordingService.updateStorageInfo()

        do {
            try await recordingService.startRecording(
                title: recordingTitle.trimmingCharacters(in: .whitespaces)
            )
            recordingTitle = ""
        } catch {
            errorMessage = error.localizedDescription
            showingError = true
        }
    }

    private func togglePause() async {
        do {
            if recordingService.extendedRecorder.isPaused {
                try await recordingService.resumeRecording()
            } else {
                try await recordingService.pauseRecording()
            }
        } catch {
            errorMessage = error.localizedDescription
            showingError = true
        }
    }

    private func stopRecording() async {
        do {
            _ = try await recordingService.stopRecording()
        } catch {
            errorMessage = error.localizedDescription
            showingError = true
        }
    }
}

#Preview {
    LessonRecordingView()
}
