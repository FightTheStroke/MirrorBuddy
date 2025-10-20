import Combine
import Foundation

/// Service coordinating all Science/Physics mode specialized features
@MainActor
final class ScienceModeService: ObservableObject {
    @Published var activeExperiment: ExperimentSimulation?
    @Published var activeFormula: FormulaExplanation?
    @Published var recentConversions: [UnitConversionResult] = []

    private let geminiClient: GeminiClient
    private let experimentSimulator: ExperimentSimulator
    private let formulaExplainer: FormulaExplainer
    private let unitConverter: UnitConverter

    init(geminiClient: GeminiClient) {
        self.geminiClient = geminiClient
        self.experimentSimulator = ExperimentSimulator(geminiClient: geminiClient)
        self.formulaExplainer = FormulaExplainer(geminiClient: geminiClient)
        self.unitConverter = UnitConverter()
    }

    // MARK: - Experiment Simulations

    /// Create and run an interactive experiment simulation
    func createExperimentSimulation(
        experimentType: ExperimentType,
        parameters: [String: Double]
    ) async throws -> ExperimentSimulation {
        let simulation = try await experimentSimulator.createSimulation(
            type: experimentType,
            parameters: parameters
        )

        await MainActor.run {
            self.activeExperiment = simulation
        }

        return simulation
    }

    /// Update simulation parameters in real-time
    func updateSimulationParameters(_ parameters: [String: Double]) {
        activeExperiment?.updateParameters(parameters)
    }

    // MARK: - Formula Explanations

    /// Get a detailed explanation of a physics formula
    func explainFormula(formula: String, context: String?) async throws -> FormulaExplanation {
        let explanation = try await formulaExplainer.explain(
            formula: formula,
            context: context
        )

        await MainActor.run {
            self.activeFormula = explanation
        }

        return explanation
    }

    /// Solve a formula with given values
    func solveFormula(
        formula: String,
        knowns: [String: Double],
        solveFor: String
    ) async throws -> FormulaSolution {
        try await formulaExplainer.solve(
            formula: formula,
            knowns: knowns,
            solveFor: solveFor
        )
    }

    // MARK: - Unit Conversion

    /// Convert between units
    func convertUnit(
        value: Double,
        from fromUnit: PhysicsUnit,
        to toUnit: PhysicsUnit
    ) throws -> UnitConversionResult {
        let result = try unitConverter.convert(value: value, from: fromUnit, to: toUnit)

        await MainActor.run {
            self.recentConversions.insert(result, at: 0)
            if self.recentConversions.count > 20 {
                self.recentConversions.removeLast()
            }
        }

        return result
    }

    /// Get all available units for a category
    func getUnitsForCategory(_ category: UnitCategory) -> [PhysicsUnit] {
        unitConverter.getUnits(for: category)
    }

    // MARK: - Lab Reports

    /// Generate a lab report template
    func generateLabReportTemplate(
        experimentType: String,
        objective: String
    ) async throws -> LabReport {
        let prompt = SciencePrompts.labReportPrompt(
            experimentType: experimentType,
            objective: objective
        )

        let response = try await geminiClient.generateContent(
            prompt: prompt,
            systemInstruction: "You are a science teacher helping students create lab reports. Provide structured templates."
        )

        guard let data = response.data(using: .utf8),
              let report = try? JSONDecoder().decode(LabReport.self, from: data) else {
            throw ScienceModeError.invalidLabReportData
        }

        return report
    }

    // MARK: - Diagram Annotation

    /// Analyze a diagram and provide annotations
    func annotateDiagram(
        imageData: Data,
        topic: String
    ) async throws -> DiagramAnnotation {
        let prompt = SciencePrompts.diagramAnnotationPrompt(topic: topic)

        let response = try await geminiClient.analyzeWithVision(
            text: prompt,
            imageData: imageData,
            mimeType: "image/jpeg"
        )

        guard let data = response.data(using: .utf8),
              let annotation = try? JSONDecoder().decode(DiagramAnnotation.self, from: data) else {
            throw ScienceModeError.invalidDiagramData
        }

        return annotation
    }

    // MARK: - Physics Demonstrations

    /// Get an interactive physics demonstration
    func getPhysicsDemonstration(concept: String) async throws -> PhysicsDemonstration {
        let prompt = SciencePrompts.physicsDemoPrompt(concept: concept)

        let response = try await geminiClient.generateContent(
            prompt: prompt,
            systemInstruction: "You are a physics teacher creating interactive demonstrations. Return valid JSON."
        )

        guard let data = response.data(using: .utf8),
              let demo = try? JSONDecoder().decode(PhysicsDemonstration.self, from: data) else {
            throw ScienceModeError.invalidDemoData
        }

        return demo
    }
}

// MARK: - Supporting Types

enum ExperimentType: String, Codable, CaseIterable {
    case pendulum = "Pendulum Motion"
    case projectile = "Projectile Motion"
    case collision = "Elastic Collision"
    case circuitBasic = "Basic Circuit"
    case springMass = "Spring-Mass System"
    case inclinedPlane = "Inclined Plane"
    case calorimetry = "Heat Transfer"
    case chemicalReaction = "Chemical Reaction"

    var parameters: [String] {
        switch self {
        case .pendulum:
            return ["length", "mass", "angle", "gravity"]
        case .projectile:
            return ["initialVelocity", "angle", "height", "gravity"]
        case .collision:
            return ["mass1", "mass2", "velocity1", "velocity2"]
        case .circuitBasic:
            return ["voltage", "resistance"]
        case .springMass:
            return ["mass", "springConstant", "displacement"]
        case .inclinedPlane:
            return ["angle", "mass", "friction"]
        case .calorimetry:
            return ["mass", "specificHeat", "temperatureChange"]
        case .chemicalReaction:
            return ["reactantAmount", "temperature", "pressure"]
        }
    }
}

struct LabReport: Codable {
    let title: String
    let objective: String
    let hypothesis: String
    let materials: [String]
    let procedure: [String]
    let dataTableTemplate: String
    let calculationExamples: [String]
    let conclusionGuidelines: String
    let safetyNotes: [String]
}

struct DiagramAnnotation: Codable {
    let diagramType: String
    let mainComponents: [Component]
    let labels: [Label]
    let explanation: String
    let keyPoints: [String]

    struct Component: Codable {
        let name: String
        let function: String
    }

    struct Label: Codable {
        let text: String
        let description: String
    }
}

struct PhysicsDemonstration: Codable, Identifiable {
    let id: UUID
    let concept: String
    let description: String
    let setup: String
    let steps: [DemoStep]
    let expectedOutcome: String
    let explanation: String
    let safetyWarnings: [String]
    let variations: [String]

    struct DemoStep: Codable {
        let stepNumber: Int
        let instruction: String
        let observation: String
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = UUID()
        self.concept = try container.decode(String.self, forKey: .concept)
        self.description = try container.decode(String.self, forKey: .description)
        self.setup = try container.decode(String.self, forKey: .setup)
        self.steps = try container.decode([DemoStep].self, forKey: .steps)
        self.expectedOutcome = try container.decode(String.self, forKey: .expectedOutcome)
        self.explanation = try container.decode(String.self, forKey: .explanation)
        self.safetyWarnings = try container.decode([String].self, forKey: .safetyWarnings)
        self.variations = try container.decode([String].self, forKey: .variations)
    }

    private enum CodingKeys: String, CodingKey {
        case concept, description, setup, steps, expectedOutcome, explanation, safetyWarnings, variations
    }
}

enum ScienceModeError: Error, LocalizedError {
    case invalidExperimentData
    case invalidFormulaData
    case invalidLabReportData
    case invalidDiagramData
    case invalidDemoData
    case simulationFailed(String)
    case conversionFailed(String)

    var errorDescription: String? {
        switch self {
        case .invalidExperimentData:
            return "Failed to parse experiment simulation data"
        case .invalidFormulaData:
            return "Failed to parse formula explanation data"
        case .invalidLabReportData:
            return "Failed to parse lab report template"
        case .invalidDiagramData:
            return "Failed to parse diagram annotation"
        case .invalidDemoData:
            return "Failed to parse physics demonstration"
        case .simulationFailed(let reason):
            return "Simulation failed: \(reason)"
        case .conversionFailed(let reason):
            return "Conversion failed: \(reason)"
        }
    }
}
