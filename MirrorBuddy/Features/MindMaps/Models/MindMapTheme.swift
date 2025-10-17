//
//  MindMapTheme.swift
//  MirrorBuddy
//
//  Task 97.2: Typography and styling constants for mobile-optimized mind maps
//  Provides consistent sizing, fonts, and colors for readability
//

import SwiftUI

/// Theme configuration for mind map visualization (Task 97.2)
struct MindMapTheme {
    // MARK: - Typography

    /// Font sizes optimized for mobile readability (minimum 18pt)
    struct FontSize {
        static let rootNodeTitle: CGFloat = 24
        static let childNodeTitle: CGFloat = 18
        static let detailOverlayHeadline: CGFloat = 20
        static let detailOverlayBody: CGFloat = 16
        static let breadcrumbText: CGFloat = 14
        static let controlIcon: CGFloat = 24
        static let expandIndicator: CGFloat = 16
    }

    /// Font weights for visual hierarchy
    struct FontWeight {
        static let rootNode: Font.Weight = .bold
        static let childNode: Font.Weight = .semibold
        static let detailHeadline: Font.Weight = .bold
        static let detailBody: Font.Weight = .regular
    }

    // MARK: - Node Sizing

    /// Touch-optimized node sizes (minimum 44pt touch targets)
    struct NodeSize {
        static let rootDiameter: CGFloat = 120
        static let childDiameter: CGFloat = 90
        static let minimumTouchTarget: CGFloat = 44
        static let minimumNodeSpacing: CGFloat = 120
    }

    // MARK: - Visual Hierarchy

    /// Icon names for node type indicators
    struct NodeIcon {
        static let root = "circle.fill"
        static let branch = "circle.lefthalf.filled"
        static let leaf = "circle.dotted"
        static let expansionIndicator = "chevron.right.circle.fill"
        static let collapsed = "plus.circle.fill"
        static let expanded = "minus.circle.fill"
    }

    /// Subject-specific SF Symbol icons (Task 97.2)
    static func icon(for subject: Subject?) -> String {
        guard let subject = subject else { return "circle" }

        switch subject {
        case .matematica:
            return "function"
        case .fisica:
            return "waveform.path.ecg"
        case .scienzeNaturali:
            return "leaf.fill"
        case .storiaGeografia:
            return "book.fill"
        case .italiano:
            return "text.quote"
        case .inglese:
            return "globe"
        case .educazioneCivica:
            return "building.columns"
        case .religione:
            return "heart.fill"
        case .scienzeMotorie:
            return "figure.run"
        case .sostegno:
            return "person.2.fill"
        case .other:
            return "circle"
        }
    }

    // MARK: - Colors

    /// High contrast color settings
    struct ColorSettings {
        static let textOnColoredBackground: Color = .white
        static let selectedBorderColor: Color = .white
        static let selectedBorderWidth: CGFloat = 4
        static let connectionOpacity: CGFloat = 0.8 // Higher opacity for better visibility
        static let highContrastNodeOpacity: CGFloat = 1.0
        static let normalNodeOpacity: CGFloat = 0.85
    }

    /// Connection line styling
    struct Connection {
        static let lineWidth: CGFloat = 3 // Increased from 2pt
        static let arrowSize: CGFloat = 12
        static let curveControlPointOffset: CGFloat = 40
    }

    // MARK: - Layout

    /// Layout constraints for mobile optimization
    struct Layout {
        static let maxVisibleDepth: Int = 3
        static let viewportMargin: CGFloat = 200 // For culling
        static let breadcrumbHeight: CGFloat = 50
        static let miniMapSize: CGFloat = 80
        static let controlBarHeight: CGFloat = 70
        static let detailOverlayMinHeight: CGFloat = 200
    }

    // MARK: - Zoom & Gestures

    /// Zoom constraints optimized for mobile
    struct Zoom {
        static let minimum: CGFloat = 0.5 // Reduced from 0.3
        static let maximum: CGFloat = 2.0 // Reduced from 3.0
        static let step: CGFloat = 0.25
        static let defaultScale: CGFloat = 1.0
    }

    // MARK: - Accessibility

    /// Accessibility labels for VoiceOver
    struct AccessibilityLabel {
        static func nodeLabel(title: String, hasChildren: Bool, isExpanded: Bool) -> String {
            if hasChildren {
                return "\(title), \(isExpanded ? "expanded" : "collapsed")"
            } else {
                return title
            }
        }

        static let zoomInButton = "Zoom in"
        static let zoomOutButton = "Zoom out"
        static let resetViewButton = "Reset view"
        static let expandAllButton = "Expand all nodes"
        static let collapseAllButton = "Collapse all nodes"
        static let speakButton = "Read aloud"
    }

    /// Dynamic Type scaling support
    static func scaledFont(size: CGFloat, weight: Font.Weight = .regular, relativeTo textStyle: Font.TextStyle = .body) -> Font {
        return .system(size: size, weight: weight).monospacedDigit()
    }

    // MARK: - Animations

    /// Animation configurations
    struct Animation {
        static let nodeExpansion: SwiftUI.Animation = .spring(response: 0.3, dampingFraction: 0.7)
        static let zoomChange: SwiftUI.Animation = .easeInOut(duration: 0.2)
        static let panSmooth: SwiftUI.Animation = .interactiveSpring()
        static let overlayPresentation: SwiftUI.Animation = .easeInOut(duration: 0.3)
        static let controlBarAutoHide: Double = 3.0 // seconds
    }

    // MARK: - Shadow & Effects

    /// Visual depth effects
    struct Effects {
        static let nodeShadowRadius: CGFloat = 8
        static let nodeShadowOpacity: CGFloat = 0.3
        static let selectedGlowRadius: CGFloat = 10
    }
}

// MARK: - Environment Key

/// Environment key for mind map theme (allows customization)
struct MindMapThemeKey: EnvironmentKey {
    static let defaultValue = MindMapTheme()
}

extension EnvironmentValues {
    var mindMapTheme: MindMapTheme {
        get { self[MindMapThemeKey.self] }
        set { self[MindMapThemeKey.self] = newValue }
    }
}
