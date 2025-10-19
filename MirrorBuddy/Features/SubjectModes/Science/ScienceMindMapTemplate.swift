import Foundation

/// Specialized mind map templates for science and physics study
enum ScienceMindMapTemplate {
    // MARK: - Template Types

    enum TemplateType: String, CaseIterable {
        case physicsFormula = "Physics Formula"
        case experimentDesign = "Experiment Design"
        case scientificMethod = "Scientific Method"
        case systemAnalysis = "System Analysis"
        case chemicalReaction = "Chemical Reaction"
        case energyFlow = "Energy Flow"
        case forceAnalysis = "Force Analysis"
        case circuit = "Circuit Analysis"

        var description: String {
            switch self {
            case .physicsFormula:
                return "Break down a physics formula and its applications"
            case .experimentDesign:
                return "Plan and organize an experiment"
            case .scientificMethod:
                return "Apply the scientific method to a problem"
            case .systemAnalysis:
                return "Analyze a physical system"
            case .chemicalReaction:
                return "Map a chemical reaction and its conditions"
            case .energyFlow:
                return "Trace energy transformations"
            case .forceAnalysis:
                return "Analyze forces in a system"
            case .circuit:
                return "Analyze an electrical circuit"
            }
        }
    }

    // MARK: - Template Generation

    static func generateTemplate(type: TemplateType, centralTopic: String) -> MindMapTemplate {
        switch type {
        case .physicsFormula:
            return physicsFormulaTemplate(formula: centralTopic)
        case .experimentDesign:
            return experimentDesignTemplate(experiment: centralTopic)
        case .scientificMethod:
            return scientificMethodTemplate(problem: centralTopic)
        case .systemAnalysis:
            return systemAnalysisTemplate(system: centralTopic)
        case .chemicalReaction:
            return chemicalReactionTemplate(reaction: centralTopic)
        case .energyFlow:
            return energyFlowTemplate(process: centralTopic)
        case .forceAnalysis:
            return forceAnalysisTemplate(scenario: centralTopic)
        case .circuit:
            return circuitAnalysisTemplate(circuit: centralTopic)
        }
    }

    // MARK: - Template Definitions

    private static func physicsFormulaTemplate(formula: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .physicsFormula,
            centralNode: MindMapNode(
                title: formula,
                content: "Physics Formula"
            ),
            branches: [
                MindMapBranch(
                    title: "Variables",
                    color: "#3498db",
                    nodes: [
                        MindMapNode(title: "Variable 1", content: "Name, symbol, unit"),
                        MindMapNode(title: "Variable 2", content: "Name, symbol, unit"),
                        MindMapNode(title: "Constants", content: "Any constants involved")
                    ]
                ),
                MindMapBranch(
                    title: "Derivation",
                    color: "#9b59b6",
                    nodes: [
                        MindMapNode(title: "Starting Principle", content: "Fundamental law or principle"),
                        MindMapNode(title: "Steps", content: "Derivation steps"),
                        MindMapNode(title: "Assumptions", content: "Conditions or assumptions")
                    ]
                ),
                MindMapBranch(
                    title: "Applications",
                    color: "#27ae60",
                    nodes: [
                        MindMapNode(title: "Real World Use 1", content: "Practical application"),
                        MindMapNode(title: "Real World Use 2", content: "Practical application"),
                        MindMapNode(title: "Common Problems", content: "Typical problem types")
                    ]
                ),
                MindMapBranch(
                    title: "Related Concepts",
                    color: "#e74c3c",
                    nodes: [
                        MindMapNode(title: "Related Formula 1", content: "Connection"),
                        MindMapNode(title: "Related Formula 2", content: "Connection"),
                        MindMapNode(title: "Physical Principles", content: "Underlying physics")
                    ]
                )
            ]
        )
    }

    private static func experimentDesignTemplate(experiment: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .experimentDesign,
            centralNode: MindMapNode(
                title: experiment,
                content: "Experiment Design"
            ),
            branches: [
                MindMapBranch(
                    title: "Question & Hypothesis",
                    color: "#e74c3c",
                    nodes: [
                        MindMapNode(title: "Research Question", content: "What are we investigating?"),
                        MindMapNode(title: "Hypothesis", content: "Predicted outcome"),
                        MindMapNode(title: "Variables", content: "Independent, dependent, controlled")
                    ]
                ),
                MindMapBranch(
                    title: "Materials & Setup",
                    color: "#3498db",
                    nodes: [
                        MindMapNode(title: "Equipment List", content: "All materials needed"),
                        MindMapNode(title: "Setup Diagram", content: "How to arrange"),
                        MindMapNode(title: "Safety Measures", content: "Precautions needed")
                    ]
                ),
                MindMapBranch(
                    title: "Procedure",
                    color: "#f39c12",
                    nodes: [
                        MindMapNode(title: "Step-by-Step", content: "Detailed instructions"),
                        MindMapNode(title: "Measurements", content: "What to measure and how"),
                        MindMapNode(title: "Data Collection", content: "How to record data")
                    ]
                ),
                MindMapBranch(
                    title: "Analysis & Conclusion",
                    color: "#27ae60",
                    nodes: [
                        MindMapNode(title: "Calculations", content: "Formulas to use"),
                        MindMapNode(title: "Graphs", content: "How to visualize data"),
                        MindMapNode(title: "Conclusion", content: "Interpret results")
                    ]
                )
            ]
        )
    }

    private static func scientificMethodTemplate(problem: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .scientificMethod,
            centralNode: MindMapNode(
                title: problem,
                content: "Scientific Investigation"
            ),
            branches: [
                MindMapBranch(
                    title: "Observe",
                    color: "#3498db",
                    nodes: [
                        MindMapNode(title: "Phenomenon", content: "What did you notice?"),
                        MindMapNode(title: "Background Research", content: "What's known?"),
                        MindMapNode(title: "Question", content: "What do you want to find out?")
                    ]
                ),
                MindMapBranch(
                    title: "Hypothesize",
                    color: "#9b59b6",
                    nodes: [
                        MindMapNode(title: "Prediction", content: "What will happen?"),
                        MindMapNode(title: "Reasoning", content: "Why do you think so?"),
                        MindMapNode(title: "Testable Statement", content: "If... then... because...")
                    ]
                ),
                MindMapBranch(
                    title: "Experiment",
                    color: "#f39c12",
                    nodes: [
                        MindMapNode(title: "Design", content: "Plan your test"),
                        MindMapNode(title: "Variables", content: "What changes, what stays same"),
                        MindMapNode(title: "Execute", content: "Carry out the experiment")
                    ]
                ),
                MindMapBranch(
                    title: "Analyze",
                    color: "#27ae60",
                    nodes: [
                        MindMapNode(title: "Data", content: "Organize and examine results"),
                        MindMapNode(title: "Patterns", content: "What trends do you see?"),
                        MindMapNode(title: "Errors", content: "What affected accuracy?")
                    ]
                ),
                MindMapBranch(
                    title: "Conclude",
                    color: "#e74c3c",
                    nodes: [
                        MindMapNode(title: "Findings", content: "What did you discover?"),
                        MindMapNode(title: "Hypothesis", content: "Supported or not?"),
                        MindMapNode(title: "Next Steps", content: "Further questions?")
                    ]
                )
            ]
        )
    }

    private static func systemAnalysisTemplate(system: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .systemAnalysis,
            centralNode: MindMapNode(
                title: system,
                content: "Physical System"
            ),
            branches: [
                MindMapBranch(
                    title: "Components",
                    color: "#3498db",
                    nodes: [
                        MindMapNode(title: "Part 1", content: "Function and properties"),
                        MindMapNode(title: "Part 2", content: "Function and properties"),
                        MindMapNode(title: "Interactions", content: "How parts connect")
                    ]
                ),
                MindMapBranch(
                    title: "Energy",
                    color: "#f39c12",
                    nodes: [
                        MindMapNode(title: "Input", content: "Energy coming in"),
                        MindMapNode(title: "Transformations", content: "Energy conversions"),
                        MindMapNode(title: "Output", content: "Energy leaving")
                    ]
                ),
                MindMapBranch(
                    title: "Forces",
                    color: "#e74c3c",
                    nodes: [
                        MindMapNode(title: "Acting Forces", content: "What forces are present"),
                        MindMapNode(title: "Balance", content: "Equilibrium or motion"),
                        MindMapNode(title: "Effects", content: "What forces cause")
                    ]
                ),
                MindMapBranch(
                    title: "Behavior",
                    color: "#27ae60",
                    nodes: [
                        MindMapNode(title: "Normal Operation", content: "How it works"),
                        MindMapNode(title: "Variations", content: "What changes behavior"),
                        MindMapNode(title: "Limitations", content: "Constraints or limits")
                    ]
                )
            ]
        )
    }

    private static func chemicalReactionTemplate(reaction: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .chemicalReaction,
            centralNode: MindMapNode(
                title: reaction,
                content: "Chemical Reaction"
            ),
            branches: [
                MindMapBranch(
                    title: "Reactants",
                    color: "#3498db",
                    nodes: [
                        MindMapNode(title: "Compound 1", content: "Formula and properties"),
                        MindMapNode(title: "Compound 2", content: "Formula and properties"),
                        MindMapNode(title: "States", content: "Solid, liquid, gas, aqueous")
                    ]
                ),
                MindMapBranch(
                    title: "Products",
                    color: "#27ae60",
                    nodes: [
                        MindMapNode(title: "Compound 1", content: "Formula and properties"),
                        MindMapNode(title: "Compound 2", content: "Formula and properties"),
                        MindMapNode(title: "Yield", content: "Expected amount")
                    ]
                ),
                MindMapBranch(
                    title: "Conditions",
                    color: "#f39c12",
                    nodes: [
                        MindMapNode(title: "Temperature", content: "Heat or cold needed"),
                        MindMapNode(title: "Pressure", content: "Pressure effects"),
                        MindMapNode(title: "Catalyst", content: "Substances to speed it up")
                    ]
                ),
                MindMapBranch(
                    title: "Energy",
                    color: "#e74c3c",
                    nodes: [
                        MindMapNode(title: "Type", content: "Endothermic or exothermic"),
                        MindMapNode(title: "Amount", content: "Energy change"),
                        MindMapNode(title: "Observations", content: "Temperature, color, gas")
                    ]
                )
            ]
        )
    }

    private static func energyFlowTemplate(process: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .energyFlow,
            centralNode: MindMapNode(
                title: process,
                content: "Energy Flow"
            ),
            branches: [
                MindMapBranch(
                    title: "Initial Energy",
                    color: "#f39c12",
                    nodes: [
                        MindMapNode(title: "Source", content: "Where energy comes from"),
                        MindMapNode(title: "Type", content: "Form of energy"),
                        MindMapNode(title: "Amount", content: "Quantity of energy")
                    ]
                ),
                MindMapBranch(
                    title: "Transformations",
                    color: "#9b59b6",
                    nodes: [
                        MindMapNode(title: "Step 1", content: "First conversion"),
                        MindMapNode(title: "Step 2", content: "Second conversion"),
                        MindMapNode(title: "Efficiency", content: "Energy losses")
                    ]
                ),
                MindMapBranch(
                    title: "Final Energy",
                    color: "#27ae60",
                    nodes: [
                        MindMapNode(title: "Useful Output", content: "Desired energy form"),
                        MindMapNode(title: "Waste", content: "Lost energy"),
                        MindMapNode(title: "Applications", content: "What it's used for")
                    ]
                ),
                MindMapBranch(
                    title: "Conservation",
                    color: "#3498db",
                    nodes: [
                        MindMapNode(title: "Total Energy", content: "Energy conserved"),
                        MindMapNode(title: "Accounting", content: "Track all forms"),
                        MindMapNode(title: "Verification", content: "Check conservation")
                    ]
                )
            ]
        )
    }

    private static func forceAnalysisTemplate(scenario: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .forceAnalysis,
            centralNode: MindMapNode(
                title: scenario,
                content: "Force Analysis"
            ),
            branches: [
                MindMapBranch(
                    title: "Identify Forces",
                    color: "#e74c3c",
                    nodes: [
                        MindMapNode(title: "Gravity", content: "Weight force"),
                        MindMapNode(title: "Normal Force", content: "Surface contact"),
                        MindMapNode(title: "Friction", content: "Resistance to motion"),
                        MindMapNode(title: "Applied Forces", content: "External forces")
                    ]
                ),
                MindMapBranch(
                    title: "Free Body Diagram",
                    color: "#3498db",
                    nodes: [
                        MindMapNode(title: "Object", content: "Draw as point"),
                        MindMapNode(title: "Force Arrows", content: "Show direction and magnitude"),
                        MindMapNode(title: "Coordinate System", content: "Choose axes")
                    ]
                ),
                MindMapBranch(
                    title: "Calculate",
                    color: "#f39c12",
                    nodes: [
                        MindMapNode(title: "Net Force", content: "Sum all forces"),
                        MindMapNode(title: "Components", content: "Break into x and y"),
                        MindMapNode(title: "Acceleration", content: "Use F = ma")
                    ]
                ),
                MindMapBranch(
                    title: "Motion",
                    color: "#27ae60",
                    nodes: [
                        MindMapNode(title: "Equilibrium?", content: "Balanced or unbalanced"),
                        MindMapNode(title: "Direction", content: "Which way it moves"),
                        MindMapNode(title: "Speed Change", content: "Speeding up or slowing down")
                    ]
                )
            ]
        )
    }

    private static func circuitAnalysisTemplate(circuit: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .circuit,
            centralNode: MindMapNode(
                title: circuit,
                content: "Circuit Analysis"
            ),
            branches: [
                MindMapBranch(
                    title: "Components",
                    color: "#3498db",
                    nodes: [
                        MindMapNode(title: "Power Source", content: "Battery or supply"),
                        MindMapNode(title: "Resistors", content: "Values and arrangement"),
                        MindMapNode(title: "Other Elements", content: "Capacitors, LEDs, etc.")
                    ]
                ),
                MindMapBranch(
                    title: "Current",
                    color: "#f39c12",
                    nodes: [
                        MindMapNode(title: "Path", content: "Direction of flow"),
                        MindMapNode(title: "Series", content: "Same current everywhere"),
                        MindMapNode(title: "Parallel", content: "Current divides")
                    ]
                ),
                MindMapBranch(
                    title: "Voltage",
                    color: "#e74c3c",
                    nodes: [
                        MindMapNode(title: "Source", content: "Total voltage"),
                        MindMapNode(title: "Drops", content: "Voltage across components"),
                        MindMapNode(title: "Kirchhoff's Law", content: "Voltage sums to zero")
                    ]
                ),
                MindMapBranch(
                    title: "Calculations",
                    color: "#27ae60",
                    nodes: [
                        MindMapNode(title: "Ohm's Law", content: "V = IR"),
                        MindMapNode(title: "Total Resistance", content: "Series or parallel"),
                        MindMapNode(title: "Power", content: "P = VI")
                    ]
                )
            ]
        )
    }
}
