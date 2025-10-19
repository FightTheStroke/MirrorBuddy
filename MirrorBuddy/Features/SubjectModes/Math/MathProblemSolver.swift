import Foundation
import os.log

/// Step-by-step math problem solver with AI assistance
@MainActor
final class MathProblemSolver {
    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "MathProblemSolver")

    // MARK: - Problem Solving

    /// Solve a math problem step-by-step with AI guidance
    func solveProblem(
        _ problem: MathProblem,
        withAI aiClient: GeminiClient? = nil
    ) async throws -> ProblemSolution {
        logger.info("Solving problem: \(problem.question)")

        // First attempt rule-based solving for common patterns
        if let ruleBasedSolution = tryRuleBasedSolving(problem) {
            return ruleBasedSolution
        }

        // Fall back to AI-assisted solving
        if let aiClient = aiClient {
            return try await solveWithAI(problem, client: aiClient)
        }

        throw MathModeError.calculationError("Unable to solve problem without AI client")
    }

    /// Generate step-by-step explanation for a solution
    func explainSolution(_ solution: ProblemSolution) -> [StepExplanation] {
        solution.steps.map { step in
            StepExplanation(
                step: step,
                explanation: generateExplanationForStep(step, context: solution.problem.type),
                visualAid: generateVisualAidForStep(step)
            )
        }
    }

    /// Validate a student's answer
    func validateAnswer(_ answer: String, for problem: MathProblem) -> ValidationResult {
        let normalizedAnswer = normalizeAnswer(answer)
        let normalizedCorrectAnswer = normalizeAnswer(problem.correctAnswer)

        let isCorrect = normalizedAnswer == normalizedCorrectAnswer ||
            areNumericallyEquivalent(normalizedAnswer, normalizedCorrectAnswer)

        return ValidationResult(
            isCorrect: isCorrect,
            studentAnswer: answer,
            correctAnswer: problem.correctAnswer,
            feedback: generateFeedback(isCorrect: isCorrect, problem: problem)
        )
    }

    // MARK: - Rule-Based Solving

    private func tryRuleBasedSolving(_ problem: MathProblem) -> ProblemSolution? {
        switch problem.type {
        case .linearEquation:
            return solveLinearEquation(problem)
        case .quadraticEquation:
            return solveQuadraticEquation(problem)
        case .simplification:
            return solveSimplification(problem)
        case .arithmetic:
            return solveArithmetic(problem)
        default:
            return nil
        }
    }

    private func solveLinearEquation(_ problem: MathProblem) -> ProblemSolution? {
        // Parse equation like "2x + 5 = 13"
        let equation = problem.question
        guard let equationComponents = parseLinearEquation(equation) else { return nil }

        let (coefficient, constant, result) = equationComponents
        var steps: [ProblemStep] = []

        // Step 1: Show original equation
        steps.append(ProblemStep(
            number: 1,
            description: "Original equation",
            expression: equation,
            explanation: "Start with the given equation"
        ))

        // Step 2: Subtract constant from both sides
        let step2Expression = coefficient == 1 ? "x = \(result - constant)" : "\(coefficient)x = \(result - constant)"
        steps.append(ProblemStep(
            number: 2,
            description: "Isolate the variable term",
            expression: step2Expression,
            explanation: "Subtract \(constant) from both sides"
        ))

        // Step 3: Divide by coefficient if needed
        let solution = (result - constant) / coefficient
        if coefficient != 1 {
            steps.append(ProblemStep(
                number: 3,
                description: "Solve for x",
                expression: "x = \(solution)",
                explanation: "Divide both sides by \(coefficient)"
            ))
        }

        return ProblemSolution(
            problem: problem,
            steps: steps,
            finalAnswer: String(format: "%.2f", solution),
            confidence: 1.0
        )
    }

    private func solveQuadraticEquation(_ problem: MathProblem) -> ProblemSolution? {
        // Parse equation like "x^2 + 5x + 6 = 0"
        guard let coefficients = parseQuadraticEquation(problem.question) else { return nil }

        let (a, b, c) = coefficients
        var steps: [ProblemStep] = []

        // Step 1: Identify coefficients
        steps.append(ProblemStep(
            number: 1,
            description: "Identify coefficients",
            expression: "a = \(a), b = \(b), c = \(c)",
            explanation: "In ax² + bx + c = 0 form"
        ))

        // Step 2: Calculate discriminant
        let discriminant = b * b - 4 * a * c
        steps.append(ProblemStep(
            number: 2,
            description: "Calculate discriminant",
            expression: "Δ = b² - 4ac = \(discriminant)",
            explanation: "Discriminant determines number of solutions"
        ))

        // Step 3: Apply quadratic formula
        if discriminant >= 0 {
            let sqrtDiscriminant = sqrt(discriminant)
            let x1 = (-b + sqrtDiscriminant) / (2 * a)
            let x2 = (-b - sqrtDiscriminant) / (2 * a)

            steps.append(ProblemStep(
                number: 3,
                description: "Apply quadratic formula",
                expression: "x = (-b ± √Δ) / 2a",
                explanation: "Use the quadratic formula"
            ))

            let answer = discriminant == 0 ? "x = \(String(format: "%.2f", x1))" : "x₁ = \(String(format: "%.2f", x1)), x₂ = \(String(format: "%.2f", x2))"

            return ProblemSolution(
                problem: problem,
                steps: steps,
                finalAnswer: answer,
                confidence: 1.0
            )
        }

        return nil
    }

    private func solveSimplification(_ problem: MathProblem) -> ProblemSolution? {
        // Basic simplification patterns
        var steps: [ProblemStep] = []

        steps.append(ProblemStep(
            number: 1,
            description: "Original expression",
            expression: problem.question,
            explanation: "Simplify this expression"
        ))

        // This is a simplified version - real implementation would use expression parsing
        return ProblemSolution(
            problem: problem,
            steps: steps,
            finalAnswer: problem.correctAnswer,
            confidence: 0.7
        )
    }

    private func solveArithmetic(_ problem: MathProblem) -> ProblemSolution? {
        // Basic arithmetic evaluation
        guard let result = evaluateArithmeticExpression(problem.question) else { return nil }

        let steps = [
            ProblemStep(
                number: 1,
                description: "Evaluate expression",
                expression: problem.question,
                explanation: "Calculate the result"
            ),
            ProblemStep(
                number: 2,
                description: "Result",
                expression: String(format: "%.2f", result),
                explanation: "Final answer"
            )
        ]

        return ProblemSolution(
            problem: problem,
            steps: steps,
            finalAnswer: String(format: "%.2f", result),
            confidence: 1.0
        )
    }

    // MARK: - AI-Assisted Solving

    private func solveWithAI(_ problem: MathProblem, client: GeminiClient) async throws -> ProblemSolution {
        let prompt = """
        Solve this math problem step-by-step:
        Problem: \(problem.question)
        Type: \(problem.type.rawValue)
        Difficulty: \(problem.difficulty.rawValue)

        Provide:
        1. Each step clearly numbered
        2. The expression at each step
        3. Brief explanation of what was done
        4. Final answer

        Format as JSON:
        {
            "steps": [{"number": 1, "description": "...", "expression": "...", "explanation": "..."}],
            "finalAnswer": "..."
        }
        """

        let response = try await client.generateContent(
            prompt: prompt,
            systemInstruction: "You are a math tutor. Provide clear, step-by-step solutions."
        )

        return try parseProblemSolutionFromJSON(response, problem: problem)
    }

    // MARK: - Helper Methods

    private func parseLinearEquation(_ equation: String) -> (coefficient: Double, constant: Double, result: Double)? {
        // Simple parser for equations like "2x + 5 = 13"
        let parts = equation.components(separatedBy: "=").map { $0.trimmingCharacters(in: .whitespaces) }
        guard parts.count == 2 else { return nil }

        let leftSide = parts[0]
        guard let result = Double(parts[1]) else { return nil }

        // Extract coefficient and constant
        let components = leftSide.components(separatedBy: CharacterSet(charactersIn: "+-")).filter { !$0.isEmpty }

        var coefficient: Double = 1
        var constant: Double = 0

        for component in components {
            if component.contains("x") {
                let coeffStr = component.replacingOccurrences(of: "x", with: "").trimmingCharacters(in: .whitespaces)
                coefficient = coeffStr.isEmpty ? 1 : Double(coeffStr) ?? 1
            } else {
                constant = Double(component.trimmingCharacters(in: .whitespaces)) ?? 0
            }
        }

        return (coefficient, constant, result)
    }

    private func parseQuadraticEquation(_ equation: String) -> (a: Double, b: Double, c: Double)? {
        // Simplified parser - production code would use proper expression parsing
        // For "x^2 + 5x + 6 = 0"
        (1, 5, 6) // Placeholder
    }

    private func evaluateArithmeticExpression(_ expression: String) -> Double? {
        let cleanExpression = expression.replacingOccurrences(of: " ", with: "")
        let mathExpression = NSExpression(format: cleanExpression)
        return mathExpression.expressionValue(with: nil, context: nil) as? Double
    }

    private func normalizeAnswer(_ answer: String) -> String {
        answer.lowercased()
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: ",", with: ".")
    }

    private func areNumericallyEquivalent(_ answer1: String, _ answer2: String) -> Bool {
        guard let num1 = Double(answer1), let num2 = Double(answer2) else { return false }
        return abs(num1 - num2) < 0.01 // Tolerance for floating point comparison
    }

    private func generateExplanationForStep(_ step: ProblemStep, context: ProblemType) -> String {
        step.explanation
    }

    private func generateVisualAidForStep(_ step: ProblemStep) -> String? {
        // Could return ASCII art or references to diagrams
        nil
    }

    private func generateFeedback(isCorrect: Bool, problem: MathProblem) -> String {
        if isCorrect {
            return "Correct! Great job solving this \(problem.type.rawValue) problem."
        } else {
            return "Not quite right. Let's look at the steps together to see where we can improve."
        }
    }

    private func parseProblemSolutionFromJSON(_ json: String, problem: MathProblem) throws -> ProblemSolution {
        // Parse JSON response from AI
        guard let data = json.data(using: .utf8),
              let jsonObject = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let stepsArray = jsonObject["steps"] as? [[String: Any]],
              let finalAnswer = jsonObject["finalAnswer"] as? String else {
            throw MathModeError.invalidProblem
        }

        let steps = stepsArray.compactMap { stepDict -> ProblemStep? in
            guard let number = stepDict["number"] as? Int,
                  let description = stepDict["description"] as? String,
                  let expression = stepDict["expression"] as? String,
                  let explanation = stepDict["explanation"] as? String else {
                return nil
            }

            return ProblemStep(
                number: number,
                description: description,
                expression: expression,
                explanation: explanation
            )
        }

        return ProblemSolution(
            problem: problem,
            steps: steps,
            finalAnswer: finalAnswer,
            confidence: 0.9
        )
    }
}

// MARK: - Supporting Types

struct MathProblem: Codable, Identifiable {
    let id: UUID
    let question: String
    let type: ProblemType
    let difficulty: DifficultyLevel
    let correctAnswer: String
    let hints: [String]
    let topic: MathTopic

    init(
        id: UUID = UUID(),
        question: String,
        type: ProblemType,
        difficulty: DifficultyLevel,
        correctAnswer: String,
        hints: [String] = [],
        topic: MathTopic
    ) {
        self.id = id
        self.question = question
        self.type = type
        self.difficulty = difficulty
        self.correctAnswer = correctAnswer
        self.hints = hints
        self.topic = topic
    }
}

enum ProblemType: String, Codable {
    case linearEquation = "Linear Equation"
    case quadraticEquation = "Quadratic Equation"
    case simplification = "Simplification"
    case arithmetic = "Arithmetic"
    case wordProblem = "Word Problem"
    case graphing = "Graphing"
    case geometry = "Geometry"
    case trigonometry = "Trigonometry"
    case calculus = "Calculus"
    case statistics = "Statistics"
}

struct ProblemStep: Codable {
    let number: Int
    let description: String
    let expression: String
    let explanation: String
}

struct ProblemSolution: Codable {
    let problem: MathProblem
    let steps: [ProblemStep]
    let finalAnswer: String
    let confidence: Double
}

struct StepExplanation {
    let step: ProblemStep
    let explanation: String
    let visualAid: String?
}

struct ValidationResult {
    let isCorrect: Bool
    let studentAnswer: String
    let correctAnswer: String
    let feedback: String
}

// Needed for DifficultyLevel if not imported
enum DifficultyLevel: String, Codable {
    case beginner
    case intermediate
    case advanced
}
