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
                        Label(
                            String(localized: "materials.empty.title"),
                            systemImage: "book.closed"
                        )
                    } description: {
                        Text("materials.empty.description")
                    }
                } else {
                    ForEach(materials) { material in
                        NavigationLink {
                            Text("\(String(localized: "materials.detail.prefix")) \(material.title)")
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(material.title)
                                    .font(.headline)
                                Text(material.subject.localizedName)
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
            .navigationTitle("dashboard.title")
            .toolbar {
                ToolbarItem {
                    Button(action: addSampleMaterial) {
                        Label("materials.add.sample", systemImage: "plus")
                    }
                    .accessibilityLabel("materials.add.accessibility")
                    .accessibilityHint("materials.add.hint")
                }
            }
        } detail: {
            ContentUnavailableView {
                Label(
                    String(localized: "materials.select.title"),
                    systemImage: "book"
                )
            } description: {
                Text("materials.select.description")
            }
        }
    }

    private func addSampleMaterial() {
        withAnimation {
            let sample = Material(
                title: String(localized: "materials.sample.title"),
                subject: .matematica
            )
            modelContext.insert(sample)
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: Material.self, inMemory: true)
}
