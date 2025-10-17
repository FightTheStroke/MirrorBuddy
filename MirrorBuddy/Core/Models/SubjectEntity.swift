import Foundation
import SwiftData
import SwiftUI

/// Database-backed subject entity allowing customization
@Model
final class SubjectEntity {
    var id: UUID = UUID()

    /// Subject name (uses localization key)
    var localizationKey: String = ""

    /// SF Symbol icon name
    var iconName: String = ""

    /// Color identifier
    var colorName: String = ""

    /// Sort order for display
    var sortOrder: Int = 0

    /// Whether subject is active (shown in UI)
    var isActive: Bool = true

    /// Whether subject is custom (user-created) or default
    var isCustom: Bool = false

    /// Materials in this subject
    @Relationship(deleteRule: .nullify, inverse: \Material.subject)
    var materials: [Material]?

    /// Tasks in this subject
    @Relationship(deleteRule: .nullify, inverse: \Task.subject)
    var tasks: [Task]?

    /// Voice conversations in this subject
    @Relationship(deleteRule: .nullify, inverse: \VoiceConversation.subject)
    var voiceConversations: [VoiceConversation]?

    init(
        localizationKey: String,
        iconName: String,
        colorName: String,
        sortOrder: Int,
        isActive: Bool = true,
        isCustom: Bool = false
    ) {
        self.id = UUID()
        self.localizationKey = localizationKey
        self.iconName = iconName
        self.colorName = colorName
        self.sortOrder = sortOrder
        self.isActive = isActive
        self.isCustom = isCustom
    }

    /// Localized display name
    var displayName: String {
        if isCustom {
            // Custom subjects store actual name in localizationKey
            return localizationKey
        } else {
            // Default subjects use localization
            return String(localized: String.LocalizationValue(localizationKey))
        }
    }

    /// Color for UI display
    var color: Color {
        switch colorName {
        case "purple": return .purple
        case "blue": return .blue
        case "red": return .red
        case "green": return .green
        case "orange": return .orange
        case "yellow": return .yellow
        case "cyan": return .cyan
        case "mint": return .mint
        case "pink": return .pink
        case "brown": return .brown
        case "gray": return .gray
        case "indigo": return .indigo
        case "teal": return .teal
        default: return .gray
        }
    }

    /// Convert SubjectEntity to Subject enum (Task 87.3)
    nonisolated func toSubject() -> Subject? {
        // Map by localization key
        switch localizationKey {
        case "subject.matematica":
            return .matematica
        case "subject.fisica":
            return .fisica
        case "subject.scienzeNaturali":
            return .scienzeNaturali
        case "subject.storiaGeografia":
            return .storiaGeografia
        case "subject.italiano":
            return .italiano
        case "subject.inglese":
            return .inglese
        case "subject.educazioneCivica":
            return .educazioneCivica
        case "subject.religione":
            return .religione
        case "subject.scienzeMotorie":
            return .scienzeMotorie
        case "subject.sostegno":
            return .sostegno
        case "subject.other":
            return .other
        default:
            // For custom subjects, default to .other
            return .other
        }
    }
}
