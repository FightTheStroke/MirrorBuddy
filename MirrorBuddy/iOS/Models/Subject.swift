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

    /// Localized name using String Catalog
    var localizedName: String {
        switch self {
        case .educazioneCivica: return String(localized: "subject.educazioneCivica")
        case .fisica: return String(localized: "subject.fisica")
        case .inglese: return String(localized: "subject.inglese")
        case .italiano: return String(localized: "subject.italiano")
        case .matematica: return String(localized: "subject.matematica")
        case .religione: return String(localized: "subject.religione")
        case .scienzeMotorie: return String(localized: "subject.scienzeMotorie")
        case .scienzeNaturali: return String(localized: "subject.scienzeNaturali")
        case .sostegno: return String(localized: "subject.sostegno")
        case .storiaGeografia: return String(localized: "subject.storiaGeografia")
        case .other: return String(localized: "subject.other")
        }
    }
}
