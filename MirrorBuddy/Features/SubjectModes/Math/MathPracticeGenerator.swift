import Foundation
import os.log

/// AI-powered practice problem generator for mathematics
actor MathPracticeGenerator {
    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "MathPracticeGenerator")

    // MARK: - Problem Generation

    /// Generate practice problems for a specific topic
    func generateProblems(
        topic: MathTopic,
        difficulty: DifficultyLevel,
        count: Int = 5
    ) async throws -> [MathProblem] {
        logger.info("Generating \(count) \(difficulty.rawValue) problems for \(topic.name)")

        // Generate problems based on topic
        var problems: [MathProblem] = []

        for i in 0..<count {
            if let problem = generateProblemForTopic(topic, difficulty: difficulty, index: i) {
                problems.append(problem)
            }
        }

        return problems
    }

    /// Generate problems with AI assistance
    func generateProblemsWithAI(
        topic: MathTopic,
        difficulty: DifficultyLevel,
        count: Int = 5,
        aiClient: GeminiClient
    ) async throws -> [MathProblem] {
        let prompt = """
        Generate \(count) practice problems for \(topic.name) at \(difficulty.rawValue) level.

        For each problem, provide:
        - question: The problem statement
        - type: Type of problem (e.g., "Linear Equation", "Word Problem")
        - correctAnswer: The correct answer
        - hints: Array of 2-3 helpful hints

        Format as JSON array with these keys.
        Make problems varied and educational.
        """

        let response = try await aiClient.generateContent(
            prompt: prompt,
            systemInstruction: "You are a math teacher creating practice problems. Provide valid JSON only."
        )

        return try parseProblemsFromJSON(response, topic: topic, difficulty: difficulty)
    }

    // MARK: - Topic-Specific Generation

    private func generateProblemForTopic(
        _ topic: MathTopic,
        difficulty: DifficultyLevel,
        index: Int
    ) -> MathProblem? {
        switch topic {
        case .algebra:
            return generateAlgebraProblem(difficulty: difficulty, index: index)
        case .geometry:
            return generateGeometryProblem(difficulty: difficulty, index: index)
        case .trigonometry:
            return generateTrigonometryProblem(difficulty: difficulty, index: index)
        case .calculus:
            return generateCalculusProblem(difficulty: difficulty, index: index)
        case .statistics:
            return generateStatisticsProblem(difficulty: difficulty, index: index)
        case .probability:
            return generateProbabilityProblem(difficulty: difficulty, index: index)
        default:
            return nil
        }
    }

    // MARK: - Algebra Problems

    private func generateAlgebraProblem(difficulty: DifficultyLevel, index: Int) -> MathProblem {
        switch difficulty {
        case .beginner:
            return generateSimpleLinearEquation()
        case .intermediate:
            return generateQuadraticEquation()
        case .advanced:
            return generateSystemOfEquations()
        }
    }

    private func generateSimpleLinearEquation() -> MathProblem {
        let coefficient = Int.random(in: 2...10)
        let constant = Int.random(in: 1...20)
        let result = Int.random(in: 10...50)

        let question = "\(coefficient)x + \(constant) = \(result)"
        let x = Double(result - constant) / Double(coefficient)

        return MathProblem(
            question: "Solve for x: \(question)",
            type: .linearEquation,
            difficulty: .beginner,
            correctAnswer: String(format: "%.2f", x),
            hints: [
                "First, subtract \(constant) from both sides",
                "Then divide by \(coefficient)",
                "Remember: what you do to one side, do to the other"
            ],
            topic: .algebra
        )
    }

    private func generateQuadraticEquation() -> MathProblem {
        let root1 = Int.random(in: -5...5)
        let root2 = Int.random(in: -5...5)

        // (x - root1)(x - root2) = x² - (root1+root2)x + root1*root2
        let b = -(root1 + root2)
        let c = root1 * root2

        let question = "x² \(b >= 0 ? "+" : "")\(b)x \(c >= 0 ? "+" : "")\(c) = 0"

        return MathProblem(
            question: "Solve for x: \(question)",
            type: .quadraticEquation,
            difficulty: .intermediate,
            correctAnswer: root1 == root2 ? "x = \(root1)" : "x = \(root1) or x = \(root2)",
            hints: [
                "Try factoring the quadratic",
                "Or use the quadratic formula: x = (-b ± √(b²-4ac))/2a",
                "Check if it factors into (x - a)(x - b)"
            ],
            topic: .algebra
        )
    }

    private func generateSystemOfEquations() -> MathProblem {
        let x = Int.random(in: 1...10)
        let y = Int.random(in: 1...10)

        let a1 = Int.random(in: 1...5)
        let b1 = Int.random(in: 1...5)
        let c1 = a1 * x + b1 * y

        let a2 = Int.random(in: 1...5)
        let b2 = Int.random(in: 1...5)
        let c2 = a2 * x + b2 * y

        let question = """
        \(a1)x + \(b1)y = \(c1)
        \(a2)x + \(b2)y = \(c2)
        """

        return MathProblem(
            question: "Solve the system of equations:\n\(question)",
            type: .linearEquation,
            difficulty: .advanced,
            correctAnswer: "x = \(x), y = \(y)",
            hints: [
                "Try the substitution method",
                "Or use elimination by adding/subtracting equations",
                "Solve for one variable first, then substitute"
            ],
            topic: .algebra
        )
    }

    // MARK: - Geometry Problems

    private func generateGeometryProblem(difficulty: DifficultyLevel, index: Int) -> MathProblem {
        switch difficulty {
        case .beginner:
            return generateRectangleAreaProblem()
        case .intermediate:
            return generateCircleAreaProblem()
        case .advanced:
            return generateVolumeProble()
        }
    }

    private func generateRectangleAreaProblem() -> MathProblem {
        let length = Int.random(in: 5...20)
        let width = Int.random(in: 3...15)
        let area = length * width

        return MathProblem(
            question: "Find the area of a rectangle with length \(length) and width \(width).",
            type: .geometry,
            difficulty: .beginner,
            correctAnswer: "\(area)",
            hints: [
                "Area of rectangle = length × width",
                "Multiply \(length) by \(width)",
                "Make sure to include units in your final answer"
            ],
            topic: .geometry
        )
    }

    private func generateCircleAreaProblem() -> MathProblem {
        let radius = Int.random(in: 3...12)
        let area = Double.pi * Double(radius * radius)

        return MathProblem(
            question: "Find the area of a circle with radius \(radius).",
            type: .geometry,
            difficulty: .intermediate,
            correctAnswer: String(format: "%.2f", area),
            hints: [
                "Formula: A = πr²",
                "π ≈ 3.14159",
                "Square the radius first, then multiply by π"
            ],
            topic: .geometry
        )
    }

    private func generateVolumeProble() -> MathProblem {
        let radius = Int.random(in: 2...8)
        let height = Int.random(in: 5...15)
        let volume = Double.pi * Double(radius * radius) * Double(height)

        return MathProblem(
            question: "Find the volume of a cylinder with radius \(radius) and height \(height).",
            type: .geometry,
            difficulty: .advanced,
            correctAnswer: String(format: "%.2f", volume),
            hints: [
                "Formula: V = πr²h",
                "First find the base area (πr²)",
                "Then multiply by the height"
            ],
            topic: .geometry
        )
    }

    // MARK: - Trigonometry Problems

    private func generateTrigonometryProblem(difficulty: DifficultyLevel, index: Int) -> MathProblem {
        let angles = [30, 45, 60, 90]
        let angle = angles.randomElement()!

        let sinValues: [Int: Double] = [30: 0.5, 45: 0.707, 60: 0.866, 90: 1.0]
        let sinValue = sinValues[angle]!

        return MathProblem(
            question: "What is sin(\(angle)°)?",
            type: .trigonometry,
            difficulty: difficulty,
            correctAnswer: String(format: "%.3f", sinValue),
            hints: [
                "Remember the unit circle",
                "30-60-90 and 45-45-90 are special triangles",
                "sin(30°) = 1/2, sin(45°) = √2/2, sin(60°) = √3/2, sin(90°) = 1"
            ],
            topic: .trigonometry
        )
    }

    // MARK: - Calculus Problems

    private func generateCalculusProblem(difficulty: DifficultyLevel, index: Int) -> MathProblem {
        switch difficulty {
        case .beginner:
            let exponent = Int.random(in: 2...5)
            let derivative = "\(exponent)x^{\(exponent - 1)}"

            return MathProblem(
                question: "Find the derivative of f(x) = x^\(exponent)",
                type: .calculus,
                difficulty: .beginner,
                correctAnswer: derivative,
                hints: [
                    "Use the power rule: d/dx[x^n] = nx^(n-1)",
                    "Bring down the exponent and reduce it by 1",
                    "f'(x) = \(exponent)x^{\(exponent - 1)}"
                ],
                topic: .calculus
            )

        case .intermediate:
            let a = Int.random(in: 2...5)
            let b = Int.random(in: 2...5)

            return MathProblem(
                question: "Find the derivative of f(x) = \(a)x² + \(b)x",
                type: .calculus,
                difficulty: .intermediate,
                correctAnswer: "\(2 * a)x + \(b)",
                hints: [
                    "Take the derivative of each term separately",
                    "Power rule: d/dx[x^n] = nx^(n-1)",
                    "d/dx[constant·x] = constant"
                ],
                topic: .calculus
            )

        case .advanced:
            return MathProblem(
                question: "Find ∫x²dx from 0 to 3",
                type: .calculus,
                difficulty: .advanced,
                correctAnswer: "9",
                hints: [
                    "Antiderivative of x² is x³/3",
                    "Evaluate at upper bound minus lower bound",
                    "[x³/3] from 0 to 3 = 27/3 - 0 = 9"
                ],
                topic: .calculus
            )
        }
    }

    // MARK: - Statistics Problems

    private func generateStatisticsProblem(difficulty: DifficultyLevel, index: Int) -> MathProblem {
        let data = (0..<5).map { _ in Int.random(in: 1...10) }
        let sum = data.reduce(0, +)
        let mean = Double(sum) / Double(data.count)

        let dataString = data.map { String($0) }.joined(separator: ", ")

        return MathProblem(
            question: "Find the mean of: \(dataString)",
            type: .statistics,
            difficulty: difficulty,
            correctAnswer: String(format: "%.2f", mean),
            hints: [
                "Mean = sum of all values / number of values",
                "Add all numbers: \(sum)",
                "Divide by \(data.count)"
            ],
            topic: .statistics
        )
    }

    // MARK: - Probability Problems

    private func generateProbabilityProblem(difficulty: DifficultyLevel, index: Int) -> MathProblem {
        let totalOutcomes = 6 // dice
        let favorableOutcomes = Int.random(in: 1...3)

        let probability = Double(favorableOutcomes) / Double(totalOutcomes)

        return MathProblem(
            question: "What is the probability of rolling a number less than or equal to \(favorableOutcomes) on a fair die?",
            type: .arithmetic,
            difficulty: difficulty,
            correctAnswer: String(format: "%.3f", probability),
            hints: [
                "Probability = favorable outcomes / total outcomes",
                "A die has 6 sides",
                "P = \(favorableOutcomes)/6"
            ],
            topic: .probability
        )
    }

    // MARK: - Helper Methods

    private func parseProblemsFromJSON(
        _ json: String,
        topic: MathTopic,
        difficulty: DifficultyLevel
    ) throws -> [MathProblem] {
        guard let data = json.data(using: .utf8),
              let jsonArray = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            throw MathModeError.invalidProblem
        }

        return jsonArray.compactMap { dict -> MathProblem? in
            guard let question = dict["question"] as? String,
                  let typeString = dict["type"] as? String,
                  let correctAnswer = dict["correctAnswer"] as? String,
                  let hints = dict["hints"] as? [String] else {
                return nil
            }

            let type = ProblemType(rawValue: typeString) ?? .arithmetic

            return MathProblem(
                question: question,
                type: type,
                difficulty: difficulty,
                correctAnswer: correctAnswer,
                hints: hints,
                topic: topic
            )
        }
    }
}
