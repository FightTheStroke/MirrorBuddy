//
//  TodayView.swift
//  MirrorBuddy
//
//  MirrorBuddy 2.0 - Main "Oggi" (Today) screen
//  Single-screen interface replacing 4-tab navigation
//  Voice-first, visually simple, functionally complete
//

import SwiftUI
import SwiftData

/// Main "Today" view - the heart of MirrorBuddy 2.0
struct TodayView: View {
    @Environment(\.modelContext) private var modelContext

    @StateObject private var voiceEngine = ContinuousVoiceEngine.shared
    @StateObject private var viewModel = TodayViewModel()

    // Animation states
    @State private var appeared: Bool = false

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // MARK: - Voice Header
                voiceHeader

                // MARK: - Today's Tasks
                todaySection

                // MARK: - Quick Actions
                quickActionsSection

                // MARK: - Progress Summary
                progressSection

                // Spacer for scroll comfort
                Color.clear.frame(height: 40)
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
        }
        .background(
            LinearGradient(
                colors: [
                    Color(.systemBackground),
                    Color(.secondarySystemBackground).opacity(0.3)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
        )
        .safeAreaInset(edge: .top) {
            // Privacy indicator at top
            if voiceEngine.isPrivacyIndicatorVisible {
                VoicePrivacyIndicatorWithWaveform(voiceEngine: voiceEngine)
                    .padding(.top, 8)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .task {
            // Request permission and start voice engine
            do {
                try await voiceEngine.requestPermission()
                try await voiceEngine.startContinuousListening()
            } catch {
                print("❌ Failed to start voice engine: \(error)")
            }

            // Load today's data
            await viewModel.loadTodayData(context: modelContext)

            // Animate in
            withAnimation(.spring(response: 0.6, dampingFraction: 0.8)) {
                appeared = true
            }
        }
        .onDisappear {
            // Stop voice engine when view disappears
            Task {
                await voiceEngine.stopContinuousListening()
            }
        }
    }

    // MARK: - Voice Header

    private var voiceHeader: some View {
        VStack(spacing: 16) {
            // Greeting
            HStack {
                Text("👋 Ciao Mario!")
                    .font(.openDyslexicLargeTitle)
                    .foregroundStyle(.primary)

                Spacer()
            }

            // Voice status
            HStack(spacing: 12) {
                // Waveform
                AudioWaveformView(amplitudes: voiceEngine.waveformAmplitudes)
                    .frame(height: 50)

                Spacer()

                // Listening indicator
                if voiceEngine.isListening {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(.green)
                            .frame(width: 8, height: 8)

                        Text("In ascolto...")
                            .font(.openDyslexicCallout)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            .background {
                RoundedRectangle(cornerRadius: 16)
                    .fill(.thinMaterial)
                    .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
            }

            // Current transcript (if speaking)
            if !voiceEngine.transcript.isEmpty {
                HStack {
                    Text("\"" + voiceEngine.transcript + "\"")
                        .font(.openDyslexicBody)
                        .foregroundStyle(.secondary)
                        .italic()

                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.blue.opacity(0.1))
                }
                .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : -20)
    }

    // MARK: - Today Section

    private var todaySection: some View {
        VStack(spacing: 16) {
            // Section header
            HStack {
                Text("OGGI")
                    .font(.openDyslexicHeadline)
                    .foregroundStyle(.secondary)

                Spacer()

                Text(Date.now, style: .date)
                    .font(.openDyslexicCallout)
                    .foregroundStyle(.tertiary)
            }

            // Today's items
            if viewModel.todayItems.isEmpty {
                emptyTodayState
            } else {
                ForEach(viewModel.todayItems) { item in
                    TodayItemCard(item: item)
                }
            }
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 20)
        .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.1), value: appeared)
    }

    private var emptyTodayState: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 48))
                .foregroundStyle(.green)

            Text("Tutto fatto per oggi!")
                .font(.openDyslexicTitle3)

            Text("Di' \"Aggiungi compito\" per iniziare")
                .font(.openDyslexicBody)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .background {
            RoundedRectangle(cornerRadius: 20)
                .fill(.green.opacity(0.1))
        }
    }

    // MARK: - Quick Actions

    private var quickActionsSection: some View {
        VStack(spacing: 12) {
            HStack {
                Text("AZIONI RAPIDE")
                    .font(.openDyslexicHeadline)
                    .foregroundStyle(.secondary)

                Spacer()
            }

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                QuickActionButton(
                    icon: "timer",
                    title: "Timer Focus",
                    subtitle: "25 min",
                    color: .orange,
                    action: { await viewModel.startFocusTimer() }
                )

                QuickActionButton(
                    icon: "book.fill",
                    title: "Ripasso",
                    subtitle: "Flashcard",
                    color: .blue,
                    action: { await viewModel.startReview() }
                )

                QuickActionButton(
                    icon: "plus.circle.fill",
                    title: "Nuovo Compito",
                    subtitle: "Aggiungi",
                    color: .green,
                    action: { await viewModel.createTask() }
                )

                QuickActionButton(
                    icon: "chart.bar.fill",
                    title: "Progressi",
                    subtitle: "Statistiche",
                    color: .purple,
                    action: { await viewModel.showProgress() }
                )
            }
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 20)
        .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.2), value: appeared)
    }

    // MARK: - Progress Summary

    private var progressSection: some View {
        VStack(spacing: 16) {
            HStack {
                Text("I TUOI PROGRESSI")
                    .font(.openDyslexicHeadline)
                    .foregroundStyle(.secondary)

                Spacer()
            }

            VStack(spacing: 12) {
                // Streak
                ProgressMetricRow(
                    icon: "flame.fill",
                    label: "Streak",
                    value: "\(viewModel.streakDays) giorni",
                    color: .orange
                )

                Divider()

                // Today's study time
                ProgressMetricRow(
                    icon: "clock.fill",
                    label: "Oggi",
                    value: viewModel.todayStudyTime,
                    color: .blue
                )

                Divider()

                // Completed tasks
                ProgressMetricRow(
                    icon: "checkmark.circle.fill",
                    label: "Completati",
                    value: "\(viewModel.completedTasksCount) task",
                    color: .green
                )

                Divider()

                // Reviews due
                ProgressMetricRow(
                    icon: "brain.head.profile",
                    label: "Da ripassare",
                    value: "\(viewModel.reviewsDue) carte",
                    color: .purple
                )
            }
            .padding(20)
            .background {
                RoundedRectangle(cornerRadius: 20)
                    .fill(.thinMaterial)
                    .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
            }
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 20)
        .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.3), value: appeared)
    }
}

// MARK: - Supporting Views

/// Today item card
struct TodayItemCard: View {
    let item: TodayItem

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                // Icon
                Image(systemName: item.icon)
                    .font(.system(size: 24))
                    .foregroundStyle(item.color)
                    .frame(width: 40, height: 40)
                    .background {
                        Circle()
                            .fill(item.color.opacity(0.15))
                    }

                VStack(alignment: .leading, spacing: 4) {
                    Text(item.title)
                        .font(.openDyslexicTitle3)

                    Text(item.subtitle)
                        .font(.openDyslexicCallout)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                // Progress indicator
                if let progress = item.progress {
                    ProgressBadge(progress: progress)
                }
            }

            // Action button
            Button(action: item.action) {
                HStack {
                    Text(item.actionTitle)
                        .font(.openDyslexicBody)
                        .fontWeight(.semibold)

                    Spacer()

                    Image(systemName: "mic.fill")
                        .font(.system(size: 14))
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(item.color.gradient)
                }
                .foregroundStyle(.white)
            }
            .buttonStyle(.plain)
        }
        .padding(20)
        .background {
            RoundedRectangle(cornerRadius: 20)
                .fill(.thinMaterial)
                .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
        }
    }
}

/// Quick action button
struct QuickActionButton: View {
    let icon: String
    let title: String
    let subtitle: String
    let color: Color
    let action: () async -> Void

    @State private var isPressed: Bool = false

    var body: some View {
        Button {
            Task {
                await action()
            }
        } label: {
            VStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 32))
                    .foregroundStyle(color)

                VStack(spacing: 4) {
                    Text(title)
                        .font(.openDyslexicBody)
                        .fontWeight(.semibold)

                    Text(subtitle)
                        .font(.openDyslexicCaption)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background {
                RoundedRectangle(cornerRadius: 16)
                    .fill(.thinMaterial)
                    .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
            }
        }
        .buttonStyle(.plain)
        .scaleEffect(isPressed ? 0.95 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in isPressed = true }
                .onEnded { _ in isPressed = false }
        )
    }
}

/// Progress metric row
struct ProgressMetricRow: View {
    let icon: String
    let label: String
    let value: String
    let color: Color

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundStyle(color)
                .frame(width: 32)

            Text(label)
                .font(.openDyslexicBody)
                .foregroundStyle(.secondary)

            Spacer()

            Text(value)
                .font(.openDyslexicBody)
                .fontWeight(.bold)
                .foregroundStyle(.primary)
        }
    }
}

/// Progress badge
struct ProgressBadge: View {
    let progress: Double

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.gray.opacity(0.2), lineWidth: 3)

            Circle()
                .trim(from: 0, to: progress)
                .stroke(progressColor, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .rotationEffect(.degrees(-90))

            Text("\(Int(progress * 100))%")
                .font(.openDyslexic(size: 10, weight: .bold))
                .foregroundStyle(.primary)
        }
        .frame(width: 48, height: 48)
    }

    private var progressColor: Color {
        if progress >= 0.75 { return .green }
        if progress >= 0.5 { return .blue }
        return .orange
    }
}

// MARK: - Preview

#Preview {
    TodayView()
        .modelContainer(for: [Material.self, Flashcard.self])
}
