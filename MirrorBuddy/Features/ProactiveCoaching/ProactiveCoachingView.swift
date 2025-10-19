import SwiftUI

/// View displaying proactive coaching prompts
struct ProactiveCoachingView: View {
    @ObservedObject var coachingService: ProactiveCoachingService
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Group {
            if let prompt = coachingService.currentPrompt {
                promptCard(prompt)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.spring(), value: coachingService.currentPrompt)
    }

    // MARK: - Prompt Card

    private func promptCard(_ prompt: ProactivePrompt) -> some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Image(systemName: prompt.type.icon)
                    .foregroundColor(colorForPromptType(prompt.type))
                    .font(.title2)

                Text(prompt.message)
                    .font(.body)
                    .lineLimit(3)

                Spacer()

                Button {
                    coachingService.dismissCurrentPrompt()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
            }
            .padding()

            // Actions
            if !prompt.actions.isEmpty {
                Divider()

                HStack(spacing: 12) {
                    ForEach(prompt.actions) { action in
                        actionButton(action)
                    }
                }
                .padding()
            }
        }
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.2), radius: 10, x: 0, y: 5)
        .padding()
    }

    private func actionButton(_ action: PromptAction) -> some View {
        Button {
            coachingService.handleAction(action.handler)
        } label: {
            HStack {
                Image(systemName: action.icon)
                Text(action.title)
            }
            .font(.subheadline)
            .fontWeight(.medium)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity)
            .background(Color.blue.opacity(0.1))
            .foregroundColor(.blue)
            .cornerRadius(10)
        }
    }

    private func colorForPromptType(_ type: ProactivePrompt.PromptType) -> Color {
        switch type {
        case .idle: return .gray
        case .encouragement: return .green
        case .breakSuggestion: return .orange
        case .nextStep: return .blue
        case .checkpoint: return .purple
        case .clarification: return .yellow
        case .celebration: return .pink
        }
    }
}

// MARK: - Coaching Dashboard View

struct ProactiveCoachingDashboard: View {
    @StateObject private var coachingService = ProactiveCoachingService()
    @State private var isCoachingActive = false

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Status Card
                statusCard

                // Controls
                controlsSection

                // History
                if !coachingService.promptHistory.isEmpty {
                    historySection
                }

                Spacer()
            }
            .padding()
            .navigationTitle(ProactiveCoachingStrings.UI.dashboardTitle)
            .overlay(alignment: .bottom) {
                ProactiveCoachingView(coachingService: coachingService)
            }
        }
    }

    private var statusCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: isCoachingActive ? "sparkles" : "pause.circle")
                    .foregroundColor(isCoachingActive ? .blue : .gray)
                    .font(.title)

                VStack(alignment: .leading) {
                    Text(ProactiveCoachingStrings.UI.coachingStatus)
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Text(isCoachingActive ?
                            ProactiveCoachingStrings.UI.active :
                            ProactiveCoachingStrings.UI.paused)
                        .font(.headline)
                }

                Spacer()
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .cornerRadius(12)
        }
    }

    private var controlsSection: some View {
        VStack(spacing: 12) {
            Button {
                if isCoachingActive {
                    coachingService.stopCoaching()
                } else {
                    coachingService.startCoaching()
                }
                isCoachingActive.toggle()
            } label: {
                Label(
                    isCoachingActive ?
                        ProactiveCoachingStrings.UI.deactivateCoaching :
                        ProactiveCoachingStrings.UI.activateCoaching,
                    systemImage: isCoachingActive ? "stop.fill" : "play.fill"
                )
                .frame(maxWidth: .infinity)
                .padding()
                .background(isCoachingActive ? Color.red : Color.blue)
                .foregroundColor(.white)
                .cornerRadius(12)
            }

            Button {
                coachingService.suggestNextStep()
            } label: {
                Label(
                    ProactiveCoachingStrings.UI.suggestNextStep,
                    systemImage: "arrow.right.circle"
                )
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.secondarySystemBackground))
                .foregroundColor(.primary)
                .cornerRadius(12)
            }
            .disabled(!isCoachingActive)
        }
    }

    private var historySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(ProactiveCoachingStrings.UI.promptHistory)
                .font(.headline)

            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(coachingService.promptHistory.reversed().prefix(10)) { prompt in
                        historyItem(prompt)
                    }
                }
            }
            .frame(maxHeight: 300)
        }
    }

    private func historyItem(_ prompt: ProactivePrompt) -> some View {
        HStack {
            Image(systemName: prompt.type.icon)
                .foregroundColor(.secondary)

            VStack(alignment: .leading, spacing: 4) {
                Text(prompt.message)
                    .font(.caption)
                    .lineLimit(2)

                Text(prompt.timestamp, style: .time)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
        .padding(8)
        .background(Color(.tertiarySystemBackground))
        .cornerRadius(8)
    }
}

// MARK: - Preview

#Preview {
    ProactiveCoachingDashboard()
}
