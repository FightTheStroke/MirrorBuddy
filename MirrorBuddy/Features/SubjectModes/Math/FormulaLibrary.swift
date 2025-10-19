import Foundation

/// Comprehensive library of mathematical formulas organized by topic
final class FormulaLibrary {

    // MARK: - Formula Retrieval

    /// Get all formulas for a specific topic
    func getFormulas(for topic: MathTopic) -> [Formula] {
        switch topic {
        case .algebra:
            return algebraFormulas
        case .geometry:
            return geometryFormulas
        case .trigonometry:
            return trigonometryFormulas
        case .calculus:
            return calculusFormulas
        case .statistics:
            return statisticsFormulas
        case .probability:
            return probabilityFormulas
        case .linearAlgebra:
            return linearAlgebraFormulas
        case .discreteMath:
            return discreteMathFormulas
        }
    }

    /// Search formulas by keyword
    func searchFormulas(query: String) -> [Formula] {
        let allFormulas = MathTopic.allCases.flatMap { getFormulas(for: $0) }
        let lowercaseQuery = query.lowercased()

        return allFormulas.filter { formula in
            formula.name.lowercased().contains(lowercaseQuery) ||
            formula.description.lowercased().contains(lowercaseQuery) ||
            formula.tags.contains { $0.lowercased().contains(lowercaseQuery) }
        }
    }

    /// Get formula by ID
    func getFormula(id: String) -> Formula? {
        let allFormulas = MathTopic.allCases.flatMap { getFormulas(for: $0) }
        return allFormulas.first { $0.id == id }
    }

    // MARK: - Algebra Formulas

    private var algebraFormulas: [Formula] {
        [
            Formula(
                id: "alg_quadratic",
                name: "Quadratic Formula",
                latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
                description: "Solves quadratic equations of the form ax² + bx + c = 0",
                example: "For x² + 5x + 6 = 0: x = (-5 ± √(25-24))/2 = -2 or -3",
                whenToUse: "When solving any quadratic equation",
                tags: ["quadratic", "roots", "equations"],
                topic: .algebra
            ),
            Formula(
                id: "alg_slope",
                name: "Slope Formula",
                latex: "m = \\frac{y_2 - y_1}{x_2 - x_1}",
                description: "Calculates the slope between two points",
                example: "Points (1,2) and (3,6): m = (6-2)/(3-1) = 2",
                whenToUse: "Finding the rate of change between two points",
                tags: ["slope", "linear", "rate"],
                topic: .algebra
            ),
            Formula(
                id: "alg_distance",
                name: "Distance Formula",
                latex: "d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}",
                description: "Calculates distance between two points in 2D space",
                example: "Distance from (0,0) to (3,4): d = √(9+16) = 5",
                whenToUse: "Finding straight-line distance between points",
                tags: ["distance", "coordinate", "geometry"],
                topic: .algebra
            ),
            Formula(
                id: "alg_midpoint",
                name: "Midpoint Formula",
                latex: "M = \\left(\\frac{x_1 + x_2}{2}, \\frac{y_1 + y_2}{2}\\right)",
                description: "Finds the midpoint between two points",
                example: "Midpoint of (2,3) and (6,7): M = (4,5)",
                whenToUse: "Finding the center point of a line segment",
                tags: ["midpoint", "coordinate", "center"],
                topic: .algebra
            ),
            Formula(
                id: "alg_difference_squares",
                name: "Difference of Squares",
                latex: "a^2 - b^2 = (a+b)(a-b)",
                description: "Factoring pattern for difference of perfect squares",
                example: "x² - 9 = (x+3)(x-3)",
                whenToUse: "Factoring expressions with squared terms",
                tags: ["factoring", "squares", "patterns"],
                topic: .algebra
            )
        ]
    }

    // MARK: - Geometry Formulas

    private var geometryFormulas: [Formula] {
        [
            Formula(
                id: "geo_circle_area",
                name: "Circle Area",
                latex: "A = \\pi r^2",
                description: "Calculates the area of a circle",
                example: "For radius 3: A = π(3²) = 9π ≈ 28.27",
                whenToUse: "Finding area enclosed by a circle",
                tags: ["circle", "area", "pi"],
                topic: .geometry
            ),
            Formula(
                id: "geo_circle_circumference",
                name: "Circle Circumference",
                latex: "C = 2\\pi r",
                description: "Calculates the perimeter of a circle",
                example: "For radius 5: C = 2π(5) = 10π ≈ 31.42",
                whenToUse: "Finding the distance around a circle",
                tags: ["circle", "perimeter", "circumference"],
                topic: .geometry
            ),
            Formula(
                id: "geo_triangle_area",
                name: "Triangle Area",
                latex: "A = \\frac{1}{2}bh",
                description: "Calculates area using base and height",
                example: "Base 6, height 4: A = ½(6)(4) = 12",
                whenToUse: "Finding area of any triangle with known base and height",
                tags: ["triangle", "area"],
                topic: .geometry
            ),
            Formula(
                id: "geo_pythagorean",
                name: "Pythagorean Theorem",
                latex: "a^2 + b^2 = c^2",
                description: "Relates sides of a right triangle",
                example: "Sides 3 and 4: c² = 9 + 16, so c = 5",
                whenToUse: "Finding unknown side of right triangle",
                tags: ["triangle", "right triangle", "hypotenuse"],
                topic: .geometry
            ),
            Formula(
                id: "geo_sphere_volume",
                name: "Sphere Volume",
                latex: "V = \\frac{4}{3}\\pi r^3",
                description: "Calculates volume of a sphere",
                example: "For radius 3: V = 4/3π(27) = 36π ≈ 113.1",
                whenToUse: "Finding space enclosed by a sphere",
                tags: ["sphere", "volume", "3D"],
                topic: .geometry
            ),
            Formula(
                id: "geo_cylinder_volume",
                name: "Cylinder Volume",
                latex: "V = \\pi r^2 h",
                description: "Calculates volume of a cylinder",
                example: "Radius 2, height 5: V = π(4)(5) = 20π",
                whenToUse: "Finding volume of cylindrical objects",
                tags: ["cylinder", "volume", "3D"],
                topic: .geometry
            )
        ]
    }

    // MARK: - Trigonometry Formulas

    private var trigonometryFormulas: [Formula] {
        [
            Formula(
                id: "trig_sin_def",
                name: "Sine Definition",
                latex: "\\sin(\\theta) = \\frac{\\text{opposite}}{\\text{hypotenuse}}",
                description: "Ratio of opposite side to hypotenuse in right triangle",
                example: "In a 3-4-5 triangle: sin(θ) = 3/5 = 0.6",
                whenToUse: "Finding angles or sides in right triangles",
                tags: ["sine", "ratio", "right triangle"],
                topic: .trigonometry
            ),
            Formula(
                id: "trig_cos_def",
                name: "Cosine Definition",
                latex: "\\cos(\\theta) = \\frac{\\text{adjacent}}{\\text{hypotenuse}}",
                description: "Ratio of adjacent side to hypotenuse in right triangle",
                example: "In a 3-4-5 triangle: cos(θ) = 4/5 = 0.8",
                whenToUse: "Finding angles or sides in right triangles",
                tags: ["cosine", "ratio", "right triangle"],
                topic: .trigonometry
            ),
            Formula(
                id: "trig_tan_def",
                name: "Tangent Definition",
                latex: "\\tan(\\theta) = \\frac{\\text{opposite}}{\\text{adjacent}} = \\frac{\\sin(\\theta)}{\\cos(\\theta)}",
                description: "Ratio of opposite to adjacent sides",
                example: "In a 3-4-5 triangle: tan(θ) = 3/4 = 0.75",
                whenToUse: "Finding angles or slopes",
                tags: ["tangent", "ratio", "slope"],
                topic: .trigonometry
            ),
            Formula(
                id: "trig_pythagorean",
                name: "Pythagorean Identity",
                latex: "\\sin^2(\\theta) + \\cos^2(\\theta) = 1",
                description: "Fundamental trigonometric identity",
                example: "If sin(θ) = 0.6, then cos²(θ) = 1 - 0.36 = 0.64, cos(θ) = 0.8",
                whenToUse: "Converting between sin and cos values",
                tags: ["identity", "pythagorean", "fundamental"],
                topic: .trigonometry
            ),
            Formula(
                id: "trig_law_sines",
                name: "Law of Sines",
                latex: "\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}",
                description: "Relates sides and angles in any triangle",
                example: "If a=10, A=30°, B=45°: b = 10sin(45°)/sin(30°) ≈ 14.14",
                whenToUse: "Solving non-right triangles (ASA, AAS, SSA cases)",
                tags: ["law of sines", "triangle", "angles"],
                topic: .trigonometry
            ),
            Formula(
                id: "trig_law_cosines",
                name: "Law of Cosines",
                latex: "c^2 = a^2 + b^2 - 2ab\\cos C",
                description: "Relates all three sides and one angle",
                example: "Sides a=5, b=7, angle C=60°: c² = 25 + 49 - 70cos(60°) = 39",
                whenToUse: "Solving non-right triangles (SAS, SSS cases)",
                tags: ["law of cosines", "triangle", "sides"],
                topic: .trigonometry
            )
        ]
    }

    // MARK: - Calculus Formulas

    private var calculusFormulas: [Formula] {
        [
            Formula(
                id: "calc_power_rule",
                name: "Power Rule",
                latex: "\\frac{d}{dx}[x^n] = nx^{n-1}",
                description: "Derivative of power functions",
                example: "d/dx[x³] = 3x²",
                whenToUse: "Taking derivatives of polynomial terms",
                tags: ["derivative", "power", "basic"],
                topic: .calculus
            ),
            Formula(
                id: "calc_product_rule",
                name: "Product Rule",
                latex: "\\frac{d}{dx}[f(x)g(x)] = f'(x)g(x) + f(x)g'(x)",
                description: "Derivative of product of functions",
                example: "d/dx[x²sin(x)] = 2x·sin(x) + x²·cos(x)",
                whenToUse: "When differentiating multiplied functions",
                tags: ["derivative", "product", "rules"],
                topic: .calculus
            ),
            Formula(
                id: "calc_chain_rule",
                name: "Chain Rule",
                latex: "\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)",
                description: "Derivative of composite functions",
                example: "d/dx[sin(x²)] = cos(x²)·2x",
                whenToUse: "When differentiating nested functions",
                tags: ["derivative", "chain", "composite"],
                topic: .calculus
            ),
            Formula(
                id: "calc_quotient_rule",
                name: "Quotient Rule",
                latex: "\\frac{d}{dx}\\left[\\frac{f(x)}{g(x)}\\right] = \\frac{f'(x)g(x) - f(x)g'(x)}{[g(x)]^2}",
                description: "Derivative of quotient of functions",
                example: "d/dx[x/sin(x)] = [sin(x) - x·cos(x)]/sin²(x)",
                whenToUse: "When differentiating division of functions",
                tags: ["derivative", "quotient", "division"],
                topic: .calculus
            ),
            Formula(
                id: "calc_fundamental_theorem",
                name: "Fundamental Theorem of Calculus",
                latex: "\\int_a^b f(x)dx = F(b) - F(a)",
                description: "Relates integration to antiderivatives",
                example: "∫₀³ x²dx = [x³/3]₀³ = 9 - 0 = 9",
                whenToUse: "Evaluating definite integrals",
                tags: ["integral", "fundamental", "antiderivative"],
                topic: .calculus
            )
        ]
    }

    // MARK: - Statistics Formulas

    private var statisticsFormulas: [Formula] {
        [
            Formula(
                id: "stat_mean",
                name: "Mean (Average)",
                latex: "\\bar{x} = \\frac{\\sum x_i}{n}",
                description: "Average value of a dataset",
                example: "For [2, 4, 6, 8]: mean = (2+4+6+8)/4 = 5",
                whenToUse: "Finding the central tendency of data",
                tags: ["mean", "average", "central tendency"],
                topic: .statistics
            ),
            Formula(
                id: "stat_variance",
                name: "Variance",
                latex: "\\sigma^2 = \\frac{\\sum (x_i - \\bar{x})^2}{n}",
                description: "Measure of data spread",
                example: "For [1, 3, 5]: variance = [(1-3)² + (3-3)² + (5-3)²]/3 = 8/3",
                whenToUse: "Quantifying variation in data",
                tags: ["variance", "spread", "variation"],
                topic: .statistics
            ),
            Formula(
                id: "stat_std_dev",
                name: "Standard Deviation",
                latex: "\\sigma = \\sqrt{\\frac{\\sum (x_i - \\bar{x})^2}{n}}",
                description: "Square root of variance",
                example: "If variance = 4, then σ = 2",
                whenToUse: "Measuring spread in same units as data",
                tags: ["standard deviation", "spread"],
                topic: .statistics
            ),
            Formula(
                id: "stat_z_score",
                name: "Z-Score",
                latex: "z = \\frac{x - \\mu}{\\sigma}",
                description: "Number of standard deviations from mean",
                example: "Value 85, mean 80, σ=5: z = (85-80)/5 = 1",
                whenToUse: "Standardizing values for comparison",
                tags: ["z-score", "standardization", "normal"],
                topic: .statistics
            )
        ]
    }

    // MARK: - Probability Formulas

    private var probabilityFormulas: [Formula] {
        [
            Formula(
                id: "prob_basic",
                name: "Basic Probability",
                latex: "P(A) = \\frac{\\text{favorable outcomes}}{\\text{total outcomes}}",
                description: "Probability of an event occurring",
                example: "Rolling a 6 on die: P = 1/6 ≈ 0.167",
                whenToUse: "Calculating simple event probabilities",
                tags: ["probability", "basic", "events"],
                topic: .probability
            ),
            Formula(
                id: "prob_conditional",
                name: "Conditional Probability",
                latex: "P(A|B) = \\frac{P(A \\cap B)}{P(B)}",
                description: "Probability of A given B has occurred",
                example: "P(King|Face card) = (4/52)/(12/52) = 1/3",
                whenToUse: "When one event affects another",
                tags: ["conditional", "dependent"],
                topic: .probability
            ),
            Formula(
                id: "prob_combinations",
                name: "Combinations",
                latex: "C(n,r) = \\frac{n!}{r!(n-r)!}",
                description: "Number of ways to choose r items from n",
                example: "Choose 2 from 5: C(5,2) = 5!/(2!3!) = 10",
                whenToUse: "Counting unordered selections",
                tags: ["combinations", "counting", "choose"],
                topic: .probability
            ),
            Formula(
                id: "prob_permutations",
                name: "Permutations",
                latex: "P(n,r) = \\frac{n!}{(n-r)!}",
                description: "Number of ordered arrangements of r items from n",
                example: "Arrange 2 from 5: P(5,2) = 5!/3! = 20",
                whenToUse: "Counting ordered arrangements",
                tags: ["permutations", "counting", "arrangements"],
                topic: .probability
            )
        ]
    }

    // MARK: - Linear Algebra Formulas

    private var linearAlgebraFormulas: [Formula] {
        [
            Formula(
                id: "linalg_dot_product",
                name: "Dot Product",
                latex: "\\vec{a} \\cdot \\vec{b} = \\sum a_i b_i = |\\vec{a}||\\vec{b}|\\cos\\theta",
                description: "Scalar product of two vectors",
                example: "[2,3]·[4,5] = 2(4) + 3(5) = 23",
                whenToUse: "Finding angle between vectors or projection",
                tags: ["dot product", "vectors", "angle"],
                topic: .linearAlgebra
            ),
            Formula(
                id: "linalg_cross_product",
                name: "Cross Product",
                latex: "\\vec{a} \\times \\vec{b} = |\\vec{a}||\\vec{b}|\\sin\\theta \\hat{n}",
                description: "Vector perpendicular to both input vectors",
                example: "[1,0,0]×[0,1,0] = [0,0,1]",
                whenToUse: "Finding perpendicular vector in 3D",
                tags: ["cross product", "vectors", "perpendicular"],
                topic: .linearAlgebra
            ),
            Formula(
                id: "linalg_determinant_2x2",
                name: "2×2 Determinant",
                latex: "\\det\\begin{bmatrix}a & b\\\\c & d\\end{bmatrix} = ad - bc",
                description: "Determinant of 2×2 matrix",
                example: "det([[2,3],[1,4]]) = 2(4) - 3(1) = 5",
                whenToUse: "Checking matrix invertibility, finding area",
                tags: ["determinant", "matrix", "2x2"],
                topic: .linearAlgebra
            )
        ]
    }

    // MARK: - Discrete Math Formulas

    private var discreteMathFormulas: [Formula] {
        [
            Formula(
                id: "discrete_factorial",
                name: "Factorial",
                latex: "n! = n \\times (n-1) \\times (n-2) \\times \\cdots \\times 1",
                description: "Product of all positive integers up to n",
                example: "5! = 5×4×3×2×1 = 120",
                whenToUse: "Counting permutations, combinations",
                tags: ["factorial", "counting"],
                topic: .discreteMath
            ),
            Formula(
                id: "discrete_sum_n",
                name: "Sum of First n Integers",
                latex: "\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}",
                description: "Sum of integers from 1 to n",
                example: "1+2+3+...+100 = 100(101)/2 = 5050",
                whenToUse: "Quickly summing sequential integers",
                tags: ["sum", "series", "arithmetic"],
                topic: .discreteMath
            ),
            Formula(
                id: "discrete_geometric_series",
                name: "Geometric Series",
                latex: "\\sum_{i=0}^{n-1} ar^i = a\\frac{1-r^n}{1-r}",
                description: "Sum of geometric sequence",
                example: "2+4+8+16+32 = 2(1-2⁵)/(1-2) = 62",
                whenToUse: "Summing exponential sequences",
                tags: ["geometric", "series", "exponential"],
                topic: .discreteMath
            )
        ]
    }
}

// MARK: - Supporting Types

struct Formula: Identifiable, Codable {
    let id: String
    let name: String
    let latex: String
    let description: String
    let example: String
    let whenToUse: String
    let tags: [String]
    let topic: MathTopic
}
