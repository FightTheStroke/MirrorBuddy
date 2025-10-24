#if os(macOS)
//
//  MacOSSidebarView.swift
//  MirrorBuddy macOS
//
//  Liquid Glass sidebar with navigation sections
//

import SwiftUI

struct MacOSSidebarView: View {
    @Binding var selectedSection: SidebarSection

    var body: some View {
        List(selection: $selectedSection) {
            // MARK: - Main Sections
            Section("Studia") {
                ForEach([SidebarSection.materials, .study, .tasks, .voice]) { section in
                    SidebarNavigationLink(section: section)
                }
            }

            // MARK: - Settings & Info
            Section("Altro") {
                ForEach([SidebarSection.statistics, .settings, .help]) { section in
                    SidebarNavigationLink(section: section)
                }
            }
        }
        .listStyle(.sidebar)
        .navigationTitle("MirrorBuddy")
        .frame(minWidth: 220)
        .background(.ultraThinMaterial) // macOS 26 auto-upgrades to Liquid Glass
    }
}

// MARK: - Helper Components
private struct SidebarNavigationLink: View {
    let section: SidebarSection

    var body: some View {
        NavigationLink(value: section) {
            Label {
                Text(section.rawValue)
                    .font(.openDyslexicBody)
            } icon: {
                Image(systemName: section.icon)
                    .font(.system(size: 18))
                    .symbolRenderingMode(.hierarchical)
            }
        }
        .help(section.rawValue)
        .applyKeyboardShortcut(section.keyboardShortcut)
    }
}

private extension View {
    @ViewBuilder
    func applyKeyboardShortcut(_ key: KeyEquivalent?) -> some View {
        if let key = key {
            self.keyboardShortcut(key, modifiers: [.command])
        } else {
            self
        }
    }
}

// MARK: - Preview
#Preview {
    MacOSSidebarView(selectedSection: .constant(.materials))
        .frame(width: 220, height: 600)
}

#endif
