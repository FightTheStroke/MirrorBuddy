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

    static func generateTemplate(type: TemplateType, centralTopic: String) -> ScienceMindMapTemplateData {
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

    private static func physicsFormulaTemplate(formula: String) -> ScienceMindMapTemplateData {
        ScienceMindMapTemplateData(
            type: .physicsFormula,
            centralNode: ScienceMindMapNode(
                title: formula,
                content: "Physics Formula"
            ),
            branches: [
                ScienceMindMapBranch(
                    title: "Variables",
                    color: "#3498db",
                    nodes: [
                        ScienceMindMapNode(title: "Variable 1", content: "Name, symbol, unit"),
                        ScienceMindMapNode(title: "Variable 2", content: "Name, symbol, unit"),
                        ScienceMindMapNode(title: "Constants", content: "Any constants involved")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Derivation",
                    color: "#9b59b6",
                    nodes: [
                        ScienceMindMapNode(title: "Starting Principle", content: "Fundamental law or principle"),
                        ScienceMindMapNode(title: "Steps", content: "Derivation steps"),
                        ScienceMindMapNode(title: "Assumptions", content: "Conditions or assumptions")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Applications",
                    color: "#27ae60",
                    nodes: [
                        ScienceMindMapNode(title: "Real World Use 1", content: "Practical application"),
                        ScienceMindMapNode(title: "Real World Use 2", content: "Practical application"),
                        ScienceMindMapNode(title: "Common Problems", content: "Typical problem types")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Related Concepts",
                    color: "#e74c3c",
                    nodes: [
                        ScienceMindMapNode(title: "Related Formula 1", content: "Connection"),
                        ScienceMindMapNode(title: "Related Formula 2", content: "Connection"),
                        ScienceMindMapNode(title: "Physical Principles", content: "Underlying physics")
                    ]
                )
            ]
        )
    }

    private static func experimentDesignTemplate(experiment: String) -> ScienceMindMapTemplateData {
        ScienceMindMapTemplateData(
            type: .experimentDesign,
            centralNode: ScienceMindMapNode(
                title: experiment,
                content: "Experiment Design"
            ),
            branches: [
                ScienceMindMapBranch(
                    title: "Question & Hypothesis",
                    color: "#e74c3c",
                    nodes: [
                        ScienceMindMapNode(title: "Research Question", content: "What are we investigating?"),
                        ScienceMindMapNode(title: "Hypothesis", content: "Predicted outcome"),
                        ScienceMindMapNode(title: "Variables", content: "Independent, dependent, controlled")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Materials & Setup",
                    color: "#3498db",
                    nodes: [
                        ScienceMindMapNode(title: "Equipment List", content: "All materials needed"),
                        ScienceMindMapNode(title: "Setup Diagram", content: "How to arrange"),
                        ScienceMindMapNode(title: "Safety Measures", content: "Precautions needed")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Procedure",
                    color: "#f39c12",
                    nodes: [
                        ScienceMindMapNode(title: "Step-by-Step", content: "Detailed instructions"),
                        ScienceMindMapNode(title: "Measurements", content: "What to measure and how"),
                        ScienceMindMapNode(title: "Data Collection", content: "How to record data")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Analysis & Conclusion",
                    color: "#27ae60",
                    nodes: [
                        ScienceMindMapNode(title: "Calculations", content: "Formulas to use"),
                        ScienceMindMapNode(title: "Graphs", content: "How to visualize data"),
                        ScienceMindMapNode(title: "Conclusion", content: "Interpret results")
                    ]
                )
            ]
        )
    }

    private static func scientificMethodTemplate(problem: String) -> ScienceMindMapTemplateData {
        ScienceMindMapTemplateData(
            type: .scientificMethod,
            centralNode: ScienceMindMapNode(
                title: problem,
                content: "Scientific Investigation"
            ),
            branches: [
                ScienceMindMapBranch(
                    title: "Observe",
                    color: "#3498db",
                    nodes: [
                        ScienceMindMapNode(title: "Phenomenon", content: "What did you notice?"),
                        ScienceMindMapNode(title: "Background Research", content: "What's known?"),
                        ScienceMindMapNode(title: "Question", content: "What do you want to find out?")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Hypothesize",
                    color: "#9b59b6",
                    nodes: [
                        ScienceMindMapNode(title: "Prediction", content: "What will happen?"),
                        ScienceMindMapNode(title: "Reasoning", content: "Why do you think so?"),
                        ScienceMindMapNode(title: "Testable Statement", content: "If... then... because...")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Experiment",
                    color: "#f39c12",
                    nodes: [
                        ScienceMindMapNode(title: "Design", content: "Plan your test"),
                        ScienceMindMapNode(title: "Variables", content: "What changes, what stays same"),
                        ScienceMindMapNode(title: "Execute", content: "Carry out the experiment")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Analyze",
                    color: "#27ae60",
                    nodes: [
                        ScienceMindMapNode(title: "Data", content: "Organize and examine results"),
                        ScienceMindMapNode(title: "Patterns", content: "What trends do you see?"),
                        ScienceMindMapNode(title: "Errors", content: "What affected accuracy?")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Conclude",
                    color: "#e74c3c",
                    nodes: [
                        ScienceMindMapNode(title: "Findings", content: "What did you discover?"),
                        ScienceMindMapNode(title: "Hypothesis", content: "Supported or not?"),
                        ScienceMindMapNode(title: "Next Steps", content: "Further questions?")
                    ]
                )
            ]
        )
    }

    private static func systemAnalysisTemplate(system: String) -> ScienceMindMapTemplateData {
        ScienceMindMapTemplateData(
            type: .systemAnalysis,
            centralNode: ScienceMindMapNode(
                title: system,
                content: "Physical System"
            ),
            branches: [
                ScienceMindMapBranch(
                    title: "Components",
                    color: "#3498db",
                    nodes: [
                        ScienceMindMapNode(title: "Part 1", content: "Function and properties"),
                        ScienceMindMapNode(title: "Part 2", content: "Function and properties"),
                        ScienceMindMapNode(title: "Interactions", content: "How parts connect")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Energy",
                    color: "#f39c12",
                    nodes: [
                        ScienceMindMapNode(title: "Input", content: "Energy coming in"),
                        ScienceMindMapNode(title: "Transformations", content: "Energy conversions"),
                        ScienceMindMapNode(title: "Output", content: "Energy leaving")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Forces",
                    color: "#e74c3c",
                    nodes: [
                        ScienceMindMapNode(title: "Acting Forces", content: "What forces are present"),
                        ScienceMindMapNode(title: "Balance", content: "Equilibrium or motion"),
                        ScienceMindMapNode(title: "Effects", content: "What forces cause")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Behavior",
                    color: "#27ae60",
                    nodes: [
                        ScienceMindMapNode(title: "Normal Operation", content: "How it works"),
                        ScienceMindMapNode(title: "Variations", content: "What changes behavior"),
                        ScienceMindMapNode(title: "Limitations", content: "Constraints or limits")
                    ]
                )
            ]
        )
    }

    private static func chemicalReactionTemplate(reaction: String) -> ScienceMindMapTemplateData {
        ScienceMindMapTemplateData(
            type: .chemicalReaction,
            centralNode: ScienceMindMapNode(
                title: reaction,
                content: "Chemical Reaction"
            ),
            branches: [
                ScienceMindMapBranch(
                    title: "Reactants",
                    color: "#3498db",
                    nodes: [
                        ScienceMindMapNode(title: "Compound 1", content: "Formula and properties"),
                        ScienceMindMapNode(title: "Compound 2", content: "Formula and properties"),
                        ScienceMindMapNode(title: "States", content: "Solid, liquid, gas, aqueous")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Products",
                    color: "#27ae60",
                    nodes: [
                        ScienceMindMapNode(title: "Compound 1", content: "Formula and properties"),
                        ScienceMindMapNode(title: "Compound 2", content: "Formula and properties"),
                        ScienceMindMapNode(title: "Yield", content: "Expected amount")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Conditions",
                    color: "#f39c12",
                    nodes: [
                        ScienceMindMapNode(title: "Temperature", content: "Heat or cold needed"),
                        ScienceMindMapNode(title: "Pressure", content: "Pressure effects"),
                        ScienceMindMapNode(title: "Catalyst", content: "Substances to speed it up")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Energy",
                    color: "#e74c3c",
                    nodes: [
                        ScienceMindMapNode(title: "Type", content: "Endothermic or exothermic"),
                        ScienceMindMapNode(title: "Amount", content: "Energy change"),
                        ScienceMindMapNode(title: "Observations", content: "Temperature, color, gas")
                    ]
                )
            ]
        )
    }

    private static func energyFlowTemplate(process: String) -> ScienceMindMapTemplateData {
        ScienceMindMapTemplateData(
            type: .energyFlow,
            centralNode: ScienceMindMapNode(
                title: process,
                content: "Energy Flow"
            ),
            branches: [
                ScienceMindMapBranch(
                    title: "Initial Energy",
                    color: "#f39c12",
                    nodes: [
                        ScienceMindMapNode(title: "Source", content: "Where energy comes from"),
                        ScienceMindMapNode(title: "Type", content: "Form of energy"),
                        ScienceMindMapNode(title: "Amount", content: "Quantity of energy")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Transformations",
                    color: "#9b59b6",
                    nodes: [
                        ScienceMindMapNode(title: "Step 1", content: "First conversion"),
                        ScienceMindMapNode(title: "Step 2", content: "Second conversion"),
                        ScienceMindMapNode(title: "Efficiency", content: "Energy losses")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Final Energy",
                    color: "#27ae60",
                    nodes: [
                        ScienceMindMapNode(title: "Useful Output", content: "Desired energy form"),
                        ScienceMindMapNode(title: "Waste", content: "Lost energy"),
                        ScienceMindMapNode(title: "Applications", content: "What it's used for")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Conservation",
                    color: "#3498db",
                    nodes: [
                        ScienceMindMapNode(title: "Total Energy", content: "Energy conserved"),
                        ScienceMindMapNode(title: "Accounting", content: "Track all forms"),
                        ScienceMindMapNode(title: "Verification", content: "Check conservation")
                    ]
                )
            ]
        )
    }

    private static func forceAnalysisTemplate(scenario: String) -> ScienceMindMapTemplateData {
        ScienceMindMapTemplateData(
            type: .forceAnalysis,
            centralNode: ScienceMindMapNode(
                title: scenario,
                content: "Force Analysis"
            ),
            branches: [
                ScienceMindMapBranch(
                    title: "Identify Forces",
                    color: "#e74c3c",
                    nodes: [
                        ScienceMindMapNode(title: "Gravity", content: "Weight force"),
                        ScienceMindMapNode(title: "Normal Force", content: "Surface contact"),
                        ScienceMindMapNode(title: "Friction", content: "Resistance to motion"),
                        ScienceMindMapNode(title: "Applied Forces", content: "External forces")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Free Body Diagram",
                    color: "#3498db",
                    nodes: [
                        ScienceMindMapNode(title: "Object", content: "Draw as point"),
                        ScienceMindMapNode(title: "Force Arrows", content: "Show direction and magnitude"),
                        ScienceMindMapNode(title: "Coordinate System", content: "Choose axes")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Calculate",
                    color: "#f39c12",
                    nodes: [
                        ScienceMindMapNode(title: "Net Force", content: "Sum all forces"),
                        ScienceMindMapNode(title: "Components", content: "Break into x and y"),
                        ScienceMindMapNode(title: "Acceleration", content: "Use F = ma")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Motion",
                    color: "#27ae60",
                    nodes: [
                        ScienceMindMapNode(title: "Equilibrium?", content: "Balanced or unbalanced"),
                        ScienceMindMapNode(title: "Direction", content: "Which way it moves"),
                        ScienceMindMapNode(title: "Speed Change", content: "Speeding up or slowing down")
                    ]
                )
            ]
        )
    }

    private static func circuitAnalysisTemplate(circuit: String) -> ScienceMindMapTemplateData {
        ScienceMindMapTemplateData(
            type: .circuit,
            centralNode: ScienceMindMapNode(
                title: circuit,
                content: "Circuit Analysis"
            ),
            branches: [
                ScienceMindMapBranch(
                    title: "Components",
                    color: "#3498db",
                    nodes: [
                        ScienceMindMapNode(title: "Power Source", content: "Battery or supply"),
                        ScienceMindMapNode(title: "Resistors", content: "Values and arrangement"),
                        ScienceMindMapNode(title: "Other Elements", content: "Capacitors, LEDs, etc.")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Current",
                    color: "#f39c12",
                    nodes: [
                        ScienceMindMapNode(title: "Path", content: "Direction of flow"),
                        ScienceMindMapNode(title: "Series", content: "Same current everywhere"),
                        ScienceMindMapNode(title: "Parallel", content: "Current divides")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Voltage",
                    color: "#e74c3c",
                    nodes: [
                        ScienceMindMapNode(title: "Source", content: "Total voltage"),
                        ScienceMindMapNode(title: "Drops", content: "Voltage across components"),
                        ScienceMindMapNode(title: "Kirchhoff's Law", content: "Voltage sums to zero")
                    ]
                ),
                ScienceMindMapBranch(
                    title: "Calculations",
                    color: "#27ae60",
                    nodes: [
                        ScienceMindMapNode(title: "Ohm's Law", content: "V = IR"),
                        ScienceMindMapNode(title: "Total Resistance", content: "Series or parallel"),
                        ScienceMindMapNode(title: "Power", content: "P = VI")
                    ]
                )
            ]
        )
    }
}

/// Science mind map node (simplified structure for templates)
struct ScienceMindMapNode {
    let title: String
    let content: String
}

/// Science mind map branch
struct ScienceMindMapBranch {
    let title: String
    let color: String
    let nodes: [ScienceMindMapNode]
}

/// Science mind map template data structure
struct ScienceMindMapTemplateData {
    let type: ScienceMindMapTemplate.TemplateType
    let centralNode: ScienceMindMapNode
    let branches: [ScienceMindMapBranch]
}
