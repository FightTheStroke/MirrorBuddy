import SwiftData
import SwiftUI

/// View for displaying curiosity content recommendations (Task 131.1)
struct CuriosityRecommendationsView: View {
    @Environment(\.dismiss) private var dismiss
    @Query private var userProgress: [UserProgress]

    let subject: String
    let topics: [String]

    @State private var recommendations: [CuriosityContent] = []
    @State private var isLoading = true
    @State private var error: Error?

    private var progress: UserProgress? {
        userProgress.first
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Header
                    VStack(spacing: 8) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 50))
                            .foregroundStyle(.yellow)

                        Text("Explore More!")
                            .font(.title2)
                            .fontWeight(.bold)

                        if !topics.isEmpty {
                            Text("Based on: \(topics.joined(separator: ", "))")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.top)

                    if isLoading {
                        ProgressView("Loading recommendations...")
                            .padding()
                    } else if let error = error {
                        ErrorMessageView(error: error)
                    } else if recommendations.isEmpty {
                        EmptyRecommendationsView()
                    } else {
                        LazyVStack(spacing: 16) {
                            ForEach(recommendations) { content in
                                CuriosityContentCard(content: content) {
                                    handleContentTap(content)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                }
            }
            .navigationTitle("Curiosity Corner")
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
        .task {
            await loadRecommendations()
        }
    }

    private func loadRecommendations() async {
        do {
            let service = CuriosityRecommenderService.shared
            recommendations = try service.getRecommendations(
                for: subject,
                topics: topics,
                limit: 5
            )
            isLoading = false
        } catch {
            self.error = error
            isLoading = false
        }
    }

    private func handleContentTap(_ content: CuriosityContent) {
        // Record interaction
        do {
            let service = CuriosityRecommenderService.shared
            try service.recordInteraction(
                contentID: content.id,
                userProgressID: progress?.id
            )

            // Award XP for curiosity
            if let progress = progress {
                let xpService = XPLevelingService.shared
                _ = xpService.awardXP(for: .materialCreated, to: progress)
            }

            // Update quest progress
            let questService = WeeklyQuestService.shared
            try questService.updateQuestProgress(type: .curiosityExplorer)

            // Open URL if available
            if let urlString = content.url, let url = URL(string: urlString) {
                UIApplication.shared.open(url)
            }
        } catch {
            print("Error recording curiosity interaction: \(error)")
        }
    }
}

// MARK: - Supporting Views

struct CuriosityContentCard: View {
    let content: CuriosityContent
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    // Content type icon
                    Image(systemName: contentTypeIcon)
                        .font(.title2)
                        .foregroundStyle(contentTypeColor)
                        .frame(width: 50, height: 50)
                        .background(contentTypeColor.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 10))

                    VStack(alignment: .leading, spacing: 4) {
                        Text(content.title)
                            .font(.headline)
                            .foregroundStyle(.primary)

                        HStack(spacing: 12) {
                            Label(
                                "\(content.estimatedMinutes) min",
                                systemImage: "clock.fill"
                            )
                            .font(.caption)

                            Label(
                                difficultyText,
                                systemImage: "star.fill"
                            )
                            .font(.caption)
                        }
                        .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .foregroundStyle(.secondary)
                }

                Text(content.description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)

                if !content.topics.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(content.topics, id: \.self) { topic in
                                Text(topic)
                                    .font(.caption)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.blue.opacity(0.1))
                                    .foregroundStyle(.blue)
                                    .clipShape(Capsule())
                            }
                        }
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.05), radius: 2, y: 1)
        }
    }

    private var contentTypeIcon: String {
        switch content.contentType {
        case .video: return "play.rectangle.fill"
        case .experiment: return "flask.fill"
        case .article: return "doc.text.fill"
        case .interactive: return "hand.tap.fill"
        case .podcast: return "headphones"
        }
    }

    private var contentTypeColor: Color {
        switch content.contentType {
        case .video: return .red
        case .experiment: return .purple
        case .article: return .blue
        case .interactive: return .green
        case .podcast: return .orange
        }
    }

    private var difficultyText: String {
        String(repeating: "★", count: content.difficulty) +
            String(repeating: "☆", count: 5 - content.difficulty)
    }
}

struct EmptyRecommendationsView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "tray")
                .font(.system(size: 50))
                .foregroundStyle(.secondary)

            Text("No Recommendations Yet")
                .font(.headline)

            Text("Keep studying to unlock curiosity content!")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

struct ErrorMessageView: View {
    let error: Error

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 50))
                .foregroundStyle(.red)

            Text("Error Loading Content")
                .font(.headline)

            Text(error.localizedDescription)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

// MARK: - Preview

#Preview {
    CuriosityRecommendationsView(
        subject: Subject.matematica.rawValue,
        topics: ["geometry", "patterns"]
    )
    .modelContainer(for: [UserProgress.self, CuriosityContent.self], inMemory: true)
}
