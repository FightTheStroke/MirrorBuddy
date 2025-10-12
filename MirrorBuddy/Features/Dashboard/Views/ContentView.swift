//
//  ContentView.swift
//  MirrorBuddy
//
//  Created by Mario D'Angelo on 12/10/25.
//

import SwiftData
import SwiftUI

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var materials: [Material]

    var body: some View {
        NavigationSplitView {
            List {
                if materials.isEmpty {
                    ContentUnavailableView {
                        Label("No Materials Yet", systemImage: "book.closed")
                    } description: {
                        Text("Materials from Google Drive will appear here")
                    }
                } else {
                    ForEach(materials) { material in
                        NavigationLink {
                            Text("Material: \(material.title)")
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(material.title)
                                    .font(.headline)
                                Text(material.subject.rawValue)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
#if os(macOS)
            .navigationSplitViewColumnWidth(min: 180, ideal: 200)
#endif
            .navigationTitle("MirrorBuddy")
            .toolbar {
                ToolbarItem {
                    Button(action: addSampleMaterial) {
                        Label("Add Sample", systemImage: "plus")
                    }
                    .accessibilityLabel("Add sample material")
                    .accessibilityHint("Double tap to create a sample material")
                }
            }
        } detail: {
            ContentUnavailableView {
                Label("Select a Material", systemImage: "book")
            } description: {
                Text("Choose a material to view details, mind maps, and flashcards")
            }
        }
    }

    private func addSampleMaterial() {
        withAnimation {
            let sample = Material(
                title: "Sample Material",
                subject: .mathematics
            )
            modelContext.insert(sample)
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: Material.self, inMemory: true)
}
