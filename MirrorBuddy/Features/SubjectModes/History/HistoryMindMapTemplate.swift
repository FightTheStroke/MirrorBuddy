import Foundation

/// Specialized mind map templates for history study
enum HistoryMindMapTemplate {

    // MARK: - Template Types

    enum TemplateType: String, CaseIterable {
        case timeline = "Historical Timeline"
        case causeEffect = "Cause and Effect"
        case comparison = "Comparative Analysis"
        case biography = "Historical Figure"
        case revolution = "Revolution/Movement"
        case war = "War/Conflict"
        case civilization = "Civilization"
        case era = "Historical Era"

        var description: String {
            switch self {
            case .timeline:
                return "Map events chronologically with connections"
            case .causeEffect:
                return "Analyze causes leading to effects"
            case .comparison:
                return "Compare two historical subjects"
            case .biography:
                return "Map a historical figure's life and impact"
            case .revolution:
                return "Analyze a revolution or social movement"
            case .war:
                return "Examine a war or military conflict"
            case .civilization:
                return "Explore aspects of a civilization"
            case .era:
                return "Overview of a historical period"
            }
        }
    }

    // MARK: - Template Generation

    static func generateTemplate(type: TemplateType, centralTopic: String) -> MindMapTemplate {
        switch type {
        case .timeline:
            return timelineTemplate(topic: centralTopic)
        case .causeEffect:
            return causeEffectTemplate(event: centralTopic)
        case .comparison:
            return comparisonTemplate(topic: centralTopic)
        case .biography:
            return biographyTemplate(person: centralTopic)
        case .revolution:
            return revolutionTemplate(movement: centralTopic)
        case .war:
            return warTemplate(conflict: centralTopic)
        case .civilization:
            return civilizationTemplate(civilization: centralTopic)
        case .era:
            return eraTemplate(era: centralTopic)
        }
    }

    // MARK: - Template Definitions

    private static func timelineTemplate(topic: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .timeline,
            centralNode: MindMapNode(
                title: topic,
                content: "Historical Timeline"
            ),
            branches: [
                MindMapBranch(
                    title: "Early Period",
                    color: "#3498db",
                    nodes: [
                        MindMapNode(title: "Beginning", content: "Origins and early developments"),
                        MindMapNode(title: "Key Events", content: "Major early events"),
                        MindMapNode(title: "Important Figures", content: "Early leaders and contributors")
                    ]
                ),
                MindMapBranch(
                    title: "Middle Period",
                    color: "#9b59b6",
                    nodes: [
                        MindMapNode(title: "Major Developments", content: "Significant changes"),
                        MindMapNode(title: "Turning Points", content: "Critical moments"),
                        MindMapNode(title: "Conflicts", content: "Major conflicts or challenges")
                    ]
                ),
                MindMapBranch(
                    title: "Late Period",
                    color: "#e74c3c",
                    nodes: [
                        MindMapNode(title: "Culmination", content: "How it ended or evolved"),
                        MindMapNode(title: "Legacy", content: "Long-term impacts"),
                        MindMapNode(title: "Modern Relevance", content: "Connection to today")
                    ]
                )
            ]
        )
    }

    private static func causeEffectTemplate(event: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .causeEffect,
            centralNode: MindMapNode(
                title: event,
                content: "Historical Event"
            ),
            branches: [
                MindMapBranch(
                    title: "Long-term Causes",
                    color: "#3498db",
                    nodes: [
                        MindMapNode(title: "Political Factors", content: "Government and power structures"),
                        MindMapNode(title: "Economic Factors", content: "Economic conditions"),
                        MindMapNode(title: "Social Factors", content: "Social structures and movements"),
                        MindMapNode(title: "Cultural Factors", content: "Beliefs and values")
                    ]
                ),
                MindMapBranch(
                    title: "Immediate Causes",
                    color: "#e67e22",
                    nodes: [
                        MindMapNode(title: "Trigger Event", content: "What sparked it"),
                        MindMapNode(title: "Key Decisions", content: "Critical choices made"),
                        MindMapNode(title: "Escalation", content: "How it escalated")
                    ]
                ),
                MindMapBranch(
                    title: "Short-term Effects",
                    color: "#9b59b6",
                    nodes: [
                        MindMapNode(title: "Immediate Impact", content: "What happened right after"),
                        MindMapNode(title: "Initial Reactions", content: "How people responded"),
                        MindMapNode(title: "Direct Consequences", content: "Immediate results")
                    ]
                ),
                MindMapBranch(
                    title: "Long-term Effects",
                    color: "#e74c3c",
                    nodes: [
                        MindMapNode(title: "Political Changes", content: "Government and power shifts"),
                        MindMapNode(title: "Social Changes", content: "Society transformation"),
                        MindMapNode(title: "Legacy", content: "Lasting impact"),
                        MindMapNode(title: "Historical Significance", content: "Why it matters")
                    ]
                )
            ]
        )
    }

    private static func comparisonTemplate(topic: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .comparison,
            centralNode: MindMapNode(
                title: topic,
                content: "Comparative Analysis"
            ),
            branches: [
                MindMapBranch(
                    title: "Subject A",
                    color: "#3498db",
                    nodes: [
                        MindMapNode(title: "Context", content: "Historical setting"),
                        MindMapNode(title: "Key Features", content: "Main characteristics"),
                        MindMapNode(title: "Impact", content: "Effects and outcomes")
                    ]
                ),
                MindMapBranch(
                    title: "Subject B",
                    color: "#e74c3c",
                    nodes: [
                        MindMapNode(title: "Context", content: "Historical setting"),
                        MindMapNode(title: "Key Features", content: "Main characteristics"),
                        MindMapNode(title: "Impact", content: "Effects and outcomes")
                    ]
                ),
                MindMapBranch(
                    title: "Similarities",
                    color: "#27ae60",
                    nodes: [
                        MindMapNode(title: "Common Features", content: "Shared characteristics"),
                        MindMapNode(title: "Parallel Developments", content: "Similar patterns"),
                        MindMapNode(title: "Shared Context", content: "Common background")
                    ]
                ),
                MindMapBranch(
                    title: "Differences",
                    color: "#f39c12",
                    nodes: [
                        MindMapNode(title: "Contrasting Features", content: "Different characteristics"),
                        MindMapNode(title: "Unique Aspects", content: "Distinctive elements"),
                        MindMapNode(title: "Different Outcomes", content: "Varied results")
                    ]
                )
            ]
        )
    }

    private static func biographyTemplate(person: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .biography,
            centralNode: MindMapNode(
                title: person,
                content: "Historical Figure"
            ),
            branches: [
                MindMapBranch(
                    title: "Early Life",
                    color: "#3498db",
                    nodes: [
                        MindMapNode(title: "Birth & Family", content: "Origins and background"),
                        MindMapNode(title: "Education", content: "Learning and training"),
                        MindMapNode(title: "Influences", content: "Early influences")
                    ]
                ),
                MindMapBranch(
                    title: "Major Accomplishments",
                    color: "#f39c12",
                    nodes: [
                        MindMapNode(title: "Key Achievements", content: "Major successes"),
                        MindMapNode(title: "Important Works", content: "Significant contributions"),
                        MindMapNode(title: "Leadership", content: "Roles and positions")
                    ]
                ),
                MindMapBranch(
                    title: "Historical Context",
                    color: "#9b59b6",
                    nodes: [
                        MindMapNode(title: "Time Period", content: "Era they lived in"),
                        MindMapNode(title: "Contemporary Events", content: "What else was happening"),
                        MindMapNode(title: "Related Figures", content: "Connections to others")
                    ]
                ),
                MindMapBranch(
                    title: "Legacy",
                    color: "#e74c3c",
                    nodes: [
                        MindMapNode(title: "Immediate Impact", content: "Effects during lifetime"),
                        MindMapNode(title: "Long-term Influence", content: "Lasting effects"),
                        MindMapNode(title: "Modern Relevance", content: "Significance today")
                    ]
                )
            ]
        )
    }

    private static func revolutionTemplate(movement: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .revolution,
            centralNode: MindMapNode(
                title: movement,
                content: "Revolution/Movement"
            ),
            branches: [
                MindMapBranch(
                    title: "Causes",
                    color: "#e74c3c",
                    nodes: [
                        MindMapNode(title: "Grievances", content: "What people were unhappy about"),
                        MindMapNode(title: "Inequality", content: "Social or economic unfairness"),
                        MindMapNode(title: "Trigger Events", content: "What sparked action")
                    ]
                ),
                MindMapBranch(
                    title: "Key Figures",
                    color: "#3498db",
                    nodes: [
                        MindMapNode(title: "Leaders", content: "Who led the movement"),
                        MindMapNode(title: "Supporters", content: "Who joined the cause"),
                        MindMapNode(title: "Opposition", content: "Who resisted")
                    ]
                ),
                MindMapBranch(
                    title: "Major Events",
                    color: "#f39c12",
                    nodes: [
                        MindMapNode(title: "Beginning", content: "How it started"),
                        MindMapNode(title: "Turning Points", content: "Critical moments"),
                        MindMapNode(title: "Conclusion", content: "How it ended")
                    ]
                ),
                MindMapBranch(
                    title: "Outcomes",
                    color: "#27ae60",
                    nodes: [
                        MindMapNode(title: "Changes Achieved", content: "What changed"),
                        MindMapNode(title: "Failed Goals", content: "What didn't change"),
                        MindMapNode(title: "Legacy", content: "Long-term impact")
                    ]
                )
            ]
        )
    }

    private static func warTemplate(conflict: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .war,
            centralNode: MindMapNode(
                title: conflict,
                content: "War/Conflict"
            ),
            branches: [
                MindMapBranch(
                    title: "Origins",
                    color: "#e74c3c",
                    nodes: [
                        MindMapNode(title: "Underlying Tensions", content: "Long-term issues"),
                        MindMapNode(title: "Immediate Cause", content: "What triggered the war"),
                        MindMapNode(title: "Alliances", content: "Who sided with whom")
                    ]
                ),
                MindMapBranch(
                    title: "Major Battles",
                    color: "#3498db",
                    nodes: [
                        MindMapNode(title: "Opening Campaign", content: "Early fighting"),
                        MindMapNode(title: "Turning Points", content: "Decisive battles"),
                        MindMapNode(title: "Final Campaigns", content: "End of fighting")
                    ]
                ),
                MindMapBranch(
                    title: "Home Front",
                    color: "#9b59b6",
                    nodes: [
                        MindMapNode(title: "Civilian Impact", content: "Effect on people"),
                        MindMapNode(title: "Economy", content: "Economic changes"),
                        MindMapNode(title: "Propaganda", content: "Information campaigns")
                    ]
                ),
                MindMapBranch(
                    title: "Aftermath",
                    color: "#27ae60",
                    nodes: [
                        MindMapNode(title: "Peace Terms", content: "How it ended"),
                        MindMapNode(title: "Casualties", content: "Human cost"),
                        MindMapNode(title: "Long-term Effects", content: "Lasting consequences")
                    ]
                )
            ]
        )
    }

    private static func civilizationTemplate(civilization: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .civilization,
            centralNode: MindMapNode(
                title: civilization,
                content: "Civilization"
            ),
            branches: [
                MindMapBranch(
                    title: "Geography",
                    color: "#27ae60",
                    nodes: [
                        MindMapNode(title: "Location", content: "Where they lived"),
                        MindMapNode(title: "Resources", content: "Natural resources"),
                        MindMapNode(title: "Climate", content: "Environmental factors")
                    ]
                ),
                MindMapBranch(
                    title: "Government",
                    color: "#3498db",
                    nodes: [
                        MindMapNode(title: "Political Structure", content: "How they governed"),
                        MindMapNode(title: "Leadership", content: "Who ruled"),
                        MindMapNode(title: "Law & Order", content: "Legal systems")
                    ]
                ),
                MindMapBranch(
                    title: "Culture",
                    color: "#9b59b6",
                    nodes: [
                        MindMapNode(title: "Religion", content: "Beliefs and practices"),
                        MindMapNode(title: "Art & Architecture", content: "Cultural achievements"),
                        MindMapNode(title: "Language & Writing", content: "Communication systems")
                    ]
                ),
                MindMapBranch(
                    title: "Economy",
                    color: "#f39c12",
                    nodes: [
                        MindMapNode(title: "Agriculture", content: "Food production"),
                        MindMapNode(title: "Trade", content: "Commerce and exchange"),
                        MindMapNode(title: "Technology", content: "Innovations")
                    ]
                ),
                MindMapBranch(
                    title: "Society",
                    color: "#e74c3c",
                    nodes: [
                        MindMapNode(title: "Social Classes", content: "Class structure"),
                        MindMapNode(title: "Daily Life", content: "How people lived"),
                        MindMapNode(title: "Family Structure", content: "Household organization")
                    ]
                )
            ]
        )
    }

    private static func eraTemplate(era: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .era,
            centralNode: MindMapNode(
                title: era,
                content: "Historical Era"
            ),
            branches: [
                MindMapBranch(
                    title: "Political",
                    color: "#3498db",
                    nodes: [
                        MindMapNode(title: "Governments", content: "Political systems"),
                        MindMapNode(title: "Leaders", content: "Important rulers"),
                        MindMapNode(title: "Conflicts", content: "Wars and disputes")
                    ]
                ),
                MindMapBranch(
                    title: "Economic",
                    color: "#27ae60",
                    nodes: [
                        MindMapNode(title: "Trade", content: "Commerce patterns"),
                        MindMapNode(title: "Industry", content: "Economic activities"),
                        MindMapNode(title: "Wealth Distribution", content: "Economic structure")
                    ]
                ),
                MindMapBranch(
                    title: "Social",
                    color: "#e74c3c",
                    nodes: [
                        MindMapNode(title: "Class Structure", content: "Social hierarchy"),
                        MindMapNode(title: "Daily Life", content: "How people lived"),
                        MindMapNode(title: "Movements", content: "Social changes")
                    ]
                ),
                MindMapBranch(
                    title: "Cultural",
                    color: "#9b59b6",
                    nodes: [
                        MindMapNode(title: "Arts", content: "Artistic achievements"),
                        MindMapNode(title: "Philosophy", content: "Ideas and thinkers"),
                        MindMapNode(title: "Religion", content: "Spiritual life")
                    ]
                ),
                MindMapBranch(
                    title: "Technological",
                    color: "#f39c12",
                    nodes: [
                        MindMapNode(title: "Inventions", content: "New technologies"),
                        MindMapNode(title: "Scientific Progress", content: "Discoveries"),
                        MindMapNode(title: "Impact", content: "How tech changed life")
                    ]
                )
            ]
        )
    }
}

// MARK: - Mind Map Data Structures

struct MindMapTemplate {
    let type: HistoryMindMapTemplate.TemplateType
    let centralNode: MindMapNode
    let branches: [MindMapBranch]
}

struct MindMapNode {
    let title: String
    let content: String
}

struct MindMapBranch {
    let title: String
    let color: String // Hex color
    let nodes: [MindMapNode]
}
