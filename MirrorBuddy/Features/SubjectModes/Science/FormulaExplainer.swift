import Foundation

/// Explains physics and chemistry formulas with LaTeX rendering support
@MainActor
final class FormulaExplainer {
    private let geminiClient: GeminiClient

    init(geminiClient: GeminiClient) {
        self.geminiClient = geminiClient
    }

    /// Get a comprehensive explanation of a formula
    func explain(formula: String, context: String?) async throws -> FormulaExplanation {
        let prompt = createExplanationPrompt(formula: formula, context: context)

        let response = try await geminiClient.generateContent(
            prompt: prompt,
            systemInstruction: """
            You are a physics and chemistry teacher explaining formulas. \
            Provide clear, educational explanations. Return valid JSON.
            """
        )

        guard let data = response.data(using: .utf8),
              let explanationData = try? JSONDecoder().decode(FormulaExplanationData.self, from: data) else {
            throw ScienceModeError.invalidFormulaData
        }

        return FormulaExplanation(
            formula: formula,
            latexFormula: explanationData.latexFormula,
            name: explanationData.name,
            description: explanationData.description,
            variables: explanationData.variables,
            units: explanationData.units,
            derivation: explanationData.derivation,
            applications: explanationData.applications,
            examples: explanationData.examples,
            relatedFormulas: explanationData.relatedFormulas
        )
    }

    /// Solve a formula for a specific variable
    func solve(
        formula: String,
        knowns: [String: Double],
        solveFor: String
    ) async throws -> FormulaSolution {
        let prompt = createSolutionPrompt(
            formula: formula,
            knowns: knowns,
            solveFor: solveFor
        )

        let response = try await geminiClient.generateContent(
            prompt: prompt,
            systemInstruction: """
            You are a physics teacher solving problems step by step. \
            Show all work clearly. Return valid JSON.
            """
        )

        guard let data = response.data(using: .utf8),
              let solutionData = try? JSONDecoder().decode(SolutionData.self, from: data) else {
            throw ScienceModeError.invalidFormulaData
        }

        return FormulaSolution(
            formula: formula,
            solveFor: solveFor,
            knowns: knowns,
            result: solutionData.result,
            unit: solutionData.unit,
            steps: solutionData.steps,
            explanation: solutionData.explanation
        )
    }

    private func createExplanationPrompt(formula: String, context: String?) -> String {
        let contextSection = context.map { "\nContext: \($0)\n" } ?? ""

        return """
        Explain this physics/chemistry formula:

        Formula: \(formula)\(contextSection)

        Provide comprehensive information in valid JSON format:
        {
          "latexFormula": "LaTeX formatted formula (e.g., E = mc^2)",
          "name": "Common name of the formula",
          "description": "What the formula calculates (100 words)",
          "variables": [
            {
              "symbol": "E",
              "name": "Energy",
              "description": "The total energy"
            }
          ],
          "units": {
            "SI": "Standard SI units",
            "common": "Commonly used units"
          },
          "derivation": "Brief derivation or origin of the formula (150 words)",
          "applications": [
            "List 4-5 practical applications"
          ],
          "examples": [
            {
              "problem": "Example problem statement",
              "solution": "Step-by-step solution",
              "result": "Final answer with units"
            }
          ],
          "relatedFormulas": [
            "List 3-4 related formulas"
          ]
        }
        """
    }

    private func createSolutionPrompt(
        formula: String,
        knowns: [String: Double],
        solveFor: String
    ) -> String {
        let knownsList = knowns.map { "\($0.key) = \($0.value)" }.joined(separator: ", ")

        return """
        Solve this formula:

        Formula: \(formula)
        Known values: \(knownsList)
        Solve for: \(solveFor)

        Provide step-by-step solution in valid JSON:
        {
          "result": 42.5,
          "unit": "meters per second",
          "steps": [
            "Step 1: Identify the formula",
            "Step 2: Substitute known values",
            "Step 3: Simplify",
            "Step 4: Calculate final result"
          ],
          "explanation": "Detailed explanation of the solution process"
        }
        """
    }

    private struct FormulaExplanationData: Codable {
        let latexFormula: String
        let name: String
        let description: String
        let variables: [Variable]
        let units: Units
        let derivation: String
        let applications: [String]
        let examples: [Example]
        let relatedFormulas: [String]

        struct Variable: Codable {
            let symbol: String
            let name: String
            let description: String
        }

        struct Units: Codable {
            let SI: String
            let common: String
        }

        struct Example: Codable {
            let problem: String
            let solution: String
            let result: String
        }
    }

    private struct SolutionData: Codable {
        let result: Double
        let unit: String
        let steps: [String]
        let explanation: String
    }
}

// MARK: - Formula Explanation

struct FormulaExplanation: Identifiable {
    let id = UUID()
    let formula: String
    let latexFormula: String
    let name: String
    let description: String
    let variables: [Variable]
    let units: Units
    let derivation: String
    let applications: [String]
    let examples: [Example]
    let relatedFormulas: [String]

    struct Variable: Codable {
        let symbol: String
        let name: String
        let description: String
    }

    struct Units: Codable {
        let SI: String
        let common: String
    }

    struct Example: Codable {
        let problem: String
        let solution: String
        let result: String
    }
}

struct FormulaSolution: Identifiable {
    let id = UUID()
    let formula: String
    let solveFor: String
    let knowns: [String: Double]
    let result: Double
    let unit: String
    let steps: [String]
    let explanation: String
}
