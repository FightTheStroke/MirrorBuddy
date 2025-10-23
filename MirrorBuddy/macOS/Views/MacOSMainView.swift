#if os(macOS)
//
//  MacOSMainView.swift
//  MirrorBuddy macOS
//
//  Main navigation structure with Liquid Glass sidebar
//  Three-column layout: Sidebar | Content | Detail (optional)
//

import SwiftUI
import SwiftData

/// Main navigation view for macOS with NavigationSplitView
struct MacOSMainView: View {
    @State private var selectedSection: SidebarSection = .materials
    @State private var columnVisibility = NavigationSplitViewVisibility.doubleColumn
    @StateObject private var windowManager = WindowManager.shared

    var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            // MARK: - Sidebar (220px, Liquid Glass)
            MacOSSidebarView(selectedSection: $selectedSection)
                .frame(minWidth: 220, idealWidth: 220, maxWidth: 300)
                .navigationSplitViewColumnWidth(min: 220, ideal: 220, max: 300)
                .glassEffect(.regular) // ✨ Liquid Glass sidebar
                .toolbar {
                    ToolbarItem(placement: .navigation) {
                        Button(action: toggleSidebar) {
                            Label("Toggle Sidebar", systemImage: "sidebar.left")
                        }
                        .help("Toggle Sidebar (Cmd+Shift+L)")
                    }
                }
        } detail: {
            // MARK: - Content Area (flexible width)
            MacOSContentView(section: selectedSection)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .toolbar {
                    MacOSToolbar(selectedSection: selectedSection)
                }
        }
        .navigationSplitViewStyle(.balanced)
        .onReceive(NotificationCenter.default.publisher(for: .toggleSidebar)) { _ in
            toggleSidebar()
        }
    }

    private func toggleSidebar() {
        withAnimation(.smooth(duration: 0.3)) {
            columnVisibility = columnVisibility == .doubleColumn ? .detailOnly : .doubleColumn
        }
    }
}

// MARK: - Sidebar Section Enum
enum SidebarSection: String, CaseIterable, Identifiable {
    case materials = "Materiali"
    case study = "Studia"
    case tasks = "Compiti"
    case voice = "Voce"
    case settings = "Impostazioni"
    case statistics = "Statistiche"
    case help = "Aiuto"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .materials: return "books.vertical"
        case .study: return "brain.head.profile"
        case .tasks: return "checklist"
        case .voice: return "waveform"
        case .settings: return "gear"
        case .statistics: return "chart.bar"
        case .help: return "questionmark.circle"
        }
    }

    var keyboardShortcut: KeyEquivalent? {
        switch self {
        case .materials: return "1"
        case .study: return "2"
        case .tasks: return "3"
        case .voice: return "4"
        default: return nil
        }
    }
}

// MARK: - Preview
#Preview {
    MacOSMainView()
        .frame(width: 1200, height: 800)
        // .modelContainer(for: [Material.self, SubjectEntity.self]) // TODO: Add these models to macOS
}

#endif
