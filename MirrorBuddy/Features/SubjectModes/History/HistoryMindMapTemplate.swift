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
            centralNode: HistoryMindMapNode(
                title: topic,
                content: "Historical Timeline"
            ),
            branches: [
                MindMapBranch(
                    title: "Early Period",
                    color: "#3498db",
                    nodes: [
                        HistoryMindMapNode(title: "Beginning", content: "Origins and early developments"),
                        HistoryMindMapNode(title: "Key Events", content: "Major early events"),
                        HistoryMindMapNode(title: "Important Figures", content: "Early leaders and contributors")
                    ]
                ),
                MindMapBranch(
                    title: "Middle Period",
                    color: "#9b59b6",
                    nodes: [
                        HistoryMindMapNode(title: "Major Developments", content: "Significant changes"),
                        HistoryMindMapNode(title: "Turning Points", content: "Critical moments"),
                        HistoryMindMapNode(title: "Conflicts", content: "Major conflicts or challenges")
                    ]
                ),
                MindMapBranch(
                    title: "Late Period",
                    color: "#e74c3c",
                    nodes: [
                        HistoryMindMapNode(title: "Culmination", content: "How it ended or evolved"),
                        HistoryMindMapNode(title: "Legacy", content: "Long-term impacts"),
                        HistoryMindMapNode(title: "Modern Relevance", content: "Connection to today")
                    ]
                )
            ]
        )
    }

    private static func causeEffectTemplate(event: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .causeEffect,
            centralNode: HistoryMindMapNode(
                title: event,
                content: "Historical Event"
            ),
            branches: [
                MindMapBranch(
                    title: "Long-term Causes",
                    color: "#3498db",
                    nodes: [
                        HistoryMindMapNode(title: "Political Factors", content: "Government and power structures"),
                        HistoryMindMapNode(title: "Economic Factors", content: "Economic conditions"),
                        HistoryMindMapNode(title: "Social Factors", content: "Social structures and movements"),
                        HistoryMindMapNode(title: "Cultural Factors", content: "Beliefs and values")
                    ]
                ),
                MindMapBranch(
                    title: "Immediate Causes",
                    color: "#e67e22",
                    nodes: [
                        HistoryMindMapNode(title: "Trigger Event", content: "What sparked it"),
                        HistoryMindMapNode(title: "Key Decisions", content: "Critical choices made"),
                        HistoryMindMapNode(title: "Escalation", content: "How it escalated")
                    ]
                ),
                MindMapBranch(
                    title: "Short-term Effects",
                    color: "#9b59b6",
                    nodes: [
                        HistoryMindMapNode(title: "Immediate Impact", content: "What happened right after"),
                        HistoryMindMapNode(title: "Initial Reactions", content: "How people responded"),
                        HistoryMindMapNode(title: "Direct Consequences", content: "Immediate results")
                    ]
                ),
                MindMapBranch(
                    title: "Long-term Effects",
                    color: "#e74c3c",
                    nodes: [
                        HistoryMindMapNode(title: "Political Changes", content: "Government and power shifts"),
                        HistoryMindMapNode(title: "Social Changes", content: "Society transformation"),
                        HistoryMindMapNode(title: "Legacy", content: "Lasting impact"),
                        HistoryMindMapNode(title: "Historical Significance", content: "Why it matters")
                    ]
                )
            ]
        )
    }

    private static func comparisonTemplate(topic: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .comparison,
            centralNode: HistoryMindMapNode(
                title: topic,
                content: "Comparative Analysis"
            ),
            branches: [
                MindMapBranch(
                    title: "Subject A",
                    color: "#3498db",
                    nodes: [
                        HistoryMindMapNode(title: "Context", content: "Historical setting"),
                        HistoryMindMapNode(title: "Key Features", content: "Main characteristics"),
                        HistoryMindMapNode(title: "Impact", content: "Effects and outcomes")
                    ]
                ),
                MindMapBranch(
                    title: "Subject B",
                    color: "#e74c3c",
                    nodes: [
                        HistoryMindMapNode(title: "Context", content: "Historical setting"),
                        HistoryMindMapNode(title: "Key Features", content: "Main characteristics"),
                        HistoryMindMapNode(title: "Impact", content: "Effects and outcomes")
                    ]
                ),
                MindMapBranch(
                    title: "Similarities",
                    color: "#27ae60",
                    nodes: [
                        HistoryMindMapNode(title: "Common Features", content: "Shared characteristics"),
                        HistoryMindMapNode(title: "Parallel Developments", content: "Similar patterns"),
                        HistoryMindMapNode(title: "Shared Context", content: "Common background")
                    ]
                ),
                MindMapBranch(
                    title: "Differences",
                    color: "#f39c12",
                    nodes: [
                        HistoryMindMapNode(title: "Contrasting Features", content: "Different characteristics"),
                        HistoryMindMapNode(title: "Unique Aspects", content: "Distinctive elements"),
                        HistoryMindMapNode(title: "Different Outcomes", content: "Varied results")
                    ]
                )
            ]
        )
    }

    private static func biographyTemplate(person: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .biography,
            centralNode: HistoryMindMapNode(
                title: person,
                content: "Historical Figure"
            ),
            branches: [
                MindMapBranch(
                    title: "Early Life",
                    color: "#3498db",
                    nodes: [
                        HistoryMindMapNode(title: "Birth & Family", content: "Origins and background"),
                        HistoryMindMapNode(title: "Education", content: "Learning and training"),
                        HistoryMindMapNode(title: "Influences", content: "Early influences")
                    ]
                ),
                MindMapBranch(
                    title: "Major Accomplishments",
                    color: "#f39c12",
                    nodes: [
                        HistoryMindMapNode(title: "Key Achievements", content: "Major successes"),
                        HistoryMindMapNode(title: "Important Works", content: "Significant contributions"),
                        HistoryMindMapNode(title: "Leadership", content: "Roles and positions")
                    ]
                ),
                MindMapBranch(
                    title: "Historical Context",
                    color: "#9b59b6",
                    nodes: [
                        HistoryMindMapNode(title: "Time Period", content: "Era they lived in"),
                        HistoryMindMapNode(title: "Contemporary Events", content: "What else was happening"),
                        HistoryMindMapNode(title: "Related Figures", content: "Connections to others")
                    ]
                ),
                MindMapBranch(
                    title: "Legacy",
                    color: "#e74c3c",
                    nodes: [
                        HistoryMindMapNode(title: "Immediate Impact", content: "Effects during lifetime"),
                        HistoryMindMapNode(title: "Long-term Influence", content: "Lasting effects"),
                        HistoryMindMapNode(title: "Modern Relevance", content: "Significance today")
                    ]
                )
            ]
        )
    }

    private static func revolutionTemplate(movement: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .revolution,
            centralNode: HistoryMindMapNode(
                title: movement,
                content: "Revolution/Movement"
            ),
            branches: [
                MindMapBranch(
                    title: "Causes",
                    color: "#e74c3c",
                    nodes: [
                        HistoryMindMapNode(title: "Grievances", content: "What people were unhappy about"),
                        HistoryMindMapNode(title: "Inequality", content: "Social or economic unfairness"),
                        HistoryMindMapNode(title: "Trigger Events", content: "What sparked action")
                    ]
                ),
                MindMapBranch(
                    title: "Key Figures",
                    color: "#3498db",
                    nodes: [
                        HistoryMindMapNode(title: "Leaders", content: "Who led the movement"),
                        HistoryMindMapNode(title: "Supporters", content: "Who joined the cause"),
                        HistoryMindMapNode(title: "Opposition", content: "Who resisted")
                    ]
                ),
                MindMapBranch(
                    title: "Major Events",
                    color: "#f39c12",
                    nodes: [
                        HistoryMindMapNode(title: "Beginning", content: "How it started"),
                        HistoryMindMapNode(title: "Turning Points", content: "Critical moments"),
                        HistoryMindMapNode(title: "Conclusion", content: "How it ended")
                    ]
                ),
                MindMapBranch(
                    title: "Outcomes",
                    color: "#27ae60",
                    nodes: [
                        HistoryMindMapNode(title: "Changes Achieved", content: "What changed"),
                        HistoryMindMapNode(title: "Failed Goals", content: "What didn't change"),
                        HistoryMindMapNode(title: "Legacy", content: "Long-term impact")
                    ]
                )
            ]
        )
    }

    private static func warTemplate(conflict: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .war,
            centralNode: HistoryMindMapNode(
                title: conflict,
                content: "War/Conflict"
            ),
            branches: [
                MindMapBranch(
                    title: "Origins",
                    color: "#e74c3c",
                    nodes: [
                        HistoryMindMapNode(title: "Underlying Tensions", content: "Long-term issues"),
                        HistoryMindMapNode(title: "Immediate Cause", content: "What triggered the war"),
                        HistoryMindMapNode(title: "Alliances", content: "Who sided with whom")
                    ]
                ),
                MindMapBranch(
                    title: "Major Battles",
                    color: "#3498db",
                    nodes: [
                        HistoryMindMapNode(title: "Opening Campaign", content: "Early fighting"),
                        HistoryMindMapNode(title: "Turning Points", content: "Decisive battles"),
                        HistoryMindMapNode(title: "Final Campaigns", content: "End of fighting")
                    ]
                ),
                MindMapBranch(
                    title: "Home Front",
                    color: "#9b59b6",
                    nodes: [
                        HistoryMindMapNode(title: "Civilian Impact", content: "Effect on people"),
                        HistoryMindMapNode(title: "Economy", content: "Economic changes"),
                        HistoryMindMapNode(title: "Propaganda", content: "Information campaigns")
                    ]
                ),
                MindMapBranch(
                    title: "Aftermath",
                    color: "#27ae60",
                    nodes: [
                        HistoryMindMapNode(title: "Peace Terms", content: "How it ended"),
                        HistoryMindMapNode(title: "Casualties", content: "Human cost"),
                        HistoryMindMapNode(title: "Long-term Effects", content: "Lasting consequences")
                    ]
                )
            ]
        )
    }

    private static func civilizationTemplate(civilization: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .civilization,
            centralNode: HistoryMindMapNode(
                title: civilization,
                content: "Civilization"
            ),
            branches: [
                MindMapBranch(
                    title: "Geography",
                    color: "#27ae60",
                    nodes: [
                        HistoryMindMapNode(title: "Location", content: "Where they lived"),
                        HistoryMindMapNode(title: "Resources", content: "Natural resources"),
                        HistoryMindMapNode(title: "Climate", content: "Environmental factors")
                    ]
                ),
                MindMapBranch(
                    title: "Government",
                    color: "#3498db",
                    nodes: [
                        HistoryMindMapNode(title: "Political Structure", content: "How they governed"),
                        HistoryMindMapNode(title: "Leadership", content: "Who ruled"),
                        HistoryMindMapNode(title: "Law & Order", content: "Legal systems")
                    ]
                ),
                MindMapBranch(
                    title: "Culture",
                    color: "#9b59b6",
                    nodes: [
                        HistoryMindMapNode(title: "Religion", content: "Beliefs and practices"),
                        HistoryMindMapNode(title: "Art & Architecture", content: "Cultural achievements"),
                        HistoryMindMapNode(title: "Language & Writing", content: "Communication systems")
                    ]
                ),
                MindMapBranch(
                    title: "Economy",
                    color: "#f39c12",
                    nodes: [
                        HistoryMindMapNode(title: "Agriculture", content: "Food production"),
                        HistoryMindMapNode(title: "Trade", content: "Commerce and exchange"),
                        HistoryMindMapNode(title: "Technology", content: "Innovations")
                    ]
                ),
                MindMapBranch(
                    title: "Society",
                    color: "#e74c3c",
                    nodes: [
                        HistoryMindMapNode(title: "Social Classes", content: "Class structure"),
                        HistoryMindMapNode(title: "Daily Life", content: "How people lived"),
                        HistoryMindMapNode(title: "Family Structure", content: "Household organization")
                    ]
                )
            ]
        )
    }

    private static func eraTemplate(era: String) -> MindMapTemplate {
        MindMapTemplate(
            type: .era,
            centralNode: HistoryMindMapNode(
                title: era,
                content: "Historical Era"
            ),
            branches: [
                MindMapBranch(
                    title: "Political",
                    color: "#3498db",
                    nodes: [
                        HistoryMindMapNode(title: "Governments", content: "Political systems"),
                        HistoryMindMapNode(title: "Leaders", content: "Important rulers"),
                        HistoryMindMapNode(title: "Conflicts", content: "Wars and disputes")
                    ]
                ),
                MindMapBranch(
                    title: "Economic",
                    color: "#27ae60",
                    nodes: [
                        HistoryMindMapNode(title: "Trade", content: "Commerce patterns"),
                        HistoryMindMapNode(title: "Industry", content: "Economic activities"),
                        HistoryMindMapNode(title: "Wealth Distribution", content: "Economic structure")
                    ]
                ),
                MindMapBranch(
                    title: "Social",
                    color: "#e74c3c",
                    nodes: [
                        HistoryMindMapNode(title: "Class Structure", content: "Social hierarchy"),
                        HistoryMindMapNode(title: "Daily Life", content: "How people lived"),
                        HistoryMindMapNode(title: "Movements", content: "Social changes")
                    ]
                ),
                MindMapBranch(
                    title: "Cultural",
                    color: "#9b59b6",
                    nodes: [
                        HistoryMindMapNode(title: "Arts", content: "Artistic achievements"),
                        HistoryMindMapNode(title: "Philosophy", content: "Ideas and thinkers"),
                        HistoryMindMapNode(title: "Religion", content: "Spiritual life")
                    ]
                ),
                MindMapBranch(
                    title: "Technological",
                    color: "#f39c12",
                    nodes: [
                        HistoryMindMapNode(title: "Inventions", content: "New technologies"),
                        HistoryMindMapNode(title: "Scientific Progress", content: "Discoveries"),
                        HistoryMindMapNode(title: "Impact", content: "How tech changed life")
                    ]
                )
            ]
        )
    }
}

// MARK: - Mind Map Data Structures

struct MindMapTemplate {
    let type: HistoryMindMapTemplate.TemplateType
    let centralNode: HistoryMindMapNode
    let branches: [MindMapBranch]
}

struct HistoryMindMapNode {
    let title: String
    let content: String
}

struct MindMapBranch {
    let title: String
    let color: String // Hex color
    let nodes: [HistoryMindMapNode]
}
