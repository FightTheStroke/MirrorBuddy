//
//  LessonRecordingsListView.swift
//  MirrorBuddy
//
//  List view for managing all lesson recordings (Task 129)
//

import SwiftUI
import SwiftData

struct LessonRecordingsListView: View {
    @Environment(\.modelContext) private var modelContext
    @StateObject private var recordingService = LessonRecordingService.shared

    @Query(sort: \LessonRecording.recordingDate, order: .reverse)
    private var recordings: [LessonRecording]

    @State private var selectedFilter: RecordingStatus?
    @State private var searchText = ""
    @State private var showingNewRecording = false
    @State private var recordingToDelete: LessonRecording?
    @State private var showingDeleteConfirmation = false

    var body: some View {
        NavigationStack {
            Group {
                if filteredRecordings.isEmpty {
                    emptyStateView
                } else {
                    recordingsList
                }
            }
            .navigationTitle("Lesson Recordings")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showingNewRecording = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search recordings")
            .sheet(isPresented: $showingNewRecording) {
                LessonRecordingView()
            }
            .confirmationDialog(
                "Delete Recording",
                isPresented: $showingDeleteConfirmation,
                presenting: recordingToDelete
            ) { recording in
                Button("Delete", role: .destructive) {
                    deleteRecording(recording)
                }
                Button("Cancel", role: .cancel) {}
            } message: { recording in
                Text("Are you sure you want to delete \"\(recording.title)\"? This action cannot be undone.")
            }
            .onAppear {
                recordingService.configure(modelContext: modelContext)
            }
        }
    }

    // MARK: - Filtered Recordings

    private var filteredRecordings: [LessonRecording] {
        recordings.filter { recording in
            // Filter by status
            if let filter = selectedFilter {
                guard recording.recordingStatus == filter else { return false }
            }

            // Filter by search text
            if !searchText.isEmpty {
                let matchesTitle = recording.title.localizedCaseInsensitiveContains(searchText)
                let matchesTranscript = recording.fullTranscript?.localizedCaseInsensitiveContains(searchText) ?? false
                return matchesTitle || matchesTranscript
            }

            return true
        }
    }

    // MARK: - Recordings List

    private var recordingsList: some View {
        List {
            // Filter section
            Section {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        filterChip(label: "All", status: nil)

                        filterChip(label: "Ready", status: .ready)

                        filterChip(label: "Processing", status: .processing)

                        filterChip(label: "Failed", status: .failed)
                    }
                    .padding(.vertical, 8)
                }
            }
            .listRowInsets(EdgeInsets())
            .listRowBackground(Color.clear)

            // Recordings
            Section {
                ForEach(filteredRecordings) { recording in
                    NavigationLink {
                        LessonReviewView(recording: recording)
                    } label: {
                        recordingRow(recording)
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                        Button(role: .destructive) {
                            recordingToDelete = recording
                            showingDeleteConfirmation = true
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                }
            }
        }
    }

    // MARK: - Recording Row

    private func recordingRow(_ recording: LessonRecording) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(recording.title)
                    .font(.headline)

                Spacer()

                statusIcon(for: recording.recordingStatus)
            }

            HStack {
                Label(recording.formattedDuration, systemImage: "clock")
                Label(recording.formattedFileSize, systemImage: "internaldrive")

                if recording.totalWords > 0 {
                    Label("\(recording.totalWords) words", systemImage: "text.alignleft")
                }
            }
            .font(.caption)
            .foregroundColor(.secondary)

            if recording.recordingStatus == .processing {
                ProgressView(value: recording.processingProgress) {
                    Text("Processing: \(Int(recording.processingProgress * 100))%")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            if let summary = recording.overallSummary, !summary.isEmpty {
                Text(summary)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }

            Text(recording.recordingDate, style: .relative)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }

    // MARK: - Filter Chip

    private func filterChip(label: String, status: RecordingStatus?) -> some View {
        Button {
            selectedFilter = (selectedFilter == status) ? nil : status
        } label: {
            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    selectedFilter == status
                        ? Color.blue
                        : Color(uiColor: .secondarySystemBackground)
                )
                .foregroundColor(
                    selectedFilter == status
                        ? .white
                        : .primary
                )
                .cornerRadius(20)
        }
    }

    // MARK: - Status Icon

    private func statusIcon(for status: RecordingStatus) -> some View {
        Group {
            switch status {
            case .recording:
                Image(systemName: "record.circle")
                    .foregroundColor(.red)
            case .processing:
                ProgressView()
                    .scaleEffect(0.8)
            case .ready:
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
            case .failed:
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.red)
            }
        }
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Spacer()

            Image(systemName: "waveform.circle")
                .font(.system(size: 80))
                .foregroundColor(.secondary)

            Text("No Recordings Yet")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Start recording your lessons to get automatic transcriptions, summaries, and mind maps.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Button {
                showingNewRecording = true
            } label: {
                Label("Start Recording", systemImage: "mic.fill")
                    .font(.headline)
                    .foregroundColor(.white)
                    .padding()
                    .background(Color.red)
                    .cornerRadius(12)
            }
            .padding(.top, 20)

            Spacer()
        }
    }

    // MARK: - Actions

    private func deleteRecording(_ recording: LessonRecording) {
        do {
            try recordingService.deleteRecording(recording)
        } catch {
            print("Failed to delete recording: \(error)")
        }
    }
}

#Preview {
    LessonRecordingsListView()
        .modelContainer(for: [LessonRecording.self])
}
