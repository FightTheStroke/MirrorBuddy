//
//  ProfileView.swift
//  MirrorBuddy
//
//  Task 110: Voice command sheet for user profile
//  Shows user statistics, level, achievements, and study streak
//

import SwiftData
import SwiftUI

/// User profile view with gamification stats (Task 110)
struct ProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @Query private var userProgress: [UserProgress]

    private var progress: UserProgress? {
        userProgress.first
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Level and XP Section
                    levelSection

                    // Streak Section
                    streakSection

                    // Statistics Section
                    statisticsSection

                    // Achievements Section
                    achievementsSection
                }
                .padding()
            }
            .navigationTitle("Il Tuo Profilo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Chiudi") {
                        dismiss()
                    }
                    .buttonStyle(.icon(color: .blue, size: 44))
                }
            }
            .background(Color(.systemGroupedBackground))
        }
    }

    // MARK: - Level Section

    private var levelSection: some View {
        VStack(spacing: 16) {
            // Avatar with level
            ZStack {
                Circle()
                    .fill(LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(width: 120, height: 120)

                VStack(spacing: 4) {
                    Image(systemName: "person.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(.white)

                    Text("Livello \(progress?.level ?? 1)")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                }
            }

            // XP Progress
            VStack(spacing: 8) {
                HStack {
                    Text("\(progress?.totalXP ?? 0) XP")
                        .font(.headline)

                    Spacer()

                    Text("\(progress?.xpForNextLevel ?? 100) XP")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                ProgressView(value: progress?.levelProgress ?? 0.0)
                    .tint(.blue)
                    .scaleEffect(y: 2)

                Text("Prossimo livello")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
    }

    // MARK: - Streak Section

    private var streakSection: some View {
        VStack(spacing: 12) {
            Text("Serie di Studio")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)

            HStack(spacing: 20) {
                // Current Streak
                StatCard(
                    icon: "flame.fill",
                    title: "Serie Attuale",
                    value: "\(progress?.currentStreak ?? 0)",
                    subtitle: "giorni",
                    color: .orange
                )

                // Longest Streak
                StatCard(
                    icon: "star.fill",
                    title: "Record",
                    value: "\(progress?.longestStreak ?? 0)",
                    subtitle: "giorni",
                    color: .yellow
                )
            }
        }
    }

    // MARK: - Statistics Section

    private var statisticsSection: some View {
        VStack(spacing: 12) {
            Text("Statistiche")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)

            VStack(spacing: 12) {
                StatRow(
                    icon: "clock.fill",
                    title: "Tempo di Studio",
                    value: "\(progress?.totalStudyTimeMinutes ?? 0) min",
                    color: .blue
                )

                StatRow(
                    icon: "doc.fill",
                    title: "Materiali Creati",
                    value: "\(progress?.materialsCreated ?? 0)",
                    color: .green
                )

                StatRow(
                    icon: "rectangle.portrait.on.rectangle.portrait.fill",
                    title: "Flashcard Ripassate",
                    value: "\(progress?.flashcardsReviewed ?? 0)",
                    color: .purple
                )

                StatRow(
                    icon: "brain.head.profile",
                    title: "Mappe Mentali",
                    value: "\(progress?.mindMapsGenerated ?? 0)",
                    color: .pink
                )

                StatRow(
                    icon: "checkmark.circle.fill",
                    title: "Compiti Completati",
                    value: "\(progress?.tasksCompleted ?? 0)",
                    color: .orange
                )
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
    }

    // MARK: - Achievements Section

    private var achievementsSection: some View {
        VStack(spacing: 12) {
            Text("Traguardi")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)

            if let achievements = progress?.unlockedAchievements, !achievements.isEmpty {
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 12) {
                    ForEach(achievements, id: \.rawValue) { achievement in
                        AchievementCard(achievement: achievement, unlocked: true)
                    }
                }
            } else {
                Text("Nessun traguardo sbloccato ancora")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
            }

            // Show locked achievements
            let unlockedSet = Set(progress?.unlockedAchievements ?? [])
            let lockedAchievements = Achievement.allCases.filter { !unlockedSet.contains($0) }

            if !lockedAchievements.isEmpty {
                Text("Da Sbloccare")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 8)

                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 12) {
                    ForEach(lockedAchievements, id: \.rawValue) { achievement in
                        AchievementCard(achievement: achievement, unlocked: false)
                    }
                }
            }
        }
    }
}

// MARK: - Supporting Views

/// Stat card for streak display
struct StatCard: View {
    let icon: String
    let title: String
    let value: String
    let subtitle: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 32))
                .foregroundStyle(color)

            Text(value)
                .font(.title2)
                .fontWeight(.bold)

            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)

            Text(subtitle)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
}

/// Stat row for statistics list
struct StatRow: View {
    let icon: String
    let title: String
    let value: String
    let color: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
                .frame(width: 32)

            Text(title)
                .font(.subheadline)

            Spacer()

            Text(value)
                .font(.headline)
                .foregroundStyle(.secondary)
        }
    }
}

/// Achievement card (locked/unlocked)
struct AchievementCard: View {
    let achievement: Achievement
    let unlocked: Bool

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: achievement.iconName)
                .font(.system(size: 40))
                .foregroundStyle(unlocked ? .yellow : .gray)

            Text(achievement.localizedTitle)
                .font(.caption)
                .fontWeight(.semibold)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .foregroundStyle(unlocked ? .primary : .secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(unlocked ? Color.yellow.opacity(0.1) : Color(.systemGray6))
        .cornerRadius(12)
        .opacity(unlocked ? 1.0 : 0.5)
    }
}

// MARK: - Preview

#Preview {
    ProfileView()
        .modelContainer(for: UserProgress.self, inMemory: true)
}
