import Foundation

/// Mind map templates specialized for mathematical concepts
final class MathMathMindMapTemplate {
    // MARK: - Template Generation

    /// Generate a mind map template for a specific math topic
    func generateTemplate(for topic: MathTopic, concept: String? = nil) -> MathMindMapTemplate {
        switch topic {
        case .algebra:
            return generateAlgebraTemplate(concept: concept)
        case .geometry:
            return generateGeometryTemplate(concept: concept)
        case .trigonometry:
            return generateTrigonometryTemplate(concept: concept)
        case .calculus:
            return generateCalculusTemplate(concept: concept)
        case .statistics:
            return generateStatisticsTemplate(concept: concept)
        case .probability:
            return generateProbabilityTemplate(concept: concept)
        case .linearAlgebra:
            return generateLinearAlgebraTemplate(concept: concept)
        case .discreteMath:
            return generateDiscreteMathTemplate(concept: concept)
        }
    }

    // MARK: - Topic-Specific Templates

    private func generateAlgebraTemplate(concept: String?) -> MathMindMapTemplate {
        let centralNode = MathMindMapNode(
            id: "central",
            title: concept ?? "Algebra",
            type: .central,
            color: "#4A90E2",
            position: .zero
        )

        let branches: [MathMindMapNode] = [
            MathMindMapNode(
                id: "equations",
                title: "Equations",
                type: .mainBranch,
                color: "#E24A4A",
                position: .zero,
                children: [
                    MathMindMapNode(id: "linear", title: "Linear: ax + b = c", type: .subBranch, color: "#E24A4A", position: .zero),
                    MathMindMapNode(id: "quadratic", title: "Quadratic: ax² + bx + c = 0", type: .subBranch, color: "#E24A4A", position: .zero),
                    MathMindMapNode(id: "systems", title: "Systems of equations", type: .subBranch, color: "#E24A4A", position: .zero)
                ]
            ),
            MathMindMapNode(
                id: "functions",
                title: "Functions",
                type: .mainBranch,
                color: "#4AE271",
                position: .zero,
                children: [
                    MathMindMapNode(id: "linear_func", title: "Linear: f(x) = mx + b", type: .subBranch, color: "#4AE271", position: .zero),
                    MathMindMapNode(id: "quadratic_func", title: "Quadratic: f(x) = ax² + bx + c", type: .subBranch, color: "#4AE271", position: .zero),
                    MathMindMapNode(id: "exponential", title: "Exponential: f(x) = aˣ", type: .subBranch, color: "#4AE271", position: .zero)
                ]
            ),
            MathMindMapNode(
                id: "polynomials",
                title: "Polynomials",
                type: .mainBranch,
                color: "#E2B84A",
                position: .zero,
                children: [
                    MathMindMapNode(id: "factoring", title: "Factoring techniques", type: .subBranch, color: "#E2B84A", position: .zero),
                    MathMindMapNode(id: "operations", title: "Add, subtract, multiply, divide", type: .subBranch, color: "#E2B84A", position: .zero),
                    MathMindMapNode(id: "roots", title: "Finding roots/zeros", type: .subBranch, color: "#E2B84A", position: .zero)
                ]
            ),
            MathMindMapNode(
                id: "graphing",
                title: "Graphing",
                type: .mainBranch,
                color: "#9B4AE2",
                position: .zero,
                children: [
                    MathMindMapNode(id: "slope", title: "Slope and intercepts", type: .subBranch, color: "#9B4AE2", position: .zero),
                    MathMindMapNode(id: "parabolas", title: "Parabolas and vertex", type: .subBranch, color: "#9B4AE2", position: .zero),
                    MathMindMapNode(id: "transformations", title: "Transformations", type: .subBranch, color: "#9B4AE2", position: .zero)
                ]
            )
        ]

        return MathMindMapTemplate(
            topic: .algebra,
            centralNode: centralNode,
            branches: branches,
            connections: [
                Connection(from: "equations", to: "functions", label: "can be represented as"),
                Connection(from: "polynomials", to: "graphing", label: "visualized by")
            ],
            studyNotes: [
                "Focus on understanding WHY operations work, not just HOW",
                "Always check your solutions by substituting back",
                "Graph functions to visualize the relationships"
            ]
        )
    }

    private func generateGeometryTemplate(concept: String?) -> MathMindMapTemplate {
        let centralNode = MathMindMapNode(
            id: "central",
            title: concept ?? "Geometry",
            type: .central,
            color: "#4A90E2",
            position: .zero
        )

        let branches: [MathMindMapNode] = [
            MathMindMapNode(
                id: "shapes_2d",
                title: "2D Shapes",
                type: .mainBranch,
                color: "#E24A4A",
                position: .zero,
                children: [
                    MathMindMapNode(id: "triangles", title: "Triangles: A = ½bh", type: .subBranch, color: "#E24A4A", position: .zero),
                    MathMindMapNode(id: "circles", title: "Circles: A = πr²", type: .subBranch, color: "#E24A4A", position: .zero),
                    MathMindMapNode(id: "rectangles", title: "Rectangles: A = lw", type: .subBranch, color: "#E24A4A", position: .zero)
                ]
            ),
            MathMindMapNode(
                id: "shapes_3d",
                title: "3D Shapes",
                type: .mainBranch,
                color: "#4AE271",
                position: .zero,
                children: [
                    MathMindMapNode(id: "spheres", title: "Spheres: V = 4/3πr³", type: .subBranch, color: "#4AE271", position: .zero),
                    MathMindMapNode(id: "cylinders", title: "Cylinders: V = πr²h", type: .subBranch, color: "#4AE271", position: .zero),
                    MathMindMapNode(id: "cubes", title: "Cubes: V = s³", type: .subBranch, color: "#4AE271", position: .zero)
                ]
            ),
            MathMindMapNode(
                id: "theorems",
                title: "Key Theorems",
                type: .mainBranch,
                color: "#E2B84A",
                position: .zero,
                children: [
                    MathMindMapNode(id: "pythagorean", title: "Pythagorean: a² + b² = c²", type: .subBranch, color: "#E2B84A", position: .zero),
                    MathMindMapNode(id: "similar", title: "Similar triangles", type: .subBranch, color: "#E2B84A", position: .zero),
                    MathMindMapNode(id: "parallel", title: "Parallel lines & angles", type: .subBranch, color: "#E2B84A", position: .zero)
                ]
            ),
            MathMindMapNode(
                id: "measurements",
                title: "Measurements",
                type: .mainBranch,
                color: "#9B4AE2",
                position: .zero,
                children: [
                    MathMindMapNode(id: "perimeter", title: "Perimeter/Circumference", type: .subBranch, color: "#9B4AE2", position: .zero),
                    MathMindMapNode(id: "area", title: "Area", type: .subBranch, color: "#9B4AE2", position: .zero),
                    MathMindMapNode(id: "volume", title: "Volume", type: .subBranch, color: "#9B4AE2", position: .zero)
                ]
            )
        ]

        return MathMindMapTemplate(
            topic: .geometry,
            centralNode: centralNode,
            branches: branches,
            connections: [
                Connection(from: "shapes_2d", to: "measurements", label: "have"),
                Connection(from: "shapes_3d", to: "measurements", label: "have"),
                Connection(from: "theorems", to: "shapes_2d", label: "apply to")
            ],
            studyNotes: [
                "Draw diagrams for every problem",
                "Label all known measurements",
                "Look for right triangles to use Pythagorean theorem"
            ]
        )
    }

    private func generateTrigonometryTemplate(concept: String?) -> MathMindMapTemplate {
        let centralNode = MathMindMapNode(
            id: "central",
            title: concept ?? "Trigonometry",
            type: .central,
            color: "#4A90E2",
            position: .zero
        )

        let branches: [MathMindMapNode] = [
            MathMindMapNode(
                id: "ratios",
                title: "Trig Ratios",
                type: .mainBranch,
                color: "#E24A4A",
                position: .zero,
                children: [
                    MathMindMapNode(id: "sine", title: "sin θ = opposite/hypotenuse", type: .subBranch, color: "#E24A4A", position: .zero),
                    MathMindMapNode(id: "cosine", title: "cos θ = adjacent/hypotenuse", type: .subBranch, color: "#E24A4A", position: .zero),
                    MathMindMapNode(id: "tangent", title: "tan θ = opposite/adjacent", type: .subBranch, color: "#E24A4A", position: .zero)
                ]
            ),
            MathMindMapNode(
                id: "unit_circle",
                title: "Unit Circle",
                type: .mainBranch,
                color: "#4AE271",
                position: .zero,
                children: [
                    MathMindMapNode(id: "special_angles", title: "Special angles: 30°, 45°, 60°", type: .subBranch, color: "#4AE271", position: .zero),
                    MathMindMapNode(id: "quadrants", title: "Four quadrants & signs", type: .subBranch, color: "#4AE271", position: .zero),
                    MathMindMapNode(id: "radians", title: "Radians vs degrees", type: .subBranch, color: "#4AE271", position: .zero)
                ]
            ),
            MathMindMapNode(
                id: "identities",
                title: "Identities",
                type: .mainBranch,
                color: "#E2B84A",
                position: .zero,
                children: [
                    MathMindMapNode(id: "pythagorean_id", title: "sin²θ + cos²θ = 1", type: .subBranch, color: "#E2B84A", position: .zero),
                    MathMindMapNode(id: "double_angle", title: "Double angle formulas", type: .subBranch, color: "#E2B84A", position: .zero),
                    MathMindMapNode(id: "sum_difference", title: "Sum/difference formulas", type: .subBranch, color: "#E2B84A", position: .zero)
                ]
            ),
            MathMindMapNode(
                id: "applications",
                title: "Applications",
                type: .mainBranch,
                color: "#9B4AE2",
                position: .zero,
                children: [
                    MathMindMapNode(id: "law_sines", title: "Law of Sines", type: .subBranch, color: "#9B4AE2", position: .zero),
                    MathMindMapNode(id: "law_cosines", title: "Law of Cosines", type: .subBranch, color: "#9B4AE2", position: .zero),
                    MathMindMapNode(id: "solving_triangles", title: "Solving triangles", type: .subBranch, color: "#9B4AE2", position: .zero)
                ]
            )
        ]

        return MathMindMapTemplate(
            topic: .trigonometry,
            centralNode: centralNode,
            branches: branches,
            connections: [
                Connection(from: "ratios", to: "unit_circle", label: "generalized by"),
                Connection(from: "identities", to: "ratios", label: "derived from"),
                Connection(from: "applications", to: "ratios", label: "use")
            ],
            studyNotes: [
                "Memorize the unit circle for common angles",
                "SOH-CAH-TOA for basic ratios",
                "Draw triangles and label sides carefully"
            ]
        )
    }

    private func generateCalculusTemplate(concept: String?) -> MathMindMapTemplate {
        let centralNode = MathMindMapNode(
            id: "central",
            title: concept ?? "Calculus",
            type: .central,
            color: "#4A90E2",
            position: .zero
        )

        let branches: [MathMindMapNode] = [
            MathMindMapNode(
                id: "limits",
                title: "Limits",
                type: .mainBranch,
                color: "#E24A4A",
                position: .zero,
                children: [
                    MathMindMapNode(id: "limit_def", title: "Definition of limit", type: .subBranch, color: "#E24A4A", position: .zero),
                    MathMindMapNode(id: "continuity", title: "Continuity", type: .subBranch, color: "#E24A4A", position: .zero),
                    MathMindMapNode(id: "infinity", title: "Limits at infinity", type: .subBranch, color: "#E24A4A", position: .zero)
                ]
            ),
            MathMindMapNode(
                id: "derivatives",
                title: "Derivatives",
                type: .mainBranch,
                color: "#4AE271",
                position: .zero,
                children: [
                    MathMindMapNode(id: "power_rule", title: "Power rule: d/dx[xⁿ] = nxⁿ⁻¹", type: .subBranch, color: "#4AE271", position: .zero),
                    MathMindMapNode(id: "product_rule", title: "Product rule", type: .subBranch, color: "#4AE271", position: .zero),
                    MathMindMapNode(id: "chain_rule", title: "Chain rule", type: .subBranch, color: "#4AE271", position: .zero)
                ]
            ),
            MathMindMapNode(
                id: "integrals",
                title: "Integrals",
                type: .mainBranch,
                color: "#E2B84A",
                position: .zero,
                children: [
                    MathMindMapNode(id: "antiderivatives", title: "Antiderivatives", type: .subBranch, color: "#E2B84A", position: .zero),
                    MathMindMapNode(id: "definite", title: "Definite integrals", type: .subBranch, color: "#E2B84A", position: .zero),
                    MathMindMapNode(id: "ftc", title: "Fundamental Theorem", type: .subBranch, color: "#E2B84A", position: .zero)
                ]
            ),
            MathMindMapNode(
                id: "applications",
                title: "Applications",
                type: .mainBranch,
                color: "#9B4AE2",
                position: .zero,
                children: [
                    MathMindMapNode(id: "optimization", title: "Optimization problems", type: .subBranch, color: "#9B4AE2", position: .zero),
                    MathMindMapNode(id: "related_rates", title: "Related rates", type: .subBranch, color: "#9B4AE2", position: .zero),
                    MathMindMapNode(id: "area_volume", title: "Area & volume", type: .subBranch, color: "#9B4AE2", position: .zero)
                ]
            )
        ]

        return MathMindMapTemplate(
            topic: .calculus,
            centralNode: centralNode,
            branches: branches,
            connections: [
                Connection(from: "limits", to: "derivatives", label: "foundation for"),
                Connection(from: "derivatives", to: "integrals", label: "inverse of"),
                Connection(from: "applications", to: "derivatives", label: "uses"),
                Connection(from: "applications", to: "integrals", label: "uses")
            ],
            studyNotes: [
                "Understand concepts before memorizing formulas",
                "Derivatives measure rate of change",
                "Integrals measure accumulation"
            ]
        )
    }

    private func generateStatisticsTemplate(concept: String?) -> MathMindMapTemplate {
        let centralNode = MathMindMapNode(
            id: "central",
            title: concept ?? "Statistics",
            type: .central,
            color: "#4A90E2",
            position: .zero
        )

        let branches: [MathMindMapNode] = [
            MathMindMapNode(
                id: "descriptive",
                title: "Descriptive Stats",
                type: .mainBranch,
                color: "#E24A4A",
                position: .zero,
                children: [
                    MathMindMapNode(id: "mean", title: "Mean (average)", type: .subBranch, color: "#E24A4A", position: .zero),
                    MathMindMapNode(id: "median", title: "Median (middle value)", type: .subBranch, color: "#E24A4A", position: .zero),
                    MathMindMapNode(id: "mode", title: "Mode (most frequent)", type: .subBranch, color: "#E24A4A", position: .zero)
                ]
            ),
            MathMindMapNode(
                id: "spread",
                title: "Measures of Spread",
                type: .mainBranch,
                color: "#4AE271",
                position: .zero,
                children: [
                    MathMindMapNode(id: "range", title: "Range", type: .subBranch, color: "#4AE271", position: .zero),
                    MathMindMapNode(id: "variance", title: "Variance", type: .subBranch, color: "#4AE271", position: .zero),
                    MathMindMapNode(id: "std_dev", title: "Standard Deviation", type: .subBranch, color: "#4AE271", position: .zero)
                ]
            ),
            MathMindMapNode(
                id: "visualization",
                title: "Data Visualization",
                type: .mainBranch,
                color: "#E2B84A",
                position: .zero,
                children: [
                    MathMindMapNode(id: "histograms", title: "Histograms", type: .subBranch, color: "#E2B84A", position: .zero),
                    MathMindMapNode(id: "boxplots", title: "Box plots", type: .subBranch, color: "#E2B84A", position: .zero),
                    MathMindMapNode(id: "scatter", title: "Scatter plots", type: .subBranch, color: "#E2B84A", position: .zero)
                ]
            ),
            MathMindMapNode(
                id: "inference",
                title: "Statistical Inference",
                type: .mainBranch,
                color: "#9B4AE2",
                position: .zero,
                children: [
                    MathMindMapNode(id: "hypothesis", title: "Hypothesis testing", type: .subBranch, color: "#9B4AE2", position: .zero),
                    MathMindMapNode(id: "confidence", title: "Confidence intervals", type: .subBranch, color: "#9B4AE2", position: .zero),
                    MathMindMapNode(id: "regression", title: "Regression analysis", type: .subBranch, color: "#9B4AE2", position: .zero)
                ]
            )
        ]

        return MathMindMapTemplate(
            topic: .statistics,
            centralNode: centralNode,
            branches: branches,
            connections: [
                Connection(from: "descriptive", to: "visualization", label: "summarized by"),
                Connection(from: "spread", to: "descriptive", label: "complements")
            ],
            studyNotes: [
                "Always visualize data first",
                "Check for outliers",
                "Understand the difference between correlation and causation"
            ]
        )
    }

    private func generateProbabilityTemplate(concept: String?) -> MathMindMapTemplate {
        let centralNode = MathMindMapNode(
            id: "central",
            title: concept ?? "Probability",
            type: .central,
            color: "#4A90E2",
            position: .zero
        )

        let branches: [MathMindMapNode] = [
            MathMindMapNode(
                id: "basic",
                title: "Basic Probability",
                type: .mainBranch,
                color: "#E24A4A",
                position: .zero,
                children: [
                    MathMindMapNode(id: "definition", title: "P(A) = favorable/total", type: .subBranch, color: "#E24A4A", position: .zero),
                    MathMindMapNode(id: "complement", title: "P(not A) = 1 - P(A)", type: .subBranch, color: "#E24A4A", position: .zero),
                    MathMindMapNode(id: "range", title: "0 ≤ P(A) ≤ 1", type: .subBranch, color: "#E24A4A", position: .zero)
                ]
            ),
            MathMindMapNode(
                id: "counting",
                title: "Counting Principles",
                type: .mainBranch,
                color: "#4AE271",
                position: .zero,
                children: [
                    MathMindMapNode(id: "permutations", title: "Permutations: P(n,r)", type: .subBranch, color: "#4AE271", position: .zero),
                    MathMindMapNode(id: "combinations", title: "Combinations: C(n,r)", type: .subBranch, color: "#4AE271", position: .zero),
                    MathMindMapNode(id: "factorial", title: "Factorial: n!", type: .subBranch, color: "#4AE271", position: .zero)
                ]
            )
        ]

        return MathMindMapTemplate(
            topic: .probability,
            centralNode: centralNode,
            branches: branches,
            connections: [],
            studyNotes: [
                "List all possible outcomes systematically",
                "Use tree diagrams for complex problems",
                "Check if events are independent or dependent"
            ]
        )
    }

    private func generateLinearAlgebraTemplate(concept: String?) -> MathMindMapTemplate {
        let centralNode = MathMindMapNode(
            id: "central",
            title: concept ?? "Linear Algebra",
            type: .central,
            color: "#4A90E2",
            position: .zero
        )

        let branches: [MathMindMapNode] = [
            MathMindMapNode(
                id: "vectors",
                title: "Vectors",
                type: .mainBranch,
                color: "#E24A4A",
                position: .zero,
                children: [
                    MathMindMapNode(id: "operations", title: "Add, subtract, scalar multiply", type: .subBranch, color: "#E24A4A", position: .zero),
                    MathMindMapNode(id: "dot_product", title: "Dot product", type: .subBranch, color: "#E24A4A", position: .zero),
                    MathMindMapNode(id: "cross_product", title: "Cross product", type: .subBranch, color: "#E24A4A", position: .zero)
                ]
            ),
            MathMindMapNode(
                id: "matrices",
                title: "Matrices",
                type: .mainBranch,
                color: "#4AE271",
                position: .zero,
                children: [
                    MathMindMapNode(id: "matrix_ops", title: "Operations", type: .subBranch, color: "#4AE271", position: .zero),
                    MathMindMapNode(id: "determinant", title: "Determinants", type: .subBranch, color: "#4AE271", position: .zero),
                    MathMindMapNode(id: "inverse", title: "Matrix inverses", type: .subBranch, color: "#4AE271", position: .zero)
                ]
            )
        ]

        return MathMindMapTemplate(
            topic: .linearAlgebra,
            centralNode: centralNode,
            branches: branches,
            connections: [],
            studyNotes: [
                "Visualize vectors as arrows",
                "Practice matrix multiplication systematically"
            ]
        )
    }

    private func generateDiscreteMathTemplate(concept: String?) -> MathMindMapTemplate {
        let centralNode = MathMindMapNode(
            id: "central",
            title: concept ?? "Discrete Math",
            type: .central,
            color: "#4A90E2",
            position: .zero
        )

        let branches: [MathMindMapNode] = [
            MathMindMapNode(
                id: "logic",
                title: "Logic",
                type: .mainBranch,
                color: "#E24A4A",
                position: .zero,
                children: [
                    MathMindMapNode(id: "propositions", title: "Propositions", type: .subBranch, color: "#E24A4A", position: .zero),
                    MathMindMapNode(id: "logical_ops", title: "AND, OR, NOT, IMPLIES", type: .subBranch, color: "#E24A4A", position: .zero),
                    MathMindMapNode(id: "truth_tables", title: "Truth tables", type: .subBranch, color: "#E24A4A", position: .zero)
                ]
            ),
            MathMindMapNode(
                id: "sets",
                title: "Set Theory",
                type: .mainBranch,
                color: "#4AE271",
                position: .zero,
                children: [
                    MathMindMapNode(id: "set_ops", title: "Union, intersection, complement", type: .subBranch, color: "#4AE271", position: .zero),
                    MathMindMapNode(id: "venn", title: "Venn diagrams", type: .subBranch, color: "#4AE271", position: .zero)
                ]
            )
        ]

        return MathMindMapTemplate(
            topic: .discreteMath,
            centralNode: centralNode,
            branches: branches,
            connections: [],
            studyNotes: [
                "Use truth tables to verify logical equivalences",
                "Draw Venn diagrams for set problems"
            ]
        )
    }
}

// MARK: - Supporting Types

struct MathMathMindMapTemplate: Codable {
    let topic: MathTopic
    let centralNode: MathMindMapNode
    let branches: [MathMindMapNode]
    let connections: [Connection]
    let studyNotes: [String]
}

struct MathMindMapNode: Codable, Identifiable {
    let id: String
    let title: String
    let type: NodeType
    let color: String
    let position: CGPoint
    let children: [MathMindMapNode]

    init(
        id: String,
        title: String,
        type: NodeType,
        color: String,
        position: CGPoint,
        children: [MathMindMapNode] = []
    ) {
        self.id = id
        self.title = title
        self.type = type
        self.color = color
        self.position = position
        self.children = children
    }

    enum NodeType: String, Codable {
        case central
        case mainBranch
        case subBranch
    }
}

struct Connection: Codable {
    let from: String
    let to: String
    let label: String?

    init(from: String, to: String, label: String? = nil) {
        self.from = from
        self.to = to
        self.label = label
    }
}

// CGPoint codable conformance
extension CGPoint: Codable {
    public static var zero: CGPoint {
        CGPoint(x: 0, y: 0)
    }
}
