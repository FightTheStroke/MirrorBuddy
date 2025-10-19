import Foundation

/// Model representing a proactive coaching prompt
struct ProactivePrompt: Identifiable, Equatable {
    let id: UUID
    let type: PromptType
    let message: String
    let actions: [PromptAction]
    let priority: Priority
    let timestamp: Date

    init(
        type: PromptType,
        message: String,
        actions: [PromptAction] = [],
        priority: Priority = .medium
    ) {
        self.id = UUID()
        self.type = type
        self.message = message
        self.actions = actions
        self.priority = priority
        self.timestamp = Date()
    }

    enum PromptType {
        case idle
        case encouragement
        case breakSuggestion
        case nextStep
        case checkpoint
        case clarification
        case celebration

        var icon: String {
            switch self {
            case .idle:
                return "clock"
            case .encouragement:
                return "hand.thumbsup.fill"
            case .breakSuggestion:
                return "cup.and.saucer.fill"
            case .nextStep:
                return "arrow.right.circle.fill"
            case .checkpoint:
                return "checkmark.circle.fill"
            case .clarification:
                return "questionmark.circle.fill"
            case .celebration:
                return "party.popper.fill"
            }
        }

        var color: String {
            switch self {
            case .idle:
                return "gray"
            case .encouragement:
                return "green"
            case .breakSuggestion:
                return "orange"
            case .nextStep:
                return "blue"
            case .checkpoint:
                return "purple"
            case .clarification:
                return "yellow"
            case .celebration:
                return "pink"
            }
        }
    }

    enum Priority: Int, Comparable {
        case low = 1
        case medium = 2
        case high = 3
        case urgent = 4

        static func < (lhs: Priority, rhs: Priority) -> Bool {
            lhs.rawValue < rhs.rawValue
        }
    }
}

/// Action that can be taken in response to a prompt
struct PromptAction: Identifiable, Equatable {
    let id: UUID
    let title: String
    let icon: String
    let handler: ActionType

    init(title: String, icon: String = "hand.tap", handler: ActionType) {
        self.id = UUID()
        self.title = title
        self.icon = icon
        self.handler = handler
    }

    enum ActionType: Equatable {
        case takeBreak
        case continueStudying
        case getHelp
        case viewSummary
        case dismiss
        case nextMaterial
        case reviewConcepts
        case custom(String)

        static func == (lhs: ActionType, rhs: ActionType) -> Bool {
            switch (lhs, rhs) {
            case (.takeBreak, .takeBreak),
                 (.continueStudying, .continueStudying),
                 (.getHelp, .getHelp),
                 (.viewSummary, .viewSummary),
                 (.dismiss, .dismiss),
                 (.nextMaterial, .nextMaterial),
                 (.reviewConcepts, .reviewConcepts):
                return true
            case let (.custom(lValue), .custom(rValue)):
                return lValue == rValue
            default:
                return false
            }
        }
    }
}

// MARK: - Prompt Builders

extension ProactivePrompt {
    static func idlePrompt(reason: String) -> ProactivePrompt {
        ProactivePrompt(
            type: .idle,
            message: reason,
            actions: [
                PromptAction(
                    title: ProactiveCoachingStrings.Actions.continue,
                    icon: "play.fill",
                    handler: .continueStudying
                ),
                PromptAction(
                    title: ProactiveCoachingStrings.Actions.help,
                    icon: "questionmark.circle",
                    handler: .getHelp
                ),
                PromptAction(
                    title: ProactiveCoachingStrings.Actions.close,
                    icon: "xmark",
                    handler: .dismiss
                )
            ],
            priority: .medium
        )
    }

    static func encouragementPrompt(message: String) -> ProactivePrompt {
        ProactivePrompt(
            type: .encouragement,
            message: message,
            actions: [
                PromptAction(
                    title: ProactiveCoachingStrings.Actions.thanks,
                    icon: "hand.thumbsup",
                    handler: .dismiss
                )
            ],
            priority: .low
        )
    }

    static func breakPrompt() -> ProactivePrompt {
        ProactivePrompt(
            type: .breakSuggestion,
            message: ProactiveCoachingStrings.Prompts.breakSuggestion,
            actions: [
                PromptAction(
                    title: ProactiveCoachingStrings.Actions.takeBreak,
                    icon: "pause.fill",
                    handler: .takeBreak
                ),
                PromptAction(
                    title: ProactiveCoachingStrings.Actions.continue,
                    icon: "play.fill",
                    handler: .continueStudying
                )
            ],
            priority: .high
        )
    }

    static func nextStepPrompt(suggestion: String) -> ProactivePrompt {
        ProactivePrompt(
            type: .nextStep,
            message: suggestion,
            actions: [
                PromptAction(
                    title: ProactiveCoachingStrings.Actions.ok,
                    icon: "checkmark",
                    handler: .nextMaterial
                ),
                PromptAction(
                    title: ProactiveCoachingStrings.Actions.again,
                    icon: "arrow.clockwise",
                    handler: .reviewConcepts
                ),
                PromptAction(
                    title: ProactiveCoachingStrings.Actions.later,
                    icon: "forward.fill",
                    handler: .dismiss
                )
            ],
            priority: .medium
        )
    }

    static func checkpointPrompt(summary: String) -> ProactivePrompt {
        ProactivePrompt(
            type: .checkpoint,
            message: summary,
            actions: [
                PromptAction(
                    title: ProactiveCoachingStrings.Actions.continue,
                    icon: "play.fill",
                    handler: .continueStudying
                ),
                PromptAction(
                    title: ProactiveCoachingStrings.Actions.summary,
                    icon: "doc.text",
                    handler: .viewSummary
                )
            ],
            priority: .medium
        )
    }

    static func celebrationPrompt(achievement: String) -> ProactivePrompt {
        ProactivePrompt(
            type: .celebration,
            message: achievement,
            actions: [
                PromptAction(
                    title: ProactiveCoachingStrings.Actions.thanksWithEmoji,
                    icon: "star.fill",
                    handler: .dismiss
                )
            ],
            priority: .low
        )
    }
}
