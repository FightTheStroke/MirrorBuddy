import SwiftUI

/// Celebration view for quest completion (Task 131.3)
struct QuestRewardCelebrationView: View {
    @Environment(\.dismiss) private var dismiss
    let reward: QuestReward

    @State private var showConfetti = false
    @State private var scale: CGFloat = 0.5
    @State private var opacity: Double = 0

    var body: some View {
        ZStack {
            // Background
            Color.black.opacity(0.4)
                .ignoresSafeArea()

            // Celebration content
            VStack(spacing: 24) {
                Spacer()

                // Animated icon
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [.yellow, .orange],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 120, height: 120)
                        .scaleEffect(showConfetti ? 1.1 : 1.0)
                        .animation(.easeInOut(duration: 1).repeatForever(autoreverses: true), value: showConfetti)

                    Image(systemName: "trophy.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(.white)
                }
                .scaleEffect(scale)
                .opacity(opacity)

                // Quest completed text
                VStack(spacing: 8) {
                    Text("Quest Complete!")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)

                    Text(reward.quest.title)
                        .font(.headline)
                        .foregroundStyle(.white.opacity(0.9))
                }
                .scaleEffect(scale)
                .opacity(opacity)

                // Rewards
                VStack(spacing: 16) {
                    // XP reward
                    RewardRow(
                        icon: "star.fill",
                        title: "XP Earned",
                        value: "+\(reward.xpEarned)",
                        color: .blue
                    )

                    // Level up notification
                    if reward.xpAward.leveledUp {
                        RewardRow(
                            icon: "arrow.up.circle.fill",
                            title: "Level Up!",
                            value: "Level \(reward.xpAward.newLevel)",
                            color: .purple
                        )
                    }

                    // Badge if earned
                    if let badge = reward.badge {
                        RewardRow(
                            icon: badge.iconName,
                            title: "Badge Unlocked",
                            value: badge.name,
                            color: badge.color == "gold" ? .yellow : .gray
                        )
                    }
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(.ultraThinMaterial)
                )
                .scaleEffect(scale)
                .opacity(opacity)

                Spacer()

                // Continue button
                Button(action: {
                    dismiss()
                }) {
                    Text("Awesome!")
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            LinearGradient(
                                colors: [.blue, .purple],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .scaleEffect(scale)
                .opacity(opacity)
            }
            .padding()

            // Confetti overlay
            if showConfetti {
                ConfettiView()
            }
        }
        .onAppear {
            // Animate entrance
            withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
                scale = 1.0
                opacity = 1.0
            }

            // Trigger confetti
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                showConfetti = true
            }

            // Play celebration haptic
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.success)
        }
    }
}

// MARK: - Reward Row

struct RewardRow: View {
    let icon: String
    let title: String
    let value: String
    let color: Color

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)
                .frame(width: 40)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Text(value)
                    .font(.headline)
                    .foregroundStyle(.primary)
            }

            Spacer()
        }
    }
}

// MARK: - Confetti View

struct ConfettiView: View {
    @State private var confettiPieces: [ConfettiPiece] = []

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                ForEach(confettiPieces) { piece in
                    ConfettiShape()
                        .fill(piece.color)
                        .frame(width: piece.size, height: piece.size)
                        .offset(x: piece.x, y: piece.y)
                        .rotationEffect(.degrees(piece.rotation))
                        .opacity(piece.opacity)
                }
            }
        }
        .ignoresSafeArea()
        .onAppear {
            generateConfetti()
        }
    }

    private func generateConfetti() {
        let colors: [Color] = [.red, .blue, .green, .yellow, .purple, .orange, .pink]
        let centerX = UIScreen.main.bounds.width / 2

        for i in 0..<50 {
            let delay = Double(i) * 0.01
            let piece = ConfettiPiece(
                x: centerX + CGFloat.random(in: -100...100),
                y: -20,
                color: colors.randomElement() ?? .blue,
                size: CGFloat.random(in: 6...12),
                rotation: Double.random(in: 0...360),
                opacity: 1.0
            )

            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                withAnimation(.easeOut(duration: 2.0)) {
                    var animatedPiece = piece
                    animatedPiece.y = UIScreen.main.bounds.height + 50
                    animatedPiece.x += CGFloat.random(in: -100...100)
                    animatedPiece.rotation += Double.random(in: 360...720)
                    animatedPiece.opacity = 0

                    confettiPieces.append(animatedPiece)
                }
            }
        }
    }
}

struct ConfettiPiece: Identifiable {
    let id = UUID()
    var x: CGFloat
    var y: CGFloat
    var color: Color
    var size: CGFloat
    var rotation: Double
    var opacity: Double
}

struct ConfettiShape: Shape {
    func path(in rect: CGRect) -> Path {
        Path { path in
            path.addRect(rect)
        }
    }
}

// MARK: - Preview

#Preview {
    QuestRewardCelebrationView(
        reward: QuestReward(
            quest: WeeklyQuest(
                template: QuestTemplate(
                    type: .studyStreak,
                    title: "Study Streak",
                    description: "Study for 3 days",
                    iconName: "flame.fill",
                    difficulty: .easy,
                    targetValue: 3,
                    baseXP: 50
                ),
                startDate: Date(),
                endDate: Date().addingTimeInterval(7 * 24 * 3600)
            ),
            xpEarned: 50,
            badge: nil,
            xpAward: XPAward(
                xpEarned: 50,
                previousLevel: 5,
                newLevel: 5,
                leveledUp: false,
                activity: .challengeCompleted,
                timestamp: Date()
            )
        )
    )
}
