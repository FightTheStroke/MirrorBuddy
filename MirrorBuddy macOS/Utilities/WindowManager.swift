#if os(macOS)
//
//  WindowManager.swift
//  MirrorBuddy macOS
//
//  Manages macOS window state, position, and behaviors
//

#if os(macOS)
import AppKit
import SwiftUI
import Combine

/// Manages macOS-specific window behaviors
@MainActor
class WindowManager: ObservableObject {
    static let shared = WindowManager()

    @Published var isAlwaysOnTop: Bool = false

    private init() {
        // Load saved always-on-top preference
        isAlwaysOnTop = UserDefaults.standard.bool(forKey: "windowAlwaysOnTop")
    }

    /// Get the main application window
    private var mainWindow: NSWindow? {
        NSApplication.shared.windows.first { $0.isMainWindow }
    }

    /// Toggle "Always on Top" mode (great for study sessions)
    func setAlwaysOnTop(_ value: Bool) {
        guard let window = mainWindow else { return }

        window.level = value ? .floating : .normal
        isAlwaysOnTop = value

        // Save preference
        UserDefaults.standard.set(value, forKey: "windowAlwaysOnTop")

        print("🪟 Window always on top: \(value ? "enabled" : "disabled")")
    }

    /// Save window frame to restore on next launch
    func saveWindowFrame() {
        guard let window = mainWindow else { return }

        let frame = window.frame
        let frameString = NSStringFromRect(frame)
        UserDefaults.standard.set(frameString, forKey: "windowFrame")

        print("💾 Saved window frame: \(frameString)")
    }

    /// Restore window frame from last session
    func restoreWindowFrame() {
        guard let window = mainWindow,
              let frameString = UserDefaults.standard.string(forKey: "windowFrame") else {
            // No saved frame - center on screen
            centerWindow()
            return
        }

        let frame = NSRectFromString(frameString)
        window.setFrame(frame, display: true)

        print("🪟 Restored window frame: \(frameString)")
    }

    /// Center window on screen (default on first launch)
    func centerWindow() {
        guard let window = mainWindow,
              let screen = window.screen else { return }

        let screenFrame = screen.visibleFrame
        let windowFrame = window.frame

        let x = screenFrame.midX - windowFrame.width / 2
        let y = screenFrame.midY - windowFrame.height / 2

        window.setFrameOrigin(NSPoint(x: x, y: y))

        print("🎯 Centered window on screen")
    }

    /// Set window title (can be dynamic based on current view)
    func setWindowTitle(_ title: String) {
        guard let window = mainWindow else { return }
        window.title = title
    }

    /// Enable/disable window resizability
    func setResizable(_ resizable: Bool) {
        guard let window = mainWindow else { return }

        if resizable {
            window.styleMask.insert(.resizable)
        } else {
            window.styleMask.remove(.resizable)
        }
    }

    /// Set window size constraints
    func setMinSize(width: CGFloat, height: CGFloat) {
        guard let window = mainWindow else { return }
        window.minSize = NSSize(width: width, height: height)
    }

    func setMaxSize(width: CGFloat, height: CGFloat) {
        guard let window = mainWindow else { return }
        window.maxSize = NSSize(width: width, height: height)
    }

    /// Apply Liquid Glass to window (macOS 26)
    func applyLiquidGlassBackground() {
        guard let window = mainWindow else { return }

        // macOS 26 automatically applies Liquid Glass to window chrome
        // But we can enhance it with materials

        window.isOpaque = false
        window.backgroundColor = .clear

        // Enable window blur/vibrancy
        window.contentView?.wantsLayer = true
        window.contentView?.layer?.backgroundColor = NSColor.clear.cgColor

        print("✨ Applied Liquid Glass to window")
    }

    /// Toggle sidebar visibility (Cmd+Shift+L)
    func toggleSidebar() {
        // This will be handled by NavigationSplitView's column visibility
        // But we can provide a centralized method
        NotificationCenter.default.post(name: .toggleSidebar, object: nil)
    }
}

// MARK: - Notification Names
extension Notification.Name {
    static let toggleSidebar = Notification.Name("toggleSidebar")
    static let windowDidBecomeKey = Notification.Name("windowDidBecomeKey")
    static let windowDidResignKey = Notification.Name("windowDidResignKey")
}

#endif

#endif
