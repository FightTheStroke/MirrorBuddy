import Foundation

/// Templates for generating structured lab reports
enum LabReportTemplate {

    enum TemplateType: String, CaseIterable {
        case physics = "Physics Lab"
        case chemistry = "Chemistry Lab"
        case biology = "Biology Lab"
        case general = "General Science Lab"

        var sections: [ReportSection] {
            switch self {
            case .physics:
                return [.title, .objective, .hypothesis, .materials, .procedure, .data, .calculations, .results, .discussion, .conclusion, .errors, .references]
            case .chemistry:
                return [.title, .objective, .materials, .safety, .procedure, .observations, .data, .calculations, .results, .discussion, .conclusion, .references]
            case .biology:
                return [.title, .objective, .background, .hypothesis, .materials, .procedure, .observations, .data, .results, .discussion, .conclusion, .references]
            case .general:
                return [.title, .objective, .materials, .procedure, .data, .results, .conclusion]
            }
        }
    }

    enum ReportSection: String {
        case title = "Title"
        case objective = "Objective"
        case hypothesis = "Hypothesis"
        case background = "Background"
        case materials = "Materials"
        case safety = "Safety Precautions"
        case procedure = "Procedure"
        case observations = "Observations"
        case data = "Data & Measurements"
        case calculations = "Calculations"
        case results = "Results"
        case discussion = "Discussion"
        case conclusion = "Conclusion"
        case errors = "Error Analysis"
        case references = "References"

        var guidelines: String {
            switch self {
            case .title:
                return "Descriptive title that clearly indicates what the experiment is about"
            case .objective:
                return "State the purpose of the experiment - what you're trying to learn or demonstrate"
            case .hypothesis:
                return "Your prediction about what will happen and why (if applicable)"
            case .background:
                return "Relevant background information and theory"
            case .materials:
                return "List all equipment and materials used, including quantities and specifications"
            case .safety:
                return "Important safety considerations and precautions taken"
            case .procedure:
                return "Step-by-step instructions. Write in past tense, passive voice (e.g., 'The solution was heated...')"
            case .observations:
                return "Qualitative observations made during the experiment"
            case .data:
                return "Present raw data in tables or charts. Include units for all measurements"
            case .calculations:
                return "Show sample calculations with formulas. Explain each step clearly"
            case .results:
                return "Present your findings clearly. Use graphs and tables where appropriate"
            case .discussion:
                return "Interpret your results. Explain what they mean and how they relate to theory"
            case .conclusion:
                return "Summarize whether your objective was met. Was your hypothesis supported?"
            case .errors:
                return "Discuss sources of error and their potential impact on results"
            case .references:
                return "List any sources cited in APA or MLA format"
            }
        }

        var placeholder: String {
            switch self {
            case .title:
                return "Investigation of [Topic]\n\nStudent Name\nDate\nClass"
            case .objective:
                return "The purpose of this experiment was to..."
            case .hypothesis:
                return "It is hypothesized that... because..."
            case .background:
                return "Provide relevant background information..."
            case .materials:
                return "• Item 1\n• Item 2\n• Item 3"
            case .safety:
                return "• Wear safety goggles\n• Handle chemicals carefully\n• Work in ventilated area"
            case .procedure:
                return "1. First step...\n2. Second step...\n3. Third step..."
            case .observations:
                return "During the experiment, it was observed that..."
            case .data:
                return "Table 1: [Title]\n\n| Trial | Measurement 1 | Measurement 2 |\n|-------|--------------|---------------|\n| 1     |              |               |"
            case .calculations:
                return "Sample Calculation:\n\nFormula: \n\nSubstitution:\n\nResult:"
            case .results:
                return "The results showed that..."
            case .discussion:
                return "The results indicate... This can be explained by..."
            case .conclusion:
                return "In conclusion, this experiment demonstrated that..."
            case .errors:
                return "Possible sources of error include:\n• Error 1 and its impact\n• Error 2 and its impact"
            case .references:
                return "1. Author, A. (Year). Title. Journal, Volume(Issue), pages.\n2. ..."
            }
        }
    }

    static func generateTemplate(type: TemplateType, customTitle: String? = nil) -> String {
        var report = ""

        for section in type.sections {
            report += "## \(section.rawValue)\n\n"
            report += "_\(section.guidelines)_\n\n"
            report += "\(section.placeholder)\n\n"
            report += "---\n\n"
        }

        return report
    }

    static func generateGuidelines(for section: ReportSection) -> String {
        """
        \(section.rawValue)

        Guidelines:
        \(section.guidelines)

        Example Format:
        \(section.placeholder)
        """
    }
}

// MARK: - Lab Report View Helper

struct LabReportView: View {
    let report: LabReport
    @State private var expandedSections: Set<Int> = []

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Title
                Text(report.title)
                    .font(.title)
                    .fontWeight(.bold)

                Divider()

                // Objective
                SectionView(
                    title: "Objective",
                    content: report.objective,
                    icon: "target"
                )

                // Hypothesis
                if !report.hypothesis.isEmpty {
                    SectionView(
                        title: "Hypothesis",
                        content: report.hypothesis,
                        icon: "lightbulb"
                    )
                }

                // Materials
                SectionView(
                    title: "Materials",
                    items: report.materials,
                    icon: "cart"
                )

                // Safety Notes
                if !report.safetyNotes.isEmpty {
                    SectionView(
                        title: "Safety Precautions",
                        items: report.safetyNotes,
                        icon: "exclamationmark.shield",
                        color: .red
                    )
                }

                // Procedure
                SectionView(
                    title: "Procedure",
                    items: report.procedure,
                    icon: "list.number",
                    numbered: true
                )

                // Data Table Template
                if !report.dataTableTemplate.isEmpty {
                    SectionView(
                        title: "Data Table",
                        content: report.dataTableTemplate,
                        icon: "tablecells"
                    )
                }

                // Calculation Examples
                if !report.calculationExamples.isEmpty {
                    SectionView(
                        title: "Sample Calculations",
                        items: report.calculationExamples,
                        icon: "function"
                    )
                }

                // Conclusion Guidelines
                SectionView(
                    title: "Conclusion Guidelines",
                    content: report.conclusionGuidelines,
                    icon: "checkmark.circle"
                )
            }
            .padding()
        }
        .navigationTitle("Lab Report Template")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct SectionView: View {
    let title: String
    var content: String?
    var items: [String]?
    let icon: String
    var color: Color = .blue
    var numbered: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                Text(title)
                    .font(.headline)
            }

            if let content = content {
                Text(content)
                    .font(.body)
            }

            if let items = items {
                ForEach(items.indices, id: \.self) { index in
                    HStack(alignment: .top, spacing: 8) {
                        if numbered {
                            Text("\(index + 1).")
                                .fontWeight(.semibold)
                        } else {
                            Text("•")
                        }
                        Text(items[index])
                            .font(.body)
                    }
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(color.opacity(0.1))
        )
    }
}
