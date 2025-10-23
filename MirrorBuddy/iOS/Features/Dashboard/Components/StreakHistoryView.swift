import SwiftUI

/// Streak history view showing study streak statistics (Task 137.4)
struct StreakHistoryView: View {
    @Environment(\.dismiss) private var dismiss
    let userProgress: UserProgress

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Current Streak Card
                    VStack(spacing: 16) {
                        Image(systemName: "flame.fill")
                            .font(.system(size: 60))
                            .foregroundStyle(.orange)

                        VStack(spacing: 8) {
                            Text("\(userProgress.currentStreak)")
                                .font(.system(size: 48, weight: .bold))
                                .foregroundStyle(.primary)

                            Text("Giorni consecutivi")
                                .font(.headline)
                                .foregroundStyle(.secondary)
                        }

                        if userProgress.currentStreak > 0 {
                            Text("Continua così!")
                                .font(.subheadline)
                                .foregroundStyle(.orange)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color.orange.opacity(0.1))
                    )

                    // Statistics
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Statistiche")
                            .font(.headline)
                            .padding(.horizontal)

                        VStack(spacing: 12) {
                            StreakStatRow(
                                icon: "trophy.fill",
                                label: "Record personale",
                                value: "\(userProgress.longestStreak) giorni",
                                color: .yellow
                            )

                            if let lastStudy = userProgress.lastStudyDate {
                                StreakStatRow(
                                    icon: "calendar.circle.fill",
                                    label: "Ultimo studio",
                                    value: lastStudy.formatted(date: .abbreviated, time: .omitted),
                                    color: .blue
                                )
                            }

                            StreakStatRow(
                                icon: "book.fill",
                                label: "Materiali creati",
                                value: "\(userProgress.materialsCreated)",
                                color: .green
                            )

                            StreakStatRow(
                                icon: "rectangle.portrait.on.rectangle.portrait.fill",
                                label: "Flashcard riviste",
                                value: "\(userProgress.flashcardsReviewed)",
                                color: .purple
                            )

                            StreakStatRow(
                                icon: "checkmark.circle.fill",
                                label: "Task completati",
                                value: "\(userProgress.tasksCompleted)",
                                color: .green
                            )
                        }
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color(.secondarySystemGroupedBackground))
                        )
                    }

                    // Achievements
                    if !userProgress.unlockedAchievements.isEmpty {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Obiettivi raggiunti")
                                .font(.headline)
                                .padding(.horizontal)

                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: 12) {
                                ForEach(userProgress.unlockedAchievements, id: \.self) { achievement in
                                    AchievementBadge(achievement: achievement)
                                }
                            }
                            .padding()
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color(.secondarySystemGroupedBackground))
                            )
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Cronologia Streak")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Chiudi") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - StreakStatRow

struct StreakStatRow: View {
    let icon: String
    let label: String
    let value: String
    let color: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
                .frame(width: 32)

            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()

            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.primary)
        }
    }
}

// MARK: - AchievementBadge

struct AchievementBadge: View {
    let achievement: Achievement

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(Color.yellow.opacity(0.2))
                    .frame(width: 60, height: 60)

                Image(systemName: achievement.iconName)
                    .font(.title2)
                    .foregroundStyle(.yellow)
            }

            Text(achievement.localizedTitle)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Preview

#Preview {
    let progress = UserProgress()
    progress.currentStreak = 7
    progress.longestStreak = 15
    progress.materialsCreated = 12
    progress.flashcardsReviewed = 145
    progress.tasksCompleted = 23
    progress.lastStudyDate = Date()
    progress.unlockedAchievements = [.firstMaterial, .streak7Days, .firstFlashcard]

    return StreakHistoryView(userProgress: progress)
}
