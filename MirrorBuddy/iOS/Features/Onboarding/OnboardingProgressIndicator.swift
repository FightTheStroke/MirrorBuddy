import SwiftUI

// MARK: - Onboarding Progress Indicator (Task 55.1)

/// Visual progress indicator for onboarding flow
struct OnboardingProgressIndicator: View {
    let currentStep: OnboardingStep
    let completedSteps: Set<OnboardingStep>

    private let steps = OnboardingStep.allCases

    var body: some View {
        VStack(spacing: 8) {
            // Step dots
            HStack(spacing: 12) {
                ForEach(steps, id: \.self) { step in
                    StepDot(
                        step: step,
                        isCurrent: step == currentStep,
                        isCompleted: completedSteps.contains(step)
                    )

                    if step != steps.last {
                        StepConnector(
                            isCompleted: completedSteps.contains(step)
                        )
                    }
                }
            }

            // Current step info
            VStack(spacing: 4) {
                Text(currentStep.title)
                    .font(.headline)

                Text(currentStep.description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(16)
    }
}

// MARK: - Step Dot

private struct StepDot: View {
    let step: OnboardingStep
    let isCurrent: Bool
    let isCompleted: Bool

    var body: some View {
        ZStack {
            Circle()
                .fill(backgroundColor)
                .frame(width: dotSize, height: dotSize)

            if isCompleted {
                Image(systemName: "checkmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(.white)
            } else {
                Image(systemName: step.icon)
                    .font(.system(size: iconSize))
                    .foregroundStyle(iconColor)
            }
        }
        .scaleEffect(isCurrent ? 1.2 : 1.0)
        .animation(.spring(response: 0.3), value: isCurrent)
    }

    private var dotSize: CGFloat {
        isCurrent ? 40 : 32
    }

    private var iconSize: CGFloat {
        isCurrent ? 16 : 14
    }

    private var backgroundColor: Color {
        if isCompleted {
            return .green
        } else if isCurrent {
            return .blue
        } else {
            return Color.gray.opacity(0.2)
        }
    }

    private var iconColor: Color {
        if isCompleted {
            return .white
        } else if isCurrent {
            return .white
        } else {
            return .gray
        }
    }
}

// MARK: - Step Connector

private struct StepConnector: View {
    let isCompleted: Bool

    var body: some View {
        Rectangle()
            .fill(isCompleted ? Color.green : Color.gray.opacity(0.3))
            .frame(height: 2)
            .frame(maxWidth: 20)
    }
}

// MARK: - Compact Progress Bar

/// Compact linear progress bar for onboarding
struct OnboardingProgressBar: View {
    let progress: Double
    let total: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Progresso")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Spacer()

                Text("\(Int(progress * Double(total)))/\(total)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.2))

                    // Progress
                    RoundedRectangle(cornerRadius: 4)
                        .fill(
                            LinearGradient(
                                colors: [.blue, .purple],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geometry.size.width * progress)
                }
            }
            .frame(height: 8)
        }
        .animation(.easeInOut, value: progress)
    }
}

// MARK: - Preview

#Preview("Progress Indicator") {
    VStack(spacing: 32) {
        OnboardingProgressIndicator(
            currentStep: .welcome,
            completedSteps: []
        )

        OnboardingProgressIndicator(
            currentStep: .permissions,
            completedSteps: [.welcome]
        )

        OnboardingProgressIndicator(
            currentStep: .googleAccount,
            completedSteps: [.welcome, .permissions]
        )

        OnboardingProgressIndicator(
            currentStep: .completion,
            completedSteps: Set(OnboardingStep.allCases.dropLast())
        )
    }
    .padding()
}

#Preview("Progress Bar") {
    VStack(spacing: 32) {
        OnboardingProgressBar(progress: 0.0, total: 7)
        OnboardingProgressBar(progress: 0.3, total: 7)
        OnboardingProgressBar(progress: 0.7, total: 7)
        OnboardingProgressBar(progress: 1.0, total: 7)
    }
    .padding()
}
