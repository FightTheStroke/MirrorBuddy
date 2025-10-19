import XCTest
@testable import MirrorBuddy

@MainActor
final class MathModeTests: XCTestCase {

    var mathMode: MathModeService!

    override func setUp() {
        super.setUp()
        mathMode = MathModeService.shared
    }

    override func tearDown() {
        mathMode = nil
        super.tearDown()
    }

    // MARK: - MathModeService Tests

    func testStartSession() {
        // Given
        let topic = MathTopic.algebra
        let difficulty = DifficultyLevel.intermediate

        // When
        mathMode.startSession(topic: topic, difficulty: difficulty)

        // Then
        XCTAssertEqual(mathMode.currentTopic, topic)
        XCTAssertEqual(mathMode.difficultyLevel, difficulty)
    }

    func testRecordSolvedProblem() {
        // Given
        mathMode.startSession(topic: .algebra, difficulty: .beginner)
        let problem = MathProblem(
            question: "2x + 5 = 13",
            type: .linearEquation,
            difficulty: .beginner,
            correctAnswer: "4",
            topic: .algebra
        )
        let solvedProblem = SolvedProblem(
            problem: problem,
            steps: [],
            wasCorrect: true,
            timeSpent: 30,
            timestamp: Date()
        )

        // When
        mathMode.recordSolvedProblem(solvedProblem)

        // Then
        XCTAssertEqual(mathMode.sessionProblems.count, 1)
    }

    func testGetSessionStats() {
        // Given
        mathMode.startSession(topic: .algebra, difficulty: .intermediate)

        // When
        let stats = mathMode.getSessionStats()

        // Then
        XCTAssertEqual(stats.topic, .algebra)
        XCTAssertEqual(stats.currentDifficulty, .intermediate)
        XCTAssertEqual(stats.totalProblems, 0)
    }

    // MARK: - MathProblemSolver Tests

    func testLinearEquationSolving() async {
        // Given
        let solver = MathProblemSolver()
        let problem = MathProblem(
            question: "2x + 5 = 13",
            type: .linearEquation,
            difficulty: .beginner,
            correctAnswer: "4",
            topic: .algebra
        )

        // When
        let solution = try? await solver.solveProblem(problem)

        // Then
        XCTAssertNotNil(solution)
        XCTAssertFalse(solution!.steps.isEmpty)
        XCTAssertEqual(solution!.finalAnswer, "4.00")
    }

    func testValidateCorrectAnswer() {
        // Given
        let solver = MathProblemSolver()
        let problem = MathProblem(
            question: "2 + 2",
            type: .arithmetic,
            difficulty: .beginner,
            correctAnswer: "4",
            topic: .algebra
        )

        // When
        let result = solver.validateAnswer("4", for: problem)

        // Then
        XCTAssertTrue(result.isCorrect)
    }

    func testValidateIncorrectAnswer() {
        // Given
        let solver = MathProblemSolver()
        let problem = MathProblem(
            question: "2 + 2",
            type: .arithmetic,
            difficulty: .beginner,
            correctAnswer: "4",
            topic: .algebra
        )

        // When
        let result = solver.validateAnswer("5", for: problem)

        // Then
        XCTAssertFalse(result.isCorrect)
    }

    // MARK: - MathGraphRenderer Tests

    func testGenerateFunctionData() {
        // Given
        let renderer = MathGraphRenderer()
        let function = MathFunction.linear(m: 2, b: 1)

        // When
        let data = renderer.generateFunctionData(function: function, xRange: -5...5, points: 11)

        // Then
        XCTAssertEqual(data.count, 11)
        XCTAssertEqual(data.first?.x, -5)
        XCTAssertEqual(data.last?.x, 5)
    }

    func testCalculateDerivative() {
        // Given
        let renderer = MathGraphRenderer()
        let function = MathFunction.quadratic(a: 1, b: 0, c: 0) // f(x) = x²

        // When
        let derivative = renderer.calculateDerivative(function: function, at: 3)

        // Then
        XCTAssertNotNil(derivative)
        XCTAssertEqual(derivative!, 6.0, accuracy: 0.01) // f'(3) = 2*3 = 6
    }

    func testCalculateIntegral() {
        // Given
        let renderer = MathGraphRenderer()
        let function = MathFunction.linear(m: 1, b: 0) // f(x) = x

        // When
        let integral = renderer.calculateIntegral(function: function, from: 0, to: 2)

        // Then
        XCTAssertNotNil(integral)
        XCTAssertEqual(integral!, 2.0, accuracy: 0.1) // ∫₀² x dx = [x²/2]₀² = 2
    }

    // MARK: - FormulaLibrary Tests

    func testGetFormulasForTopic() {
        // Given
        let library = FormulaLibrary()

        // When
        let algebraFormulas = library.getFormulas(for: .algebra)

        // Then
        XCTAssertFalse(algebraFormulas.isEmpty)
        XCTAssertTrue(algebraFormulas.contains { $0.id == "alg_quadratic" })
    }

    func testSearchFormulas() {
        // Given
        let library = FormulaLibrary()

        // When
        let results = library.searchFormulas(query: "quadratic")

        // Then
        XCTAssertFalse(results.isEmpty)
        XCTAssertTrue(results.contains { $0.name.lowercased().contains("quadratic") })
    }

    func testGetFormulaById() {
        // Given
        let library = FormulaLibrary()

        // When
        let formula = library.getFormula(id: "alg_quadratic")

        // Then
        XCTAssertNotNil(formula)
        XCTAssertEqual(formula?.name, "Quadratic Formula")
    }

    // MARK: - MathPracticeGenerator Tests

    func testGenerateAlgebraProblems() async {
        // Given
        let generator = MathPracticeGenerator()

        // When
        let problems = try? await generator.generateProblems(topic: .algebra, difficulty: .beginner, count: 5)

        // Then
        XCTAssertNotNil(problems)
        XCTAssertEqual(problems?.count, 5)
    }

    func testGenerateGeometryProblems() async {
        // Given
        let generator = MathPracticeGenerator()

        // When
        let problems = try? await generator.generateProblems(topic: .geometry, difficulty: .intermediate, count: 3)

        // Then
        XCTAssertNotNil(problems)
        XCTAssertEqual(problems?.count, 3)
    }

    // MARK: - MathPrompts Tests

    func testGetTopicPrompt() {
        // Given
        let prompts = MathPrompts()

        // When
        let prompt = prompts.getTopicPrompt(for: .algebra, difficulty: .intermediate)

        // Then
        XCTAssertFalse(prompt.isEmpty)
        XCTAssertTrue(prompt.contains("algebra"))
    }

    func testGetProblemSolvingPrompt() {
        // Given
        let prompts = MathPrompts()

        // When
        let prompt = prompts.getProblemSolvingPrompt(problem: "2x + 5 = 13", topic: .algebra)

        // Then
        XCTAssertFalse(prompt.isEmpty)
        XCTAssertTrue(prompt.contains("2x + 5 = 13"))
    }

    // MARK: - MathMindMapTemplate Tests

    func testGenerateAlgebraTemplate() {
        // Given
        let templateGenerator = MathMindMapTemplate()

        // When
        let template = templateGenerator.generateTemplate(for: .algebra)

        // Then
        XCTAssertEqual(template.topic, .algebra)
        XCTAssertFalse(template.branches.isEmpty)
        XCTAssertFalse(template.studyNotes.isEmpty)
    }

    func testGenerateCalculusTemplate() {
        // Given
        let templateGenerator = MathMindMapTemplate()

        // When
        let template = templateGenerator.generateTemplate(for: .calculus)

        // Then
        XCTAssertEqual(template.topic, .calculus)
        XCTAssertTrue(template.branches.contains { $0.title == "Derivatives" || $0.title == "Derivate" })
    }
}
