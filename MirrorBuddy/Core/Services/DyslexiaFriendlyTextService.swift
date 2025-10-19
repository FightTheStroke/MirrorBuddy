import Combine
import Foundation
import SwiftUI

/// Service for managing dyslexia-friendly text rendering settings (Task 74)
@MainActor
final class DyslexiaFriendlyTextService: ObservableObject {
    static let shared = DyslexiaFriendlyTextService()

    // MARK: - Published Settings (Subtask 74.1)

    /// Enable dyslexia-friendly mode
    @Published var isEnabled: Bool {
        didSet {
            UserDefaults.standard.set(isEnabled, forKey: "dyslexiaMode_enabled")
        }
    }

    /// Selected font (system or OpenDyslexic)
    @Published var selectedFont: DyslexiaFont {
        didSet {
            UserDefaults.standard.set(selectedFont.rawValue, forKey: "dyslexiaMode_font")
        }
    }

    /// Letter spacing (1.0 to 2.0)
    @Published var letterSpacing: CGFloat {
        didSet {
            UserDefaults.standard.set(letterSpacing, forKey: "dyslexiaMode_letterSpacing")
        }
    }

    /// Line spacing (1.0 to 3.0) - Subtask 74.2
    @Published var lineSpacing: CGFloat {
        didSet {
            UserDefaults.standard.set(lineSpacing, forKey: "dyslexiaMode_lineSpacing")
        }
    }

    /// Paragraph spacing (0 to 40) - Subtask 74.2
    @Published var paragraphSpacing: CGFloat {
        didSet {
            UserDefaults.standard.set(paragraphSpacing, forKey: "dyslexiaMode_paragraphSpacing")
        }
    }

    /// Text size multiplier (1.0 to 2.0)
    @Published var textSizeMultiplier: CGFloat {
        didSet {
            UserDefaults.standard.set(textSizeMultiplier, forKey: "dyslexiaMode_textSize")
        }
    }

    /// Color theme - Subtask 74.3
    @Published var colorTheme: DyslexiaColorTheme {
        didSet {
            UserDefaults.standard.set(colorTheme.rawValue, forKey: "dyslexiaMode_colorTheme")
        }
    }

    // MARK: - Font Options (Subtask 74.1)

    enum DyslexiaFont: String, CaseIterable, Identifiable {
        case system
        case openDyslexic = "opendyslexic"

        var id: String { rawValue }

        var displayName: String {
            switch self {
            case .system: return "Sistema"
            case .openDyslexic: return "OpenDyslexic"
            }
        }

        var fontName: String {
            switch self {
            case .system: return ".AppleSystemUIFont"
            case .openDyslexic: return "OpenDyslexic"
            }
        }

        /// Get SwiftUI Font
        func font(size: CGFloat) -> Font {
            switch self {
            case .system:
                return .system(size: size)
            case .openDyslexic:
                if let _ = UIFont(name: "OpenDyslexic", size: size) {
                    return .custom("OpenDyslexic", size: size)
                } else {
                    // Fallback to system if font not available
                    return .system(size: size)
                }
            }
        }

        /// Check if font is available
        var isAvailable: Bool {
            switch self {
            case .system:
                return true
            case .openDyslexic:
                return UIFont(name: "OpenDyslexic", size: 16) != nil
            }
        }
    }

    // MARK: - Color Themes (Subtask 74.3)

    enum DyslexiaColorTheme: String, CaseIterable, Identifiable {
        case standard
        case highContrast
        case creamPaper
        case darkMode

        var id: String { rawValue }

        var displayName: String {
            switch self {
            case .standard: return "Standard"
            case .highContrast: return "Alto Contrasto"
            case .creamPaper: return "Carta Crema"
            case .darkMode: return "Modalità Scura"
            }
        }

        var backgroundColor: Color {
            switch self {
            case .standard: return Color(.systemBackground)
            case .highContrast: return .white
            case .creamPaper: return Color(red: 1.0, green: 0.98, blue: 0.90)
            case .darkMode: return Color(red: 0.12, green: 0.12, blue: 0.12)
            }
        }

        var textColor: Color {
            switch self {
            case .standard: return Color(.label)
            case .highContrast: return .black
            case .creamPaper: return Color(red: 0.2, green: 0.2, blue: 0.2)
            case .darkMode: return Color(red: 0.85, green: 0.85, blue: 0.85)
            }
        }
    }

    // MARK: - Initialization

    private init() {
        // Load saved settings
        self.isEnabled = UserDefaults.standard.bool(forKey: "dyslexiaMode_enabled")

        // Load font
        if let fontRaw = UserDefaults.standard.string(forKey: "dyslexiaMode_font"),
           let font = DyslexiaFont(rawValue: fontRaw) {
            self.selectedFont = font
        } else {
            self.selectedFont = .system
        }

        // Load spacing settings
        let savedLetterSpacing = UserDefaults.standard.double(forKey: "dyslexiaMode_letterSpacing")
        self.letterSpacing = savedLetterSpacing > 0 ? savedLetterSpacing : 1.0

        let savedLineSpacing = UserDefaults.standard.double(forKey: "dyslexiaMode_lineSpacing")
        self.lineSpacing = savedLineSpacing > 0 ? savedLineSpacing : 1.5

        let savedParagraphSpacing = UserDefaults.standard.double(forKey: "dyslexiaMode_paragraphSpacing")
        self.paragraphSpacing = savedParagraphSpacing >= 0 ? savedParagraphSpacing : 16.0

        let savedTextSize = UserDefaults.standard.double(forKey: "dyslexiaMode_textSize")
        self.textSizeMultiplier = savedTextSize > 0 ? savedTextSize : 1.0

        // Load color theme
        if let themeRaw = UserDefaults.standard.string(forKey: "dyslexiaMode_colorTheme"),
           let theme = DyslexiaColorTheme(rawValue: themeRaw) {
            self.colorTheme = theme
        } else {
            self.colorTheme = .standard
        }
    }

    // MARK: - Computed Properties

    /// Get the current font for a given base size
    func font(for baseSize: CGFloat) -> Font {
        let adjustedSize = baseSize * textSizeMultiplier
        return selectedFont.font(size: adjustedSize)
    }

    /// Check if OpenDyslexic font is available
    var isOpenDyslexicAvailable: Bool {
        DyslexiaFont.openDyslexic.isAvailable
    }

    // MARK: - Reset Methods

    /// Reset all settings to defaults
    func resetToDefaults() {
        isEnabled = false
        selectedFont = .system
        letterSpacing = 1.0
        lineSpacing = 1.5
        paragraphSpacing = 16.0
        textSizeMultiplier = 1.0
        colorTheme = .standard
    }

    /// Apply recommended settings for dyslexia
    func applyRecommendedSettings() {
        isEnabled = true
        selectedFont = isOpenDyslexicAvailable ? .openDyslexic : .system
        letterSpacing = 1.2
        lineSpacing = 2.0
        paragraphSpacing = 24.0
        textSizeMultiplier = 1.1
        colorTheme = .creamPaper
    }
}

// MARK: - View Extensions (Subtask 74.1)

extension View {
    /// Apply dyslexia-friendly text rendering
    func dyslexiaFriendly(_ service: DyslexiaFriendlyTextService = .shared) -> some View {
        self.modifier(DyslexiaFriendlyModifier(service: service))
    }
}

struct DyslexiaFriendlyModifier: ViewModifier {
    @ObservedObject var service: DyslexiaFriendlyTextService

    func body(content: Content) -> some View {
        if service.isEnabled {
            content
                .environment(\.font, service.font(for: 16))
                .background(service.colorTheme.backgroundColor)
                .foregroundStyle(service.colorTheme.textColor)
        } else {
            content
        }
    }
}

// MARK: - Text Extensions (Subtask 74.1)

extension Text {
    /// Apply dyslexia-friendly styling to text
    func dyslexiaFriendlyText(
        service: DyslexiaFriendlyTextService = .shared,
        baseSize: CGFloat = 16
    ) -> some View {
        Group {
            if service.isEnabled {
                self
                    .font(service.font(for: baseSize))
                    .kerning(service.letterSpacing - 1.0)
                    .lineSpacing(service.lineSpacing * baseSize - baseSize)
                    .foregroundStyle(service.colorTheme.textColor)
            } else {
                self
            }
        }
    }
}
