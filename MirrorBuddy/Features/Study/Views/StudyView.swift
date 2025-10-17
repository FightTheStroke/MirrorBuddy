//
//  StudyView.swift
//  MirrorBuddy
//
//  Task 109: Extracted from MainTabView for better code organization
//  Study tab showing flashcards and mind maps
//

import SwiftUI
import SwiftData

/// Study view for flashcards and mind maps (Task 109)
struct StudyView: View {
    @Query private var materials: [Material]
    @State private var selectedMaterial: Material?

    var body: some View {
        NavigationStack {
            List {
                Section("Flashcard") {
                    ForEach(materials.filter { !($0.flashcards?.isEmpty ?? true) }) { material in
                        NavigationLink {
                            // TODO: FlashcardStudyView(material: material)
                            Text("Flashcard per \(material.title)")
                        } label: {
                            HStack {
                                Image(systemName: "rectangle.portrait.on.rectangle.portrait")
                                    .foregroundStyle(.blue)
                                VStack(alignment: .leading) {
                                    Text(material.title)
                                        .font(.headline)
                                    Text("\(material.flashcards?.count ?? 0) flashcard")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }

                Section("Mappe mentali") {
                    ForEach(materials.filter { $0.mindMap != nil }) { material in
                        NavigationLink {
                            // TODO: MindMapView(material: material)
                            Text("Mappa mentale per \(material.title)")
                        } label: {
                            HStack {
                                Image(systemName: "brain.head.profile")
                                    .foregroundStyle(.purple)
                                VStack(alignment: .leading) {
                                    Text(material.title)
                                        .font(.headline)
                                    Text("Mappa mentale")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Studia")
        }
    }
}
