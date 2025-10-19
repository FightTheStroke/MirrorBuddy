import Foundation

/// Science and Physics-specific prompts for AI interactions
enum SciencePrompts {

    // MARK: - Experiment Simulation Prompts

    static func experimentSimulationPrompt(
        experimentType: String,
        parameters: [String: Double]
    ) -> String {
        let paramsList = parameters.map { "\($0.key): \($0.value)" }.joined(separator: ", ")

        return """
        Create a detailed physics experiment simulation:

        Experiment: \(experimentType)
        Parameters: \(paramsList)

        Generate comprehensive simulation data including:
        1. Accurate physics calculations
        2. Time-series data points (20-30 points)
        3. Energy calculations if applicable
        4. Velocity/acceleration data if applicable
        5. Clear explanation of results

        Ensure all calculations follow correct physics principles and formulas.
        """
    }

    // MARK: - Formula Explanation Prompts

    static func formulaExplanationPrompt(formula: String, context: String?) -> String {
        let contextSection = context.map { "\nContext: \($0)" } ?? ""

        return """
        Provide a comprehensive explanation of this physics/chemistry formula:

        Formula: \(formula)\(contextSection)

        Include:
        1. LaTeX formatted version of the formula
        2. Name and what it calculates
        3. Detailed explanation of each variable
        4. SI units and common alternative units
        5. Brief derivation or origin
        6. 4-5 practical applications
        7. 2-3 worked examples with step-by-step solutions
        8. Related formulas

        Format as educational content suitable for high school or undergraduate students.
        """
    }

    static func formulaSolutionPrompt(
        formula: String,
        knowns: [String: Double],
        solveFor: String
    ) -> String {
        let knownsList = knowns.map { "\($0.key) = \($0.value)" }.joined(separator: ", ")

        return """
        Solve this physics problem step by step:

        Formula: \(formula)
        Given: \(knownsList)
        Find: \(solveFor)

        Show:
        1. The relevant formula
        2. Each substitution step
        3. Each simplification step
        4. Final answer with correct units
        5. Brief interpretation of the result

        Use clear mathematical notation and explain your reasoning.
        """
    }

    // MARK: - Lab Report Prompts

    static func labReportPrompt(experimentType: String, objective: String) -> String {
        """
        Generate a comprehensive lab report template for:

        Experiment Type: \(experimentType)
        Objective: \(objective)

        Create a structured template including:
        1. Title (descriptive)
        2. Objective (clear statement)
        3. Hypothesis (if applicable)
        4. Materials list (specific items and quantities)
        5. Detailed procedure (numbered steps)
        6. Data table template (with appropriate columns)
        7. Sample calculations (with formulas explained)
        8. Conclusion guidelines (what to include)
        9. Safety notes (relevant precautions)

        Return as valid JSON with these sections.
        """
    }

    // MARK: - Diagram Annotation Prompts

    static func diagramAnnotationPrompt(topic: String) -> String {
        """
        Analyze this scientific diagram about: \(topic)

        Identify and explain:
        1. Diagram type and purpose
        2. Main components (3-6 key parts)
        3. Important labels and their meanings
        4. How the system works or what it shows
        5. Key scientific principles illustrated
        6. Common misconceptions to clarify

        Provide educational annotations suitable for student learning.
        Return as valid JSON.
        """
    }

    // MARK: - Physics Demo Prompts

    static func physicsDemoPrompt(concept: String) -> String {
        """
        Create an interactive physics demonstration for: \(concept)

        Design a hands-on demonstration including:
        1. Concept name and description
        2. Setup instructions (materials and arrangement)
        3. Step-by-step procedure (4-6 steps)
            - Each step should include instruction and expected observation
        4. Expected outcome (what students will see)
        5. Scientific explanation (why it happens)
        6. Safety warnings (if applicable)
        7. Variations to try (2-3 alternatives)

        Make it engaging, educational, and safe for classroom use.
        Return as valid JSON.
        """
    }

    // MARK: - Homework Help Prompts

    static func conceptExplanationPrompt(concept: String, level: String) -> String {
        """
        Explain this physics/science concept: \(concept)

        Level: \(level)

        Provide:
        1. Clear definition in simple terms
        2. Real-world analogy or example
        3. Key principles involved
        4. Common applications
        5. Visual description (how to picture it)
        6. Common misconceptions to avoid
        7. Connection to related concepts

        Use language appropriate for \(level) students.
        """
    }

    static func problemSolvingPrompt(problem: String, hints: Bool) -> String {
        """
        Help solve this physics problem:

        \(problem)

        Provide:
        1. Problem analysis (what we're solving for)
        2. Relevant formulas or principles
        \(hints ? "3. Helpful hints without giving away the answer\n4. Step-by-step guidance\n5. How to check your answer" : "3. Complete step-by-step solution\n4. Final answer with units\n5. Verification of the result")

        Focus on teaching problem-solving process, not just getting the answer.
        """
    }

    static func labSafetyPrompt(experiment: String) -> String {
        """
        Provide comprehensive safety information for: \(experiment)

        Include:
        1. Required safety equipment (goggles, gloves, etc.)
        2. Potential hazards to be aware of
        3. Proper handling procedures
        4. Emergency procedures if something goes wrong
        5. Disposal instructions for materials
        6. Workspace requirements

        Prioritize student safety while maintaining educational value.
        """
    }

    // MARK: - Study Assistance Prompts

    static func practiceProblemsPrompt(topic: String, difficulty: String, count: Int) -> String {
        """
        Generate \(count) practice problems for: \(topic)

        Difficulty: \(difficulty)

        For each problem:
        1. Clear problem statement
        2. All necessary information provided
        3. Appropriate difficulty level
        4. Realistic scenario
        5. Solution with detailed steps
        6. Key concepts tested

        Vary the problem types to cover different aspects of the topic.
        """
    }

    static func quizPreparationPrompt(topics: [String], focus: String) -> String {
        let topicList = topics.joined(separator: ", ")

        return """
        Create quiz preparation material for:

        Topics: \(topicList)
        Focus: \(focus)

        Generate:
        1. Key formulas to memorize (with LaTeX)
        2. Important concepts to understand
        3. Common problem types
        4. 10 multiple choice questions with explanations
        5. 5 calculation problems with solutions
        6. Quick review summary
        7. Study tips specific to these topics

        Format as a comprehensive study guide.
        """
    }

    // MARK: - Interactive Learning Prompts

    static func thoughtExperimentPrompt(scenario: String) -> String {
        """
        Create a thought experiment based on: \(scenario)

        Design an engaging mental exercise that:
        1. Presents an interesting physics scenario
        2. Asks thought-provoking questions
        3. Challenges intuition
        4. Reveals deeper understanding
        5. Connects to real physics principles
        6. Has a surprising or educational conclusion

        Make it accessible but intellectually stimulating.
        """
    }

    static func realWorldConnectionPrompt(concept: String) -> String {
        """
        Explain real-world applications of: \(concept)

        Provide:
        1. 5-7 everyday examples where this concept appears
        2. How technology uses this principle
        3. Why it matters in engineering or medicine
        4. Interesting historical developments
        5. Future applications or research
        6. How to observe this in daily life

        Make physics relevant and engaging for students.
        """
    }
}
