//
//  UpdateButtonView.swift
//  MirrorBuddy
//
//  Big "Aggiornami" button with progress indicator
//  Simple and child-friendly UI
//

import SwiftUI
import SwiftData

struct UpdateButtonView: View {
    @State private var updateManager = UpdateManager.shared
    @State private var progress: UpdateProgress

    init() {
        _progress = State(initialValue: UpdateManager.shared.progress)
    }

    var body: some View {
        VStack(spacing: 16) {
            if progress.isUpdating {
                // Updating state with progress
                updatingView
            } else if let error = progress.error {
                // Error state
                errorView(error)
            } else if progress.currentStep == .completed {
                // Success state
                completedView
            } else {
                // Idle state - big button
                idleView
            }
        }
        .padding()
        .background(backgroundColor)
        .cornerRadius(20)
        .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 5)
        .padding(.horizontal)
    }

    // MARK: - Idle State (Big Button)

    private var idleView: some View {
        Button {
            _Concurrency.Task {
                await updateManager.performFullUpdate()
            }
        } label: {
            HStack(spacing: 16) {
                Image(systemName: "arrow.triangle.2.circlepath")
                    .font(.system(size: 32))

                VStack(alignment: .leading, spacing: 4) {
                    Text("Aggiornami")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Sincronizza documenti, mail e calendario")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.title3)
                    .foregroundStyle(.blue)
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(Color.blue.opacity(0.1))
            .foregroundStyle(.primary)
            .cornerRadius(16)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Updating State

    private var updatingView: some View {
        VStack(spacing: 16) {
            // Progress bar
            ProgressView(value: progress.progress, total: 1.0)
                .progressViewStyle(.linear)
                .tint(.blue)
                .scaleEffect(y: 2)

            // Current step icon
            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.2))
                    .frame(width: 60, height: 60)

                Image(systemName: stepIcon)
                    .font(.system(size: 28))
                    .foregroundStyle(.blue)
            }

            // Status text
            VStack(spacing: 8) {
                Text(progress.currentStep.rawValue)
                    .font(.headline)

                Text(progress.statusMessage)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            // Animated spinner
            ProgressView()
                .progressViewStyle(.circular)
                .scaleEffect(1.2)
        }
        .padding()
    }

    // MARK: - Completed State

    private var completedView: some View {
        VStack(spacing: 16) {
            // Success icon
            ZStack {
                Circle()
                    .fill(Color.green.opacity(0.2))
                    .frame(width: 80, height: 80)

                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 50))
                    .foregroundStyle(.green)
            }
            .padding(.top)

            // Results summary
            VStack(spacing: 8) {
                Text("Aggiornamento completato!")
                    .font(.title3)
                    .fontWeight(.bold)

                Text(progress.statusMessage)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            // Results cards
            HStack(spacing: 12) {
                if progress.newDocumentsCount > 0 {
                    ResultCard(
                        count: progress.newDocumentsCount,
                        label: "Documenti",
                        icon: "doc.fill",
                        color: .blue
                    )
                }

                if progress.newTasksCount > 0 {
                    ResultCard(
                        count: progress.newTasksCount,
                        label: "Compiti",
                        icon: "checklist",
                        color: .orange
                    )
                }

                if progress.mindMapsGenerated > 0 {
                    ResultCard(
                        count: progress.mindMapsGenerated,
                        label: "Mappe",
                        icon: "brain.head.profile",
                        color: .purple
                    )
                }
            }
            .padding(.horizontal)

            // Dismiss button
            Button {
                progress.currentStep = .idle
                progress.error = nil
            } label: {
                Text("OK")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
            }
            .padding(.horizontal)
            .padding(.bottom)
        }
    }

    // MARK: - Error State

    private func errorView(_ error: String) -> some View {
        VStack(spacing: 16) {
            // Error icon
            ZStack {
                Circle()
                    .fill(Color.red.opacity(0.2))
                    .frame(width: 80, height: 80)

                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 50))
                    .foregroundStyle(.red)
            }
            .padding(.top)

            // Error message
            VStack(spacing: 8) {
                Text("Ops! C'è un problema")
                    .font(.title3)
                    .fontWeight(.bold)

                Text(error)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            // Retry button
            Button {
                _Concurrency.Task {
                    await updateManager.performFullUpdate()
                }
            } label: {
                HStack {
                    Image(systemName: "arrow.clockwise")
                    Text("Riprova")
                }
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .cornerRadius(12)
            }
            .padding(.horizontal)

            // Dismiss button
            Button {
                progress.error = nil
                progress.currentStep = .idle
            } label: {
                Text("Annulla")
                    .font(.headline)
                    .foregroundStyle(.blue)
            }
            .padding(.bottom)
        }
    }

    // MARK: - Helpers

    private var stepIcon: String {
        switch progress.currentStep {
        case .authenticating:
            return "key.fill"
        case .syncingDrive:
            return "cloud.fill"
        case .syncingGmail:
            return "envelope.fill"
        case .syncingCalendar:
            return "calendar"
        case .generatingMindMaps:
            return "brain.head.profile"
        case .completed:
            return "checkmark.circle.fill"
        case .failed:
            return "exclamationmark.triangle.fill"
        case .idle:
            return "arrow.triangle.2.circlepath"
        }
    }

    private var backgroundColor: Color {
        if progress.isUpdating {
            return Color(.systemBackground)
        } else if progress.error != nil {
            return Color.red.opacity(0.05)
        } else if progress.currentStep == .completed {
            return Color.green.opacity(0.05)
        } else {
            return Color(.systemBackground)
        }
    }
}

// MARK: - Result Card

struct ResultCard: View {
    let count: Int
    let label: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)

            Text("\(count)")
                .font(.title2)
                .fontWeight(.bold)

            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(color.opacity(0.1))
        .cornerRadius(12)
    }
}

#Preview("Idle") {
    UpdateButtonView()
        .modelContainer(for: Material.self, inMemory: true)
}

#Preview("Updating") {
    let _ = {
        UpdateManager.shared.progress.isUpdating = true
        UpdateManager.shared.progress.currentStep = .syncingDrive
        UpdateManager.shared.progress.statusMessage = "Cerco nuovi documenti..."
        UpdateManager.shared.progress.progress = 0.4
    }()

    UpdateButtonView()
        .modelContainer(for: Material.self, inMemory: true)
}

#Preview("Completed") {
    let _ = {
        UpdateManager.shared.progress.currentStep = .completed
        UpdateManager.shared.progress.statusMessage = "Trovati: 3 nuovi documenti, 2 compiti"
        UpdateManager.shared.progress.newDocumentsCount = 3
        UpdateManager.shared.progress.newTasksCount = 2
        UpdateManager.shared.progress.mindMapsGenerated = 3
    }()

    UpdateButtonView()
        .modelContainer(for: Material.self, inMemory: true)
}
