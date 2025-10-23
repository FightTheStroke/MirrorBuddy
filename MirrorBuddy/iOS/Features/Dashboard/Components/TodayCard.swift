import SwiftData
import SwiftUI

/// Today Card - Personalized daily priorities and quick actions (Task 137.2)
///
/// Addresses Pain Point #6: Missing "Today" Card from UX analysis
/// Shows:
/// - Top 3 priority materials for today
/// - Study statistics (streak, completed today, deadlines)
/// - Quick access to voice coach
///
/// Priority Algorithm:
/// - Deadline proximity (highest weight)
/// - Has study assets ready (mind maps, flashcards)
/// - Recent activity
/// - New materials never accessed
struct TodayCard: View {
    let todayPriorities: [Material]
    let studyStreak: Int
    let completedToday: Int
    let upcomingDeadlines: Int

    @State private var isAnimating = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                Image(systemName: "sun.max.fill")
                    .foregroundStyle(.orange)
                    .font(.title2)
                    .symbolEffect(.bounce, value: isAnimating)

                Text("Oggi")
                    .font(.title2)
                    .fontWeight(.bold)

                Spacer()

                Text(Date().formatted(date: .abbreviated, time: .omitted))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Priority Materials (max 3)
            if todayPriorities.isEmpty {
                emptyState
            } else {
                ForEach(Array(todayPriorities.enumerated()), id: \.element.id) { index, material in
                    TodayMaterialRow(material: material, rank: index + 1)
                        .transition(.scale.combined(with: .opacity))
                }
            }

            // Quick Stats
            HStack(spacing: 20) {
                StatBadge(
                    icon: "flame.fill",
                    value: "\(studyStreak)",
                    label: "giorni",
                    color: .orange
                )

                StatBadge(
                    icon: "checkmark.circle.fill",
                    value: "\(completedToday)",
                    label: "oggi",
                    color: .green
                )

                StatBadge(
                    icon: "calendar.badge.exclamationmark",
                    value: "\(upcomingDeadlines)",
                    label: "scadenze",
                    color: .red
                )
            }
        }
        .padding()
        .background(
            LinearGradient(
                colors: [
                    Color.blue.opacity(0.1),
                    Color.purple.opacity(0.1)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
        .onAppear {
            withAnimation(.easeInOut(duration: 0.5)) {
                isAnimating = true
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 48))
                .foregroundStyle(.green)

            Text("Tutto fatto!")
                .font(.headline)

            Text("Nessun materiale in scadenza oggi")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
    }
}

// MARK: - TodayMaterialRow

/// Compact material row for Today card priority list
struct TodayMaterialRow: View {
    let material: Material
    let rank: Int

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        HStack(spacing: 12) {
            // Rank badge
            ZStack {
                Circle()
                    .fill(rankColor.opacity(0.2))
                    .frame(width: 32, height: 32)

                Text("\(rank)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(rankColor)
            }

            // Material info
            VStack(alignment: .leading, spacing: 4) {
                Text(material.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    // Subject badge
                    if let subject = material.subject {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(subject.color)
                                .frame(width: 6, height: 6)

                            Text(subject.displayName)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }

                    // Assets available
                    if material.mindMap != nil {
                        Image(systemName: "brain.fill")
                            .font(.caption2)
                            .foregroundStyle(.blue)
                    }
                    if !(material.flashcards?.isEmpty ?? true) {
                        Image(systemName: "rectangle.portrait.on.rectangle.portrait.fill")
                            .font(.caption2)
                            .foregroundStyle(.purple)
                    }
                }
            }

            Spacer()

            // Deadline indicator
            if let task = material.tasks?.first, let dueDate = task.dueDate {
                deadlineIndicator(for: dueDate)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(uiColor: colorScheme == .dark ?
                                .secondarySystemGroupedBackground : .systemBackground))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(rankColor.opacity(0.3), lineWidth: 1)
        )
    }

    // MARK: - Helpers

    private var rankColor: Color {
        switch rank {
        case 1: return .red
        case 2: return .orange
        case 3: return .yellow
        default: return .gray
        }
    }

    private func deadlineIndicator(for date: Date) -> some View {
        let daysUntil = Calendar.current.dateComponents([.day], from: Date(), to: date).day ?? 999

        let (text, color): (String, Color) = {
            if daysUntil < 0 {
                return ("Scaduto", .red)
            } else if daysUntil == 0 {
                return ("Oggi", .red)
            } else if daysUntil == 1 {
                return ("Domani", .orange)
            } else if daysUntil <= 7 {
                return ("\(daysUntil)g", .yellow)
            } else {
                return ("\(daysUntil)g", .gray)
            }
        }()

        return Text(text)
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundStyle(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color)
            .clipShape(Capsule())
    }
}

// MARK: - StatBadge

/// Study statistics badge with icon, value, and label
struct StatBadge: View {
    let icon: String
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)

            Text(value)
                .font(.headline)
                .fontWeight(.bold)

            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Preview

#Preview {
    let config = ModelConfiguration(isStoredInMemoryOnly: true)
    guard let container = try? ModelContainer(for: Material.self, configurations: config) else {
        return Text("Preview unavailable")
    }

    // Create sample materials
    let material1 = Material(title: "Matematica - Equazioni", subject: nil)
    let material2 = Material(title: "Storia - Rivoluzione Francese", subject: nil)
    let material3 = Material(title: "Inglese - Present Perfect", subject: nil)

    container.mainContext.insert(material1)
    container.mainContext.insert(material2)
    container.mainContext.insert(material3)

    return ScrollView {
        VStack(spacing: 20) {
            // With priorities
            TodayCard(
                todayPriorities: [material1, material2, material3],
                studyStreak: 7,
                completedToday: 3,
                upcomingDeadlines: 2
            )

            // Empty state
            TodayCard(
                todayPriorities: [],
                studyStreak: 5,
                completedToday: 0,
                upcomingDeadlines: 0
            )
        }
        .padding()
    }
    .modelContainer(container)
}
