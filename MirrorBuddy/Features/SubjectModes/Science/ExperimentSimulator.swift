import Foundation
import SwiftUI

/// Creates interactive simulations of physics and chemistry experiments
@MainActor
final class ExperimentSimulator {
    private let geminiClient: GeminiClient

    init(geminiClient: GeminiClient) {
        self.geminiClient = geminiClient
    }

    /// Create a new experiment simulation
    func createSimulation(
        type: ExperimentType,
        parameters: [String: Double]
    ) async throws -> ExperimentSimulation {
        let prompt = createSimulationPrompt(type: type, parameters: parameters)

        let response = try await geminiClient.generateContent(
            prompt: prompt,
            systemInstruction: """
            You are a physics and chemistry teacher creating educational simulations. \
            Provide accurate calculations and educational explanations. Return valid JSON.
            """
        )

        guard let data = response.data(using: .utf8),
              let simData = try? JSONDecoder().decode(SimulationData.self, from: data) else {
            throw ScienceModeError.invalidExperimentData
        }

        return ExperimentSimulation(
            type: type,
            parameters: parameters,
            title: simData.title,
            description: simData.description,
            theory: simData.theory,
            dataPoints: simData.dataPoints,
            results: simData.results,
            interpretation: simData.interpretation
        )
    }

    private func createSimulationPrompt(
        type: ExperimentType,
        parameters: [String: Double]
    ) -> String {
        let paramList = parameters.map { "\($0.key): \($0.value)" }.joined(separator: ", ")

        return """
        Create a physics experiment simulation for:

        Experiment Type: \(type.rawValue)
        Parameters: \(paramList)

        Generate simulation data including:
        1. title: A clear title for this specific simulation
        2. description: What this experiment demonstrates (100 words)
        3. theory: The physics principles involved (150 words)
        4. dataPoints: Array of 20-30 time-based data points showing the progression
        5. results: Summary of key findings
        6. interpretation: Educational explanation of what the data shows

        For dataPoints, include:
        - time: Time in seconds
        - position/value: Main measured quantity
        - velocity (if applicable)
        - energy (if applicable)

        Return valid JSON in this format:
        {
          "title": "Experiment Title",
          "description": "What it demonstrates",
          "theory": "Physics principles",
          "dataPoints": [
            {
              "time": 0.0,
              "position": 0.0,
              "velocity": 0.0,
              "energy": 0.0
            }
          ],
          "results": "Summary of findings",
          "interpretation": "Educational explanation"
        }
        """
    }

    private struct SimulationData: Codable {
        let title: String
        let description: String
        let theory: String
        let dataPoints: [DataPoint]
        let results: String
        let interpretation: String
    }
}

// MARK: - Experiment Simulation

class ExperimentSimulation: ObservableObject {
    let type: ExperimentType
    @Published var parameters: [String: Double]
    let title: String
    let description: String
    let theory: String
    @Published var dataPoints: [DataPoint]
    let results: String
    let interpretation: String
    @Published var isPlaying: Bool = false
    @Published var currentTimeIndex: Int = 0

    init(
        type: ExperimentType,
        parameters: [String: Double],
        title: String,
        description: String,
        theory: String,
        dataPoints: [DataPoint],
        results: String,
        interpretation: String
    ) {
        self.type = type
        self.parameters = parameters
        self.title = title
        self.description = description
        self.theory = theory
        self.dataPoints = dataPoints
        self.results = results
        self.interpretation = interpretation
    }

    func updateParameters(_ newParameters: [String: Double]) {
        self.parameters = newParameters
        // In a real implementation, this would recalculate dataPoints
    }

    func play() {
        isPlaying = true
    }

    func pause() {
        isPlaying = false
    }

    func reset() {
        currentTimeIndex = 0
        isPlaying = false
    }

    func step(forward: Bool) {
        if forward {
            currentTimeIndex = min(currentTimeIndex + 1, dataPoints.count - 1)
        } else {
            currentTimeIndex = max(currentTimeIndex - 1, 0)
        }
    }
}

struct DataPoint: Codable, Identifiable {
    let id: UUID
    let time: Double
    let position: Double
    let velocity: Double?
    let energy: Double?
    let temperature: Double?
    let concentration: Double?

    init(
        time: Double,
        position: Double,
        velocity: Double? = nil,
        energy: Double? = nil,
        temperature: Double? = nil,
        concentration: Double? = nil
    ) {
        self.id = UUID()
        self.time = time
        self.position = position
        self.velocity = velocity
        self.energy = energy
        self.temperature = temperature
        self.concentration = concentration
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = UUID()
        self.time = try container.decode(Double.self, forKey: .time)
        self.position = try container.decode(Double.self, forKey: .position)
        self.velocity = try container.decodeIfPresent(Double.self, forKey: .velocity)
        self.energy = try container.decodeIfPresent(Double.self, forKey: .energy)
        self.temperature = try container.decodeIfPresent(Double.self, forKey: .temperature)
        self.concentration = try container.decodeIfPresent(Double.self, forKey: .concentration)
    }

    private enum CodingKeys: String, CodingKey {
        case time, position, velocity, energy, temperature, concentration
    }
}

// MARK: - Experiment Simulation View

struct ExperimentSimulationView: View {
    @ObservedObject var simulation: ExperimentSimulation

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text(simulation.title)
                        .font(.title2)
                        .fontWeight(.bold)

                    Text(simulation.description)
                        .font(.body)
                        .foregroundColor(.secondary)
                }

                Divider()

                // Visualization
                SimulationVisualization(simulation: simulation)

                // Controls
                SimulationControls(simulation: simulation)

                // Parameters
                ParametersCard(parameters: simulation.parameters)

                // Theory
                TheorySection(theory: simulation.theory)

                // Data
                DataTableView(dataPoints: simulation.dataPoints)

                // Results
                ResultsSection(
                    results: simulation.results,
                    interpretation: simulation.interpretation
                )
            }
            .padding()
        }
        .navigationTitle("Experiment Simulation")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Simulation Visualization

struct SimulationVisualization: View {
    @ObservedObject var simulation: ExperimentSimulation

    var body: some View {
        VStack(spacing: 12) {
            // Graph
            GraphView(dataPoints: simulation.dataPoints)
                .frame(height: 250)

            // Animation view (simplified)
            AnimationView(
                type: simulation.type,
                currentDataPoint: currentDataPoint
            )
            .frame(height: 200)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemGray6))
        )
    }

    private var currentDataPoint: DataPoint {
        guard simulation.currentTimeIndex < simulation.dataPoints.count else {
            return simulation.dataPoints.last ?? DataPoint(time: 0, position: 0)
        }
        return simulation.dataPoints[simulation.currentTimeIndex]
    }
}

// MARK: - Graph View

struct GraphView: View {
    let dataPoints: [DataPoint]

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Grid
                Path { path in
                    for i in 0...4 {
                        let y = geometry.size.height * CGFloat(i) / 4
                        path.move(to: CGPoint(x: 0, y: y))
                        path.addLine(to: CGPoint(x: geometry.size.width, y: y))
                    }
                }
                .stroke(Color.gray.opacity(0.2), lineWidth: 1)

                // Data line
                if !dataPoints.isEmpty {
                    Path { path in
                        let maxPosition = dataPoints.map { abs($0.position) }.max() ?? 1
                        let scaleX = geometry.size.width / Double(dataPoints.count - 1)
                        let scaleY = geometry.size.height / (maxPosition * 2)

                        for (index, point) in dataPoints.enumerated() {
                            let x = CGFloat(index) * scaleX
                            let y = geometry.size.height / 2 - CGFloat(point.position) * scaleY

                            if index == 0 {
                                path.move(to: CGPoint(x: x, y: y))
                            } else {
                                path.addLine(to: CGPoint(x: x, y: y))
                            }
                        }
                    }
                    .stroke(Color.blue, lineWidth: 2)
                }
            }
        }
    }
}

// MARK: - Animation View

struct AnimationView: View {
    let type: ExperimentType
    let currentDataPoint: DataPoint

    var body: some View {
        ZStack {
            // Simple animation based on position
            Circle()
                .fill(Color.blue)
                .frame(width: 30, height: 30)
                .offset(
                    x: CGFloat(currentDataPoint.position * 50),
                    y: 0
                )

            // Type-specific overlays could be added here
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGray5))
        .cornerRadius(8)
    }
}

// MARK: - Simulation Controls

struct SimulationControls: View {
    @ObservedObject var simulation: ExperimentSimulation

    var body: some View {
        HStack(spacing: 16) {
            Button(action: { simulation.reset() }) {
                Image(systemName: "backward.end.fill")
                    .font(.title3)
            }
            .buttonStyle(.bordered)

            Button(action: { simulation.step(forward: false) }) {
                Image(systemName: "backward.frame.fill")
                    .font(.title3)
            }
            .buttonStyle(.bordered)

            Button(action: {
                if simulation.isPlaying {
                    simulation.pause()
                } else {
                    simulation.play()
                }
            }) {
                Image(systemName: simulation.isPlaying ? "pause.fill" : "play.fill")
                    .font(.title2)
            }
            .buttonStyle(.borderedProminent)

            Button(action: { simulation.step(forward: true) }) {
                Image(systemName: "forward.frame.fill")
                    .font(.title3)
            }
            .buttonStyle(.bordered)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Supporting Views

struct ParametersCard: View {
    let parameters: [String: Double]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Parameters")
                .font(.headline)

            ForEach(Array(parameters.keys.sorted()), id: \.self) { key in
                HStack {
                    Text(key.capitalized)
                        .font(.subheadline)
                    Spacer()
                    Text(String(format: "%.2f", parameters[key] ?? 0))
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemGray6))
        )
    }
}

struct TheorySection: View {
    let theory: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Theory")
                .font(.headline)
            Text(theory)
                .font(.body)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.blue.opacity(0.1))
        )
    }
}

struct DataTableView: View {
    let dataPoints: [DataPoint]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Data Table")
                .font(.headline)

            ScrollView(.horizontal, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 4) {
                    // Header
                    HStack(spacing: 20) {
                        Text("Time (s)")
                            .font(.caption)
                            .fontWeight(.bold)
                            .frame(width: 60, alignment: .leading)
                        Text("Position")
                            .font(.caption)
                            .fontWeight(.bold)
                            .frame(width: 60, alignment: .leading)
                        if dataPoints.first?.velocity != nil {
                            Text("Velocity")
                                .font(.caption)
                                .fontWeight(.bold)
                                .frame(width: 60, alignment: .leading)
                        }
                        if dataPoints.first?.energy != nil {
                            Text("Energy")
                                .font(.caption)
                                .fontWeight(.bold)
                                .frame(width: 60, alignment: .leading)
                        }
                    }

                    Divider()

                    // Rows (show first 10)
                    ForEach(dataPoints.prefix(10)) { point in
                        HStack(spacing: 20) {
                            Text(String(format: "%.2f", point.time))
                                .font(.caption)
                                .frame(width: 60, alignment: .leading)
                            Text(String(format: "%.2f", point.position))
                                .font(.caption)
                                .frame(width: 60, alignment: .leading)
                            if let velocity = point.velocity {
                                Text(String(format: "%.2f", velocity))
                                    .font(.caption)
                                    .frame(width: 60, alignment: .leading)
                            }
                            if let energy = point.energy {
                                Text(String(format: "%.2f", energy))
                                    .font(.caption)
                                    .frame(width: 60, alignment: .leading)
                            }
                        }
                    }
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemGray6))
        )
    }
}

struct ResultsSection: View {
    let results: String
    let interpretation: String

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Results")
                    .font(.headline)
                Text(results)
                    .font(.body)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Interpretation")
                    .font(.headline)
                Text(interpretation)
                    .font(.body)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.green.opacity(0.1))
        )
    }
}
