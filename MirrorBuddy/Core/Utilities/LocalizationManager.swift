import Foundation
import SwiftUI

/// Manages app localization and language switching
@Observable
@MainActor
final class LocalizationManager {
    /// Available languages
    enum Language: String, CaseIterable, Identifiable {
        case italian = "it"
        case english = "en"

        var id: String { rawValue }

        var displayName: String {
            switch self {
            case .italian: return "Italiano"
            case .english: return "English"
            }
        }

        var locale: Locale {
            Locale(identifier: rawValue)
        }
    }

    /// Shared singleton instance
    static let shared = LocalizationManager()

    /// Current selected language
    var currentLanguage: Language {
        didSet {
            UserDefaults.standard.set(currentLanguage.rawValue, forKey: "app_language")
            // Notify observers that language changed
            NotificationCenter.default.post(name: .languageChanged, object: nil)
        }
    }

    private init() {
        // Load saved language preference, default to Italian
        if let savedLang = UserDefaults.standard.string(forKey: "app_language"),
           let language = Language(rawValue: savedLang) {
            self.currentLanguage = language
        } else {
            self.currentLanguage = .italian
        }
    }

    /// Switch to a specific language
    func switchLanguage(to language: Language) {
        currentLanguage = language
    }
}

// MARK: - Notification Names
extension Notification.Name {
    static let languageChanged = Notification.Name("languageChanged")
}

// MARK: - SwiftUI Environment
private struct LocalizationManagerKey: EnvironmentKey {
    static let defaultValue = LocalizationManager.shared
}

extension EnvironmentValues {
    var localizationManager: LocalizationManager {
        get { self[LocalizationManagerKey.self] }
        set { self[LocalizationManagerKey.self] = newValue }
    }
}
