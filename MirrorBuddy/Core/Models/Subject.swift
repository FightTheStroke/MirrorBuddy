import Foundation

/// Academic subjects for categorizing materials
enum Subject: String, Codable, CaseIterable, Identifiable {
    case mathematics = "Mathematics"
    case science = "Science"
    case history = "History"
    case geography = "Geography"
    case italian = "Italian"
    case english = "English"
    case philosophy = "Philosophy"
    case literature = "Literature"
    case art = "Art"
    case music = "Music"
    case physicalEducation = "Physical Education"
    case other = "Other"

    var id: String { rawValue }

    /// System icon name for the subject
    var iconName: String {
        switch self {
        case .mathematics: return "function"
        case .science: return "atom"
        case .history: return "clock.arrow.circlepath"
        case .geography: return "globe.europe.africa"
        case .italian: return "book.closed"
        case .english: return "text.book.closed"
        case .philosophy: return "brain.head.profile"
        case .literature: return "book"
        case .art: return "paintpalette"
        case .music: return "music.note"
        case .physicalEducation: return "figure.run"
        case .other: return "folder"
        }
    }

    /// Default color for the subject
    var colorName: String {
        switch self {
        case .mathematics: return "blue"
        case .science: return "green"
        case .history: return "brown"
        case .geography: return "cyan"
        case .italian: return "red"
        case .english: return "purple"
        case .philosophy: return "indigo"
        case .literature: return "pink"
        case .art: return "orange"
        case .music: return "mint"
        case .physicalEducation: return "teal"
        case .other: return "gray"
        }
    }
}
