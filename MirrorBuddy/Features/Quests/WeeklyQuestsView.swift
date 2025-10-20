import SwiftData
import SwiftUI

/// View for displaying weekly quests (Task 131.2)
struct WeeklyQuestsView: View {
    @Environment(\.dismiss) private var dismiss
    @Query private var userProgress: [UserProgress]

    @State private var activeQuests: [WeeklyQuest] = []
    @State private var badges: [QuestBadge] = []
    @State private var statistics: QuestStatistics?
    @State private var isLoading = true
    @State private var showingCelebration = false
    @State private var claimedReward: QuestReward?

    private var progress: UserProgress? {
        userProgress.first
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    headerSection

                    // Statistics
                    if let stats = statistics {
                        statisticsSection(stats)
                    }

                    // Active Quests
                    activeQuestsSection

                    // Badges
                    badgesSection
                }
                .padding()
            }
            .navigationTitle("Weekly Quests")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                    .buttonStyle(.icon(color: .blue, size: 44))
                }
            }
            .background(Color(.systemGroupedBackground))
        }
        .sheet(isPresented: $showingCelebration) {
            if let reward = claimedReward {
                QuestRewardCelebrationView(reward: reward)
            }
        }
        .task {
            await loadQuestData()
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(LinearGradient(
                        colors: [.purple, .blue],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(width: 100, height: 100)

                Image(systemName: "flag.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(.white)
            }

            Text("Weekly Challenges")
                .font(.title2)
                .fontWeight(.bold)

            Text("Complete quests to earn XP and badges!")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Statistics

    private func statisticsSection(_ stats: QuestStatistics) -> some View {
        VStack(spacing: 12) {
            Text("Your Progress")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)

            HStack(spacing: 16) {
                StatCard(
                    title: "Completed",
                    value: "\(stats.totalQuestsCompleted)",
                    subtitle: "quests",
                    icon: "checkmark.circle.fill",
                    color: .green
                )

                StatCard(
                    title: "Badges",
                    value: "\(stats.badgesEarned)",
                    subtitle: "earned",
                    icon: "trophy.fill",
                    color: .yellow
                )
            }

            // Week progress
            VStack(spacing: 8) {
                HStack {
                    Text("This Week")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    Spacer()

                    Text("\(Int(stats.currentWeekProgress * 100))%")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                ProgressView(value: stats.currentWeekProgress)
                    .tint(.blue)
                    .scaleEffect(y: 2)
            }
            .padding()
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    // MARK: - Active Quests

    private var activeQuestsSection: some View {
        VStack(spacing: 12) {
            Text("Active Quests")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)

            if isLoading {
                ProgressView()
                    .padding()
            } else if activeQuests.isEmpty {
                emptyQuestsView
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(activeQuests) { quest in
                        QuestCard(quest: quest) {
                            handleQuestClaim(quest)
                        }
                    }
                }
            }
        }
    }

    private var emptyQuestsView: some View {
        VStack(spacing: 12) {
            Image(systemName: "tray")
                .font(.system(size: 40))
                .foregroundStyle(.secondary)

            Text("No Active Quests")
                .font(.headline)

            Button("Generate New Quests") {
                Task {
                    await generateNewQuests()
                }
            }
            .buttonStyle(.bordered)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Badges

    private var badgesSection: some View {
        VStack(spacing: 12) {
            Text("Your Badges")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)

            if badges.isEmpty {
                Text("Complete hard quests to earn badges!")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            } else {
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 12) {
                    ForEach(badges) { badge in
                        BadgeCard(badge: badge)
                    }
                }
            }
        }
    }

    // MARK: - Actions

    private func loadQuestData() async {
        do {
            let questService = WeeklyQuestService.shared
            activeQuests = try questService.getActiveQuests()
            badges = try questService.getUserBadges()
            statistics = try questService.getQuestStatistics()
            isLoading = false

            // Generate quests if none exist
            if activeQuests.isEmpty {
                await generateNewQuests()
            }
        } catch {
            print("Error loading quest data: \(error)")
            isLoading = false
        }
    }

    private func generateNewQuests() async {
        do {
            let questService = WeeklyQuestService.shared
            activeQuests = try questService.generateWeeklyQuests(count: 3)
            statistics = try questService.getQuestStatistics()
        } catch {
            print("Error generating quests: \(error)")
        }
    }

    private func handleQuestClaim(_ quest: WeeklyQuest) {
        guard let progress = progress else { return }

        do {
            let questService = WeeklyQuestService.shared
            let reward = try questService.claimQuestReward(quest: quest, userProgress: progress)
            claimedReward = reward
            showingCelebration = true

            // Reload data
            Task {
                await loadQuestData()
            }
        } catch {
            print("Error claiming quest: \(error)")
        }
    }
}

// MARK: - Quest Card

struct QuestCard: View {
    let quest: WeeklyQuest
    let onClaim: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: quest.iconName)
                    .font(.title2)
                    .foregroundStyle(difficultyColor)
                    .frame(width: 50, height: 50)
                    .background(difficultyColor.opacity(0.1))
                    .clipShape(Circle())

                VStack(alignment: .leading, spacing: 4) {
                    Text(quest.title)
                        .font(.headline)

                    HStack {
                        Text(quest.difficulty.rawValue.capitalized)
                            .font(.caption)
                            .foregroundStyle(difficultyColor)

                        Text("•")
                            .foregroundStyle(.secondary)

                        Text("\(quest.totalXP) XP")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                if quest.isReadyToClaim {
                    Button(action: onClaim) {
                        Image(systemName: "gift.fill")
                            .font(.title3)
                            .foregroundStyle(.white)
                            .frame(width: 44, height: 44)
                            .background(Color.green)
                            .clipShape(Circle())
                    }
                }
            }

            Text(quest.questDescription)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            // Progress bar
            VStack(spacing: 4) {
                HStack {
                    Text("\(quest.currentValue) / \(quest.targetValue)")
                        .font(.caption)
                        .fontWeight(.medium)

                    Spacer()

                    Text("\(Int(quest.progress * 100))%")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color(.systemGray5))

                        Rectangle()
                            .fill(difficultyColor)
                            .frame(width: geometry.size.width * quest.progress)
                    }
                }
                .frame(height: 8)
                .clipShape(Capsule())
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 2, y: 1)
    }

    private var difficultyColor: Color {
        switch quest.difficulty {
        case .easy: return .green
        case .medium: return .blue
        case .hard: return .purple
        case .legendary: return .orange
        }
    }
}

// MARK: - Badge Card

struct BadgeCard: View {
    let badge: QuestBadge

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(badgeColor.opacity(0.2))
                    .frame(width: 60, height: 60)

                Image(systemName: badge.iconName)
                    .font(.title2)
                    .foregroundStyle(badgeColor)
            }

            Text(badge.name)
                .font(.caption)
                .fontWeight(.semibold)
                .multilineTextAlignment(.center)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var badgeColor: Color {
        switch badge.color {
        case "gold": return .yellow
        case "silver": return .gray
        case "bronze": return .orange
        default: return .blue
        }
    }
}

// MARK: - Preview

#Preview {
    WeeklyQuestsView()
        .modelContainer(for: [UserProgress.self, WeeklyQuest.self, QuestBadge.self], inMemory: true)
}
