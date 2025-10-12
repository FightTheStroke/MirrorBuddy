import Foundation

/// Academic subjects for Mario's school curriculum
enum Subject: String, Codable, CaseIterable, Identifiable {
    case educazioneCivica = "Educazione Civica"
    case fisica = "Fisica"
    case inglese = "Inglese"
    case italiano = "Italiano"
    case matematica = "Matematica"
    case religione = "Religione"
    case scienzeMotorie = "Scienze Motorie"
    case scienzeNaturali = "Scienze Naturali"
    case sostegno = "SOSTEGNO"
    case storiaGeografia = "Storia e Geografia"
    case other = "Altro"

    var id: String { rawValue }

    /// System icon name for the subject
    var iconName: String {
        switch self {
        case .educazioneCivica: return "building.columns"
        case .fisica: return "atom"
        case .inglese: return "book.closed"
        case .italiano: return "text.book.closed"
        case .matematica: return "function"
        case .religione: return "star.circle"
        case .scienzeMotorie: return "figure.run"
        case .scienzeNaturali: return "leaf"
        case .sostegno: return "heart.circle.fill"
        case .storiaGeografia: return "globe.europe.africa"
        case .other: return "folder"
        }
    }

    /// Default color for the subject
    var colorName: String {
        switch self {
        case .educazioneCivica: return "purple"
        case .fisica: return "blue"
        case .inglese: return "red"
        case .italiano: return "green"
        case .matematica: return "orange"
        case .religione: return "yellow"
        case .scienzeMotorie: return "cyan"
        case .scienzeNaturali: return "mint"
        case .sostegno: return "pink"
        case .storiaGeografia: return "brown"
        case .other: return "gray"
        }
    }

    /// English translation for localization
    var englishName: String {
        switch self {
        case .educazioneCivica: return "Civic Education"
        case .fisica: return "Physics"
        case .inglese: return "English"
        case .italiano: return "Italian"
        case .matematica: return "Mathematics"
        case .religione: return "Religion"
        case .scienzeMotorie: return "Physical Education"
        case .scienzeNaturali: return "Natural Sciences"
        case .sostegno: return "Support"
        case .storiaGeografia: return "History and Geography"
        case .other: return "Other"
        }
    }

    /// Localized name based on current locale
    var localizedName: String {
        // TODO: Implement proper localization with String catalogs
        // For now, return Italian by default
        rawValue
    }
}
