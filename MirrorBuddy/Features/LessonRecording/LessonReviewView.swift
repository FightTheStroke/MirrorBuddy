//
//  LessonReviewView.swift
//  MirrorBuddy
//
//  Review experience UI with audio playback, transcripts, and mind map navigation (Task 129.4)
//

import AVFoundation
import SwiftUI

struct LessonReviewView: View {
    let recording: LessonRecording

    @State private var audioPlayer: AVAudioPlayer?
    @State private var isPlaying = false
    @State private var currentTime: TimeInterval = 0
    @State private var selectedSegmentIndex: Int?
    @State private var showingMindMap = false
    @State private var showingFullTranscript = false
    @State private var searchText = ""

    private var timer = Timer.publish(every: 0.5, on: .main, in: .common).autoconnect()

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header with recording info
                recordingHeader

                // Processing status
                if recording.recordingStatus == .processing {
                    processingStatusCard
                } else if recording.recordingStatus == .failed {
                    errorCard
                } else {
                    // Ready state - show full review
                    VStack(spacing: 20) {
                        // Audio player
                        audioPlayerCard

                        // Summary card
                        if let summary = recording.overallSummary {
                            summaryCard(summary)
                        }

                        // Mind map access
                        if recording.mindMap != nil {
                            mindMapCard
                        }

                        // Full transcript
                        fullTranscriptCard

                        // Segmented view
                        segmentsListSection
                    }
                }
            }
            .padding()
        }
        .navigationTitle(recording.title)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingMindMap) {
            if let mindMap = recording.mindMap {
                NavigationStack {
                    MindMapView(mindMap: mindMap)
                        .navigationTitle("Lesson Mind Map")
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbar {
                            ToolbarItem(placement: .cancellationAction) {
                                Button("Done") {
                                    showingMindMap = false
                                }
                            }
                        }
                }
            }
        }
        .sheet(isPresented: $showingFullTranscript) {
            fullTranscriptSheet
        }
        .onAppear {
            setupAudioPlayer()
        }
        .onDisappear {
            audioPlayer?.stop()
        }
        .onReceive(timer) { _ in
            updateCurrentTime()
        }
    }

    // MARK: - Recording Header

    private var recordingHeader: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    Text(recording.title)
                        .font(.title2)
                        .fontWeight(.bold)

                    HStack(spacing: 16) {
                        Label(recording.formattedDuration, systemImage: "clock")
                        Label(recording.formattedFileSize, systemImage: "internaldrive")
                        if recording.totalWords > 0 {
                            Label("\(recording.totalWords) words", systemImage: "text.alignleft")
                        }
                    }
                    .font(.caption)
                    .foregroundColor(.secondary)
                }

                Spacer()

                statusBadge
            }

            if let date = recording.recordingDate {
                HStack {
                    Image(systemName: "calendar")
                        .foregroundColor(.secondary)
                    Text(date, style: .date)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Spacer()
                }
            }
        }
        .padding()
        .background(Color(uiColor: .secondarySystemBackground))
        .cornerRadius(12)
    }

    // MARK: - Status Badge

    private var statusBadge: some View {
        Group {
            switch recording.recordingStatus {
            case .recording:
                Label("Recording", systemImage: "mic.fill")
                    .font(.caption)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.red.opacity(0.2))
                    .foregroundColor(.red)
                    .cornerRadius(8)
            case .processing:
                Label("Processing", systemImage: "gearshape.fill")
                    .font(.caption)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.blue.opacity(0.2))
                    .foregroundColor(.blue)
                    .cornerRadius(8)
            case .ready:
                Label("Ready", systemImage: "checkmark.circle.fill")
                    .font(.caption)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.green.opacity(0.2))
                    .foregroundColor(.green)
                    .cornerRadius(8)
            case .failed:
                Label("Failed", systemImage: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.red.opacity(0.2))
                    .foregroundColor(.red)
                    .cornerRadius(8)
            }
        }
    }

    // MARK: - Processing Status Card

    private var processingStatusCard: some View {
        VStack(spacing: 16) {
            ProgressView(value: recording.processingProgress) {
                HStack {
                    Image(systemName: "waveform")
                    Text("Processing Recording")
                        .font(.headline)
                }
            }

            Text("Transcribing and generating summaries...")
                .font(.subheadline)
                .foregroundColor(.secondary)

            if recording.segments.isEmpty == false {
                let completed = recording.segments.filter { $0.transcriptText != nil }.count
                Text("\(completed) of \(recording.segments.count) segments completed")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color.blue.opacity(0.1))
        .cornerRadius(12)
    }

    // MARK: - Error Card

    private var errorCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.red)
                Text("Processing Failed")
                    .font(.headline)
            }

            if let error = recording.errorMessage {
                Text(error)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Button("Retry Processing") {
                // TODO: Implement retry logic
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
        .background(Color.red.opacity(0.1))
        .cornerRadius(12)
    }

    // MARK: - Audio Player Card

    private var audioPlayerCard: some View {
        VStack(spacing: 16) {
            // Waveform visualization placeholder
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.blue.opacity(0.1))
                    .frame(height: 60)

                HStack(spacing: 2) {
                    ForEach(0..<50, id: \.self) { _ in
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.blue.opacity(Double.random(in: 0.3...1.0)))
                            .frame(width: 3)
                            .frame(height: CGFloat.random(in: 10...50))
                    }
                }
            }

            // Time slider
            VStack(spacing: 4) {
                Slider(value: $currentTime, in: 0...max(recording.recordingDuration, 1)) { editing in
                    if !editing {
                        seekToTime(currentTime)
                    }
                }

                HStack {
                    Text(formatTime(currentTime))
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(formatTime(recording.recordingDuration))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // Playback controls
            HStack(spacing: 32) {
                Button {
                    skipBackward()
                } label: {
                    Image(systemName: "gobackward.15")
                        .font(.title)
                }

                Button {
                    togglePlayback()
                } label: {
                    Image(systemName: isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: 64))
                }

                Button {
                    skipForward()
                } label: {
                    Image(systemName: "goforward.15")
                        .font(.title)
                }
            }
            .foregroundColor(.blue)
        }
        .padding()
        .background(Color(uiColor: .secondarySystemBackground))
        .cornerRadius(12)
    }

    // MARK: - Summary Card

    private func summaryCard(_ summary: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Summary", systemImage: "doc.text")
                    .font(.headline)
                Spacer()
            }

            Text(summary)
                .font(.body)
                .foregroundColor(.primary)

            Divider()

            if recording.wordsPerMinute > 0 {
                HStack {
                    Image(systemName: "speedometer")
                        .foregroundColor(.secondary)
                    Text("\(Int(recording.wordsPerMinute)) words/min")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(uiColor: .secondarySystemBackground))
        .cornerRadius(12)
    }

    // MARK: - Mind Map Card

    private var mindMapCard: some View {
        Button {
            showingMindMap = true
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    Label("Mind Map", systemImage: "brain.head.profile")
                        .font(.headline)
                        .foregroundColor(.primary)

                    Text("Visualize key concepts from this lesson")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color.purple.opacity(0.1))
            .cornerRadius(12)
        }
    }

    // MARK: - Full Transcript Card

    private var fullTranscriptCard: some View {
        Button {
            showingFullTranscript = true
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    Label("Full Transcript", systemImage: "doc.text.fill")
                        .font(.headline)
                        .foregroundColor(.primary)

                    if let wordCount = recording.fullTranscript?.split(separator: " ").count {
                        Text("\(wordCount) words")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color.blue.opacity(0.1))
            .cornerRadius(12)
        }
    }

    // MARK: - Segments List Section

    private var segmentsListSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recording Segments")
                .font(.headline)
                .padding(.horizontal)

            ForEach(Array(recording.segments.enumerated()), id: \.element.id) { index, segment in
                segmentRow(segment, index: index)
            }
        }
    }

    // MARK: - Segment Row

    private func segmentRow(_ segment: LessonSegment, index: Int) -> some View {
        Button {
            selectedSegmentIndex = index
            seekToTime(segment.startTime)
        } label: {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Segment \(segment.segmentIndex + 1)")
                        .font(.subheadline)
                        .fontWeight(.semibold)

                    Spacer()

                    Text(segment.formattedStartTime)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                if let transcript = segment.transcriptText {
                    Text(transcript)
                        .font(.body)
                        .lineLimit(3)
                        .foregroundColor(.primary)
                } else {
                    HStack {
                        ProgressView()
                            .scaleEffect(0.8)
                        Text("Transcribing...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                if let summary = segment.summary {
                    Text(summary)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .italic()
                        .lineLimit(2)
                }

                HStack {
                    Label("\(segment.wordCount) words", systemImage: "text.alignleft")
                    Spacer()
                    Label(formatDuration(segment.duration), systemImage: "clock")
                }
                .font(.caption2)
                .foregroundColor(.secondary)
            }
            .padding()
            .background(
                selectedSegmentIndex == index
                    ? Color.blue.opacity(0.1)
                    : Color(uiColor: .secondarySystemBackground)
            )
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Full Transcript Sheet

    private var fullTranscriptSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let transcript = recording.fullTranscript {
                        Text(transcript)
                            .font(.body)
                            .padding()
                    } else {
                        Text("No transcript available")
                            .foregroundColor(.secondary)
                            .padding()
                    }
                }
            }
            .navigationTitle("Full Transcript")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        showingFullTranscript = false
                    }
                }

                ToolbarItem(placement: .primaryAction) {
                    ShareLink(item: recording.fullTranscript ?? "") {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search transcript")
        }
    }

    // MARK: - Helper Methods

    private func setupAudioPlayer() {
        guard let audioURL = recording.audioFileURL else { return }

        do {
            audioPlayer = try AVAudioPlayer(contentsOf: audioURL)
            audioPlayer?.prepareToPlay()
        } catch {
            print("Failed to load audio: \(error)")
        }
    }

    private func togglePlayback() {
        guard let player = audioPlayer else { return }

        if isPlaying {
            player.pause()
        } else {
            player.play()
        }

        isPlaying.toggle()
    }

    private func seekToTime(_ time: TimeInterval) {
        audioPlayer?.currentTime = time
        currentTime = time
    }

    private func skipBackward() {
        let newTime = max(0, currentTime - 15)
        seekToTime(newTime)
    }

    private func skipForward() {
        let newTime = min(recording.recordingDuration, currentTime + 15)
        seekToTime(newTime)
    }

    private func updateCurrentTime() {
        guard let player = audioPlayer, isPlaying else { return }
        currentTime = player.currentTime

        // Auto-stop at end
        if !player.isPlaying && isPlaying {
            isPlaying = false
        }
    }

    private func formatTime(_ time: TimeInterval) -> String {
        let hours = Int(time) / 3_600
        let minutes = (Int(time) % 3_600) / 60
        let seconds = Int(time) % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%d:%02d", minutes, seconds)
        }
    }

    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%dm %02ds", minutes, seconds)
    }
}

#Preview {
    NavigationStack {
        LessonReviewView(
            recording: LessonRecording(
                title: "Physics Lesson - Newton's Laws",
                recordingDate: Date()
            )
        )
    }
}
