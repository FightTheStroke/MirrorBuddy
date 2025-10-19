//
//  ReviewScheduleView.swift
//  MirrorBuddy
//
//  View for displaying upcoming flashcard review schedule
//  and spaced repetition analytics.
//

import SwiftUI
import SwiftData

struct ReviewScheduleView: View {
    @Query private var flashcards: [Flashcard]
    @State private var schedule: [Date: Int] = [:]
    @State private var statistics: ReviewStatistics?
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Statistics header
                if let stats = statistics {
                    StatisticsHeaderView(statistics: stats)
                }

                // Schedule list
                if !sortedDates().isEmpty {
                    VStack(spacing: 0) {
                        ForEach(sortedDates(), id: \.self) { date in
                            if let count = schedule[date] {
                                ScheduleRowView(date: date, count: count)
                                    .padding(.horizontal)
                                    .padding(.vertical, 8)

                                if date != sortedDates().last {
                                    Divider()
                                        .padding(.leading, 60)
                                }
                            }
                        }
                    }
                    .background(Color.gray.opacity(0.05))
                    .cornerRadius(12)
                    .padding(.horizontal)
                } else if !isLoading {
                    EmptyScheduleView()
                }
            }
            .padding(.vertical)
        }
        .navigationTitle("Review Schedule")
        .navigationBarTitleDisplayMode(.inline)
        .overlay {
            if isLoading {
                ProgressView()
            }
        }
        .task {
            await loadSchedule()
        }
        .refreshable {
            await loadSchedule()
        }
    }

    private func loadSchedule() async {
        let service = SpacedRepetitionService.shared
        schedule = await service.getReviewSchedule(for: flashcards)
        statistics = await service.getReviewStatistics(for: flashcards, days: 7)
        isLoading = false
    }

    private func sortedDates() -> [Date] {
        schedule.keys.sorted()
    }
}

// MARK: - Statistics Header

struct StatisticsHeaderView: View {
    let statistics: ReviewStatistics

    var body: some View {
        VStack(spacing: 16) {
            // Title
            HStack {
                Text("Overview")
                    .font(.title2.bold())

                Spacer()
            }
            .padding(.horizontal)

            // Stats grid
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                StatCard(
                    icon: "calendar.badge.clock",
                    title: "Due Today",
                    value: "\(statistics.dueToday)",
                    color: statistics.dueToday > 0 ? .blue : .green
                )

                StatCard(
                    icon: "calendar.badge.exclamationmark",
                    title: "This Week",
                    value: "\(statistics.dueThisWeek)",
                    color: .orange
                )

                StatCard(
                    icon: "rectangle.stack",
                    title: "Total Cards",
                    value: "\(statistics.totalFlashcards)",
                    color: .purple
                )

                StatCard(
                    icon: "chart.line.uptrend.xyaxis",
                    title: "Retention",
                    value: String(format: "%.0f%%", statistics.retentionRate * 100),
                    color: statistics.retentionRate > 0.7 ? .green : .orange
                )
            }
            .padding(.horizontal)
        }
    }
}

struct StatCard: View {
    let icon: String
    let title: String
    let value: String
    let color: Color

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)

            Text(value)
                .font(.title.bold())
                .foregroundStyle(color)

            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(color.opacity(0.1))
        .cornerRadius(12)
    }
}

// MARK: - Schedule Row

struct ScheduleRowView: View {
    let date: Date
    let count: Int

    private var isToday: Bool {
        Calendar.current.isDateInToday(date)
    }

    private var isPast: Bool {
        date < Calendar.current.startOfDay(for: Date())
    }

    private var statusColor: Color {
        if isPast { return .red }
        if isToday { return .blue }
        return .green
    }

    private var statusText: String {
        if isPast { return "Overdue" }
        if isToday { return "Today" }
        return "Upcoming"
    }

    var body: some View {
        HStack(spacing: 16) {
            // Date indicator
            VStack(spacing: 4) {
                Text(formatDay(date))
                    .font(.caption2.bold())
                    .foregroundStyle(.secondary)

                Text(formatDate(date))
                    .font(.title3.bold())
                    .foregroundStyle(statusColor)
            }
            .frame(width: 50)

            // Divider line
            Rectangle()
                .fill(statusColor.opacity(0.3))
                .frame(width: 2)
                .frame(height: 50)

            // Card count
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("\(count)")
                        .font(.title2.bold())

                    Text(count == 1 ? "card" : "cards")
                        .font(.headline)
                        .foregroundStyle(.secondary)

                    Spacer()

                    // Status badge
                    Text(statusText)
                        .font(.caption.bold())
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(statusColor)
                        .cornerRadius(6)
                }

                // Relative time
                Text(formatRelativeTime(date))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Chevron
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private func formatDay(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter.string(from: date).uppercased()
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter.string(from: date)
    }

    private func formatRelativeTime(_ date: Date) -> String {
        let calendar = Calendar.current
        let now = calendar.startOfDay(for: Date())
        let targetDate = calendar.startOfDay(for: date)

        let components = calendar.dateComponents([.day], from: now, to: targetDate)

        if let days = components.day {
            if days == 0 {
                return "Today"
            } else if days == 1 {
                return "Tomorrow"
            } else if days == -1 {
                return "Yesterday"
            } else if days < 0 {
                return "\(abs(days)) days ago"
            } else {
                return "In \(days) days"
            }
        }

        return ""
    }
}

// MARK: - Empty State

struct EmptyScheduleView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "calendar.badge.exclamationmark")
                .font(.system(size: 64))
                .foregroundStyle(.secondary)

            Text("No Reviews Scheduled")
                .font(.title2.bold())

            Text("Start reviewing flashcards to see your schedule")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .padding(.vertical, 60)
    }
}

// MARK: - Preview

#Preview("With Schedule") {
    NavigationStack {
        ReviewScheduleView()
            .modelContainer(for: Flashcard.self, inMemory: true)
    }
}

#Preview("Empty") {
    NavigationStack {
        ReviewScheduleView()
            .modelContainer(for: Flashcard.self, inMemory: true)
    }
}
