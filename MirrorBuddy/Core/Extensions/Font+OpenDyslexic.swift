//
//  Font+OpenDyslexic.swift
//  MirrorBuddy
//
//  OpenDyslexic font extensions for accessibility
//  Applied as default font throughout the app
//

import SwiftUI

extension Font {
    /// OpenDyslexic font for better readability (especially for dyslexia)
    static func openDyslexic(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        let fontName: String

        switch weight {
        case .bold:
            fontName = "OpenDyslexic-Bold"
        case .semibold, .heavy, .black:
            fontName = "OpenDyslexic-Bold"
        case .light, .thin, .ultraLight:
            fontName = "OpenDyslexic-Regular"
        default:
            fontName = "OpenDyslexic-Regular"
        }

        return .custom(fontName, size: size)
    }

    /// OpenDyslexic italic variant
    static func openDyslexicItalic(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        let fontName = weight == .bold ? "OpenDyslexic-Bold-Italic" : "OpenDyslexic-Italic"
        return .custom(fontName, size: size)
    }

    // MARK: - Semantic Font Sizes

    /// Extra large title (34pt)
    static var openDyslexicLargeTitle: Font {
        .openDyslexic(size: 34, weight: .bold)
    }

    /// Title (28pt)
    static var openDyslexicTitle: Font {
        .openDyslexic(size: 28, weight: .bold)
    }

    /// Title 2 (22pt)
    static var openDyslexicTitle2: Font {
        .openDyslexic(size: 22, weight: .bold)
    }

    /// Title 3 (20pt)
    static var openDyslexicTitle3: Font {
        .openDyslexic(size: 20, weight: .semibold)
    }

    /// Headline (18pt - minimum readable size per PRD)
    static var openDyslexicHeadline: Font {
        .openDyslexic(size: 18, weight: .semibold)
    }

    /// Body (18pt - increased for accessibility)
    static var openDyslexicBody: Font {
        .openDyslexic(size: 18)
    }

    /// Callout (17pt)
    static var openDyslexicCallout: Font {
        .openDyslexic(size: 17)
    }

    /// Subheadline (16pt)
    static var openDyslexicSubheadline: Font {
        .openDyslexic(size: 16)
    }

    /// Footnote (14pt)
    static var openDyslexicFootnote: Font {
        .openDyslexic(size: 14)
    }

    /// Caption (13pt)
    static var openDyslexicCaption: Font {
        .openDyslexic(size: 13)
    }
}

// MARK: - View Modifier for Default Font

struct OpenDyslexicModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .font(.openDyslexicBody) // Apply OpenDyslexic as default
    }
}

extension View {
    /// Apply OpenDyslexic as the default font for this view and its children
    func openDyslexicDefault() -> some View {
        modifier(OpenDyslexicModifier())
    }
}
