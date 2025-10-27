import SwiftData
import SwiftUI

/// Today Card - Personalized daily priorities and quick actions
///
/// Redesigned for clarity and visual hierarchy:
/// - Clear SF Pro typography with proper weights
/// - Improved spacing and breathing room
/// - Vibrant gradient background
/// - Smooth animations and transitions
/// - Better accessibility support
struct TodayCard: View {
    let todayPriorities: [Material]
    let studyStreak: Int
    let completedToday: Int
    let upcomingDeadlines: Int

    @State private var isAnimating = false

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // MARK: - Header
            header

            Divider()
                .background(Color.white.opacity(0.3))

            // MARK: - Priority Materials
            if todayPriorities.isEmpty {
                emptyState
            } else {
                VStack(spacing: 12) {
                    ForEach(Array(todayPriorities.prefix(3).enumerated()), id: \.element.id) { index, material in
                        TodayMaterialRow(material: material, rank: index + 1)
                            .transition(.scale.combined(with: .opacity))
                    }
                }
            }

            Divider()
                .background(Color.white.opacity(0.3))

            // MARK: - Quick Stats
            statsRow
        }
        .padding(20)
        .background {
            ZStack {
                // Vibrant gradient
                LinearGradient(
                    colors: [
                        Color(red: 0.4, green: 0.6, blue: 1.0),
                        Color(red: 0.6, green: 0.4, blue: 1.0)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                // Subtle pattern overlay
                LinearGradient(
                    colors: [
                        Color.white.opacity(0.1),
                        Color.clear
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .shadow(color: Color.blue.opacity(0.3), radius: 15, y: 8)
        .onAppear {
            withAnimation(.spring(response: 0.6, dampingFraction: 0.8)) {
                isAnimating = true
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            // Sun icon with animation
            Image(systemName: "sun.max.fill")
                .font(.system(size: 32, weight: .bold))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.yellow, .orange],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .symbolEffect(.bounce, value: isAnimating)
                .shadow(color: .yellow.opacity(0.5), radius: 4, y: 2)

            VStack(alignment: .leading, spacing: 2) {
                Text("Oggi")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)

                Text(formattedDate)
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundStyle(.white.opacity(0.8))
            }

            Spacer()

            // Optional: Add streak flame if > 0
            if studyStreak > 0 {
                HStack(spacing: 4) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(.orange)
                        .symbolEffect(.pulse, value: isAnimating)

                    Text("\(studyStreak)")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(
                    Capsule()
                        .fill(.white.opacity(0.2))
                        .overlay(
                            Capsule()
                                .strokeBorder(.white.opacity(0.3), lineWidth: 1)
                        )
                )
            }
        }
    }

    // MARK: - Stats Row

    private var statsRow: some View {
        HStack(spacing: 0) {
            StatBadge(
                icon: "checkmark.circle.fill",
                value: "\(completedToday)",
                label: "Completati",
                color: Color(red: 0.3, green: 0.9, blue: 0.5)
            )

            Divider()
                .frame(height: 50)
                .background(Color.white.opacity(0.3))

            StatBadge(
                icon: "calendar.badge.exclamationmark",
                value: "\(upcomingDeadlines)",
                label: "In Scadenza",
                color: upcomingDeadlines > 0 ? Color(red: 1.0, green: 0.6, blue: 0.2) : .white.opacity(0.7)
            )

            Divider()
                .frame(height: 50)
                .background(Color.white.opacity(0.3))

            StatBadge(
                icon: "brain.fill",
                value: "\(todayPriorities.count)",
                label: "Da Studiare",
                color: Color(red: 0.5, green: 0.8, blue: 1.0)
            )
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 56, weight: .bold))
                .foregroundStyle(
                    LinearGradient(
                        colors: [Color(red: 0.3, green: 0.9, blue: 0.5), Color(red: 0.2, green: 0.7, blue: 0.9)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .symbolEffect(.bounce, value: isAnimating)

            VStack(spacing: 6) {
                Text("Tutto Fatto!")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)

                Text("Nessun materiale in scadenza oggi.\nBuon lavoro! 🎉")
                    .font(.system(size: 15, weight: .medium, design: .rounded))
                    .foregroundStyle(.white.opacity(0.8))
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
    }

    // MARK: - Helpers

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "it_IT")
        formatter.dateFormat = "EEEE, d MMMM"
        return formatter.string(from: Date()).capitalized
    }
}

// MARK: - TodayMaterialRow

/// Compact material row for Today card priority list
struct TodayMaterialRow: View {
    let material: Material
    let rank: Int

    var body: some View {
        HStack(spacing: 14) {
            // Rank badge with gradient
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [rankColor, rankColor.opacity(0.7)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 36, height: 36)
                    .shadow(color: rankColor.opacity(0.3), radius: 4, y: 2)

                Text("\(rank)")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
            }

            // Material info
            VStack(alignment: .leading, spacing: 6) {
                Text(material.title)
                    .font(.system(size: 15, weight: .semibold, design: .default))
                    .foregroundStyle(.white)
                    .lineLimit(1)

                HStack(spacing: 10) {
                    // Subject badge
                    if let subject = material.subject {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(subject.color)
                                .frame(width: 8, height: 8)

                            Text(subject.displayName)
                                .font(.system(size: 12, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.9))
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(
                            Capsule()
                                .fill(.white.opacity(0.15))
                        )
                    }

                    // Assets available icons
                    HStack(spacing: 6) {
                        if material.mindMap != nil {
                            Image(systemName: "brain.fill")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(.white.opacity(0.8))
                        }
                        if !(material.flashcards?.isEmpty ?? true) {
                            Image(systemName: "rectangle.stack.fill")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(.white.opacity(0.8))
                        }
                    }
                }
            }

            Spacer()

            // Deadline indicator
            if let task = material.tasks?.first, let dueDate = task.dueDate {
                deadlineIndicator(for: dueDate)
            }
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(.white.opacity(0.15))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(.white.opacity(0.2), lineWidth: 1)
                )
        )
    }

    // MARK: - Helpers

    private var rankColor: Color {
        switch rank {
        case 1: return Color(red: 1.0, green: 0.3, blue: 0.3)  // Vivid red
        case 2: return Color(red: 1.0, green: 0.6, blue: 0.2)  // Vivid orange
        case 3: return Color(red: 1.0, green: 0.9, blue: 0.2)  // Vivid yellow
        default: return .white.opacity(0.5)
        }
    }

    private func deadlineIndicator(for date: Date) -> some View {
        let daysUntil = Calendar.current.dateComponents([.day], from: Date(), to: date).day ?? 999

        let (text, color): (String, Color) = {
            if daysUntil < 0 {
                return ("SCADUTO", Color(red: 1.0, green: 0.2, blue: 0.2))
            } else if daysUntil == 0 {
                return ("OGGI", Color(red: 1.0, green: 0.4, blue: 0.2))
            } else if daysUntil == 1 {
                return ("DOMANI", Color(red: 1.0, green: 0.6, blue: 0.2))
            } else if daysUntil <= 7 {
                return ("\(daysUntil) GIORNI", Color(red: 1.0, green: 0.8, blue: 0.2))
            } else {
                return ("\(daysUntil)g", .white.opacity(0.6))
            }
        }()

        return Text(text)
            .font(.system(size: 11, weight: .bold, design: .rounded))
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(color)
            .clipShape(Capsule())
            .shadow(color: color.opacity(0.3), radius: 3, y: 2)
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
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 24, weight: .semibold))
                .foregroundStyle(color)
                .symbolRenderingMode(.hierarchical)

            Text(value)
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundStyle(.white)

            Text(label)
                .font(.system(size: 11, weight: .medium, design: .rounded))
                .foregroundStyle(.white.opacity(0.8))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Preview

#Preview("With Priorities") {
    let config = ModelConfiguration(isStoredInMemoryOnly: true)
    guard let container = try? ModelContainer(for: Material.self, configurations: config) else {
        return Text("Preview unavailable")
    }

    // Create sample materials
    let material1 = Material(title: "Matematica - Equazioni di Secondo Grado", subject: nil)
    let material2 = Material(title: "Storia - Rivoluzione Francese 1789", subject: nil)
    let material3 = Material(title: "Inglese - Present Perfect Tense", subject: nil)

    container.mainContext.insert(material1)
    container.mainContext.insert(material2)
    container.mainContext.insert(material3)

    return ScrollView {
        TodayCard(
            todayPriorities: [material1, material2, material3],
            studyStreak: 12,
            completedToday: 5,
            upcomingDeadlines: 3
        )
        .padding()
    }
    .background(Color(.systemGroupedBackground))
    .modelContainer(container)
}

#Preview("Empty State") {
    let config = ModelConfiguration(isStoredInMemoryOnly: true)
    guard let container = try? ModelContainer(for: Material.self, configurations: config) else {
        return Text("Preview unavailable")
    }

    return ScrollView {
        TodayCard(
            todayPriorities: [],
            studyStreak: 7,
            completedToday: 2,
            upcomingDeadlines: 0
        )
        .padding()
    }
    .background(Color(.systemGroupedBackground))
    .modelContainer(container)
}
