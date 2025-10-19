import SwiftUI

/// Today dashboard card displaying aggregated study information
struct TodayCardView: View {
    @StateObject private var todayService = TodayService()
    @State private var isSpeakingSummary = false

    var body: some View {
        VStack(spacing: 0) {
            if todayService.isLoading {
                loadingView
            } else if let model = todayService.todayModel {
                contentView(model: model)
            } else {
                emptyStateView
            }
        }
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 4)
        .task {
            await todayService.refreshTodayData()
        }
    }

    // MARK: - Content View

    private func contentView(model: TodayModel) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            headerView(model: model)

            Divider()

            // Progress Section
            progressSection(progress: model.todayProgress)

            // Tasks Section
            if !model.topTasks.isEmpty {
                tasksSection(tasks: model.topTasks)
            }

            // Materials Section
            if !model.upcomingMaterials.isEmpty {
                materialsSection(materials: model.upcomingMaterials)
            }

            // Actions
            actionsSection
        }
        .padding()
    }

    // MARK: - Header

    private func headerView(model: TodayModel) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Today")
                    .font(.title2)
                    .fontWeight(.bold)

                Text(model.date, style: .date)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Spacer()

            // Streak badge
            if model.studyStreak > 0 {
                HStack(spacing: 4) {
                    Image(systemName: "flame.fill")
                        .foregroundColor(.orange)
                    Text("\(model.studyStreak)")
                        .fontWeight(.semibold)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.orange.opacity(0.2))
                .cornerRadius(12)
            }
        }
    }

    // MARK: - Progress

    private func progressSection(progress: TodayModel.TodayProgress) -> some View {
        VStack(spacing: 12) {
            // Progress bar
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Tasks")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    Spacer()
                    Text("\(progress.completedTasks)/\(progress.totalTasks)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                ProgressView(value: progress.completionPercentage)
                    .tint(.blue)
            }

            // Stats grid
            HStack(spacing: 16) {
                statCard(
                    icon: "clock.fill",
                    value: "\(progress.studyMinutes)",
                    label: "min",
                    color: .green
                )

                statCard(
                    icon: "book.fill",
                    value: "\(progress.materialsReviewed)",
                    label: "reviewed",
                    color: .purple
                )
            }
        }
    }

    private func statCard(icon: String, value: String, label: String, color: Color) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(color)

            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(.headline)
                Text(label)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(color.opacity(0.1))
        .cornerRadius(12)
    }

    // MARK: - Tasks Section

    private func tasksSection(tasks: [TodayTask]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Priority Tasks")
                .font(.subheadline)
                .fontWeight(.semibold)

            ForEach(tasks.prefix(3)) { task in
                taskRow(task: task)
            }
        }
    }

    private func taskRow(task: TodayTask) -> some View {
        HStack(spacing: 12) {
            Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                .foregroundColor(task.isCompleted ? .green : .gray)

            VStack(alignment: .leading, spacing: 2) {
                Text(task.title)
                    .font(.subheadline)
                    .lineLimit(1)

                if let subject = task.subject {
                    Text(subject)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            priorityBadge(priority: task.priority)
        }
        .padding(.vertical, 4)
    }

    private func priorityBadge(priority: TodayTask.Priority) -> some View {
        Text(priority.rawValue)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(priorityColor(priority).opacity(0.2))
            .foregroundColor(priorityColor(priority))
            .cornerRadius(8)
    }

    private func priorityColor(_ priority: TodayTask.Priority) -> Color {
        switch priority {
        case .high: return .red
        case .medium: return .orange
        case .low: return .blue
        }
    }

    // MARK: - Materials Section

    private func materialsSection(materials: [TodayMaterial]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Recommended Materials")
                .font(.subheadline)
                .fontWeight(.semibold)

            ForEach(materials.prefix(2)) { material in
                materialRow(material: material)
            }
        }
    }

    private func materialRow(material: TodayMaterial) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "book.circle.fill")
                .foregroundColor(.blue)

            VStack(alignment: .leading, spacing: 2) {
                Text(material.title)
                    .font(.subheadline)
                    .lineLimit(1)

                Text("\(material.subject) • \(material.difficulty)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            Spacer()

            if material.isRecommended {
                Image(systemName: "star.fill")
                    .foregroundColor(.yellow)
                    .font(.caption)
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Actions

    private var actionsSection: some View {
        HStack(spacing: 12) {
            Button {
                Task {
                    await todayService.refreshTodayData()
                }
            } label: {
                Label("Refresh", systemImage: "arrow.clockwise")
                    .font(.subheadline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)

            Button {
                speakSummary()
            } label: {
                Label(isSpeakingSummary ? "Speaking..." : "Hear Summary", systemImage: "speaker.wave.2.fill")
                    .font(.subheadline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(isSpeakingSummary)
        }
    }

    // MARK: - Loading & Empty States

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
            Text("Loading today's data...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(40)
    }

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "sun.max.fill")
                .font(.largeTitle)
                .foregroundColor(.orange)

            Text("No data available")
                .font(.headline)

            Text("Pull to refresh or check your connection")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            Button("Retry") {
                Task {
                    await todayService.refreshTodayData()
                }
            }
            .buttonStyle(.borderedProminent)
        }
        .padding(40)
    }

    // MARK: - Voice Summary

    private func speakSummary() {
        isSpeakingSummary = true

        let summary = todayService.generateVoiceSummary()

        // Use AVSpeechSynthesizer for voice output
        let synthesizer = AVSpeechSynthesizer()
        let utterance = AVSpeechUtterance(string: summary)
        utterance.voice = AVSpeechSynthesisVoice(language: "it-IT")
        utterance.rate = 0.5

        synthesizer.speak(utterance)

        // Reset state after a delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
            isSpeakingSummary = false
        }
    }
}

import AVFoundation

// MARK: - Preview

#Preview {
    TodayCardView()
        .padding()
}
