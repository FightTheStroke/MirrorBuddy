import Combine
import SwiftUI

/// Interactive physics demonstrations with visual animations
struct PhysicsDemoView: View {
    @ObservedObject var demo: PhysicsDemoController
    @State private var showingSetup = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text(demo.demonstration.concept)
                        .font(.title2)
                        .fontWeight(.bold)

                    Text(demo.demonstration.description)
                        .font(.body)
                        .foregroundColor(.secondary)
                }

                Divider()

                // Interactive Demo Area
                InteractiveDemoArea(demo: demo)

                // Controls
                DemoControls(demo: demo, showingSetup: $showingSetup)

                // Safety Warnings
                if !demo.demonstration.safetyWarnings.isEmpty {
                    SafetyWarningsCard(warnings: demo.demonstration.safetyWarnings)
                }

                // Steps
                DemoStepsView(
                    steps: demo.demonstration.steps,
                    currentStep: demo.currentStep
                )

                // Expected Outcome
                OutcomeCard(
                    outcome: demo.demonstration.expectedOutcome,
                    explanation: demo.demonstration.explanation
                )

                // Variations
                if !demo.demonstration.variations.isEmpty {
                    VariationsCard(variations: demo.demonstration.variations)
                }
            }
            .padding()
        }
        .navigationTitle("Physics Demo")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingSetup) {
            SetupInstructionsView(setup: demo.demonstration.setup)
        }
    }
}

// MARK: - Interactive Demo Area

struct InteractiveDemoArea: View {
    @ObservedObject var demo: PhysicsDemoController

    var body: some View {
        ZStack {
            // Background
            RoundedRectangle(cornerRadius: 16)
                .fill(
                    LinearGradient(
                        colors: [Color.blue.opacity(0.1), Color.purple.opacity(0.1)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            // Demo visualization (simplified)
            VStack {
                Text("Interactive Demo")
                    .font(.headline)
                    .foregroundColor(.secondary)

                Spacer()

                // Placeholder for actual physics visualization
                Circle()
                    .fill(Color.blue)
                    .frame(width: 60, height: 60)
                    .offset(x: demo.animationOffset.width, y: demo.animationOffset.height)
                    .animation(.spring(response: 0.5, dampingFraction: 0.6), value: demo.animationOffset)

                Spacer()

                if demo.isRunning {
                    Text("Demo Running...")
                        .font(.caption)
                        .foregroundColor(.green)
                }
            }
            .padding()
        }
        .frame(height: 300)
    }
}

// MARK: - Demo Controls

struct DemoControls: View {
    @ObservedObject var demo: PhysicsDemoController
    @Binding var showingSetup: Bool

    var body: some View {
        VStack(spacing: 12) {
            // Main controls
            HStack(spacing: 16) {
                Button(action: { demo.reset() }) {
                    Label("Reset", systemImage: "arrow.counterclockwise")
                }
                .buttonStyle(.bordered)

                Button(action: { demo.toggleRunning() }) {
                    Label(
                        demo.isRunning ? "Pause" : "Start",
                        systemImage: demo.isRunning ? "pause.fill" : "play.fill"
                    )
                }
                .buttonStyle(.borderedProminent)

                Button(action: { demo.nextStep() }) {
                    Label("Next Step", systemImage: "arrow.right")
                }
                .buttonStyle(.bordered)
            }

            // Setup button
            Button(action: { showingSetup = true }) {
                Label("View Setup Instructions", systemImage: "info.circle")
            }
            .buttonStyle(.bordered)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Safety Warnings Card

struct SafetyWarningsCard: View {
    let warnings: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Safety Warnings", systemImage: "exclamationmark.triangle.fill")
                .font(.headline)
                .foregroundColor(.red)

            ForEach(warnings.indices, id: \.self) { index in
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "exclamationmark.circle.fill")
                        .foregroundColor(.red)
                        .font(.caption)
                    Text(warnings[index])
                        .font(.subheadline)
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.red.opacity(0.1))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.red, lineWidth: 2)
        )
    }
}

// MARK: - Demo Steps View

struct DemoStepsView: View {
    let steps: [PhysicsDemonstration.DemoStep]
    let currentStep: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Procedure")
                .font(.headline)

            ForEach(steps.indices, id: \.self) { index in
                DemoStepCard(
                    step: steps[index],
                    isCurrent: index == currentStep,
                    isCompleted: index < currentStep
                )
            }
        }
    }
}

struct DemoStepCard: View {
    let step: PhysicsDemonstration.DemoStep
    let isCurrent: Bool
    let isCompleted: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Step number indicator
            ZStack {
                Circle()
                    .fill(indicatorColor)
                    .frame(width: 32, height: 32)

                if isCompleted {
                    Image(systemName: "checkmark")
                        .font(.caption)
                        .foregroundColor(.white)
                } else {
                    Text("\(step.stepNumber)")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                Text(step.instruction)
                    .font(.body)
                    .fontWeight(isCurrent ? .semibold : .regular)

                if !step.observation.isEmpty {
                    Label(step.observation, systemImage: "eye")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(8)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color(.systemGray6))
                        )
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(isCurrent ? Color.blue.opacity(0.1) : Color(.systemGray6))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isCurrent ? Color.blue : Color.clear, lineWidth: 2)
        )
    }

    private var indicatorColor: Color {
        if isCompleted {
            return .green
        } else if isCurrent {
            return .blue
        } else {
            return .gray
        }
    }
}

// MARK: - Outcome Card

struct OutcomeCard: View {
    let outcome: String
    let explanation: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Expected Outcome", systemImage: "star.fill")
                .font(.headline)
                .foregroundColor(.orange)

            Text(outcome)
                .font(.body)

            Divider()

            Label("Scientific Explanation", systemImage: "lightbulb.fill")
                .font(.headline)
                .foregroundColor(.yellow)

            Text(explanation)
                .font(.body)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.orange.opacity(0.1))
        )
    }
}

// MARK: - Variations Card

struct VariationsCard: View {
    let variations: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Try These Variations", systemImage: "sparkles")
                .font(.headline)

            ForEach(variations.indices, id: \.self) { index in
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "\(index + 1).circle.fill")
                        .foregroundColor(.purple)
                    Text(variations[index])
                        .font(.body)
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.purple.opacity(0.1))
        )
    }
}

// MARK: - Setup Instructions View

struct SetupInstructionsView: View {
    let setup: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Label("Setup Instructions", systemImage: "wrench.and.screwdriver.fill")
                        .font(.title3)
                        .fontWeight(.bold)

                    Text(setup)
                        .font(.body)
                }
                .padding()
            }
            .navigationTitle("Setup")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Demo Controller

class PhysicsDemoController: ObservableObject {
    let demonstration: PhysicsDemonstration
    @Published var isRunning: Bool = false
    @Published var currentStep: Int = 0
    @Published var animationOffset: CGSize = .zero

    init(demonstration: PhysicsDemonstration) {
        self.demonstration = demonstration
    }

    func toggleRunning() {
        isRunning.toggle()
        if isRunning {
            startDemo()
        }
    }

    func reset() {
        isRunning = false
        currentStep = 0
        animationOffset = .zero
    }

    func nextStep() {
        if currentStep < demonstration.steps.count - 1 {
            currentStep += 1
            updateAnimation()
        }
    }

    private func startDemo() {
        // Simulate demo animation
        updateAnimation()
    }

    private func updateAnimation() {
        // Simple animation based on step
        let offset = CGFloat(currentStep * 20)
        animationOffset = CGSize(width: offset, height: sin(Double(currentStep)) * 50)
    }
}
