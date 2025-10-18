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
    @EnvironmentObject var voiceCommandHandler: AppVoiceCommandHandler
    @Query private var materials: [Material]
    @State private var selectedMaterial: Material?
    @State private var selectedStudyMode: AppVoiceCommandHandler.StudyMode?

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
            // Task 111 follow-up: Consume studyMode for focused navigation
            .onChange(of: voiceCommandHandler.studyMode) { _, newMode in
                guard let mode = newMode else { return }

                selectedStudyMode = mode

                switch mode {
                case .flashcards:
                    // Auto-select first material with flashcards
                    if let firstFlashcardMaterial = materials.first(where: { !($0.flashcards?.isEmpty ?? true) }) {
                        selectedMaterial = firstFlashcardMaterial
                    }

                case .mindMap:
                    // Auto-select first material with mind map
                    if let firstMindMapMaterial = materials.first(where: { $0.mindMap != nil }) {
                        selectedMaterial = firstMindMapMaterial
                    }

                case .general:
                    // Show list view (no auto-selection)
                    break
                }

                // Reset studyMode after consumption
                voiceCommandHandler.studyMode = nil
            }
            .sheet(item: $selectedMaterial) { material in
                // Show appropriate study view based on mode
                if selectedStudyMode == .flashcards {
                    // TODO: Replace with FlashcardStudyView when implemented
                    NavigationStack {
                        VStack(spacing: 20) {
                            Image(systemName: "rectangle.portrait.on.rectangle.portrait")
                                .font(.system(size: 60))
                                .foregroundStyle(.blue)

                            Text("Ripasso Flashcard")
                                .font(.title)
                                .fontWeight(.bold)

                            Text(material.title)
                                .font(.headline)
                                .foregroundStyle(.secondary)

                            Text("\(material.flashcards?.count ?? 0) flashcard disponibili")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)

                            Spacer()
                        }
                        .padding()
                        .navigationTitle("Flashcard")
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbar {
                            ToolbarItem(placement: .confirmationAction) {
                                Button("Chiudi") {
                                    selectedMaterial = nil
                                }
                            }
                        }
                    }
                } else if selectedStudyMode == .mindMap {
                    // TODO: Replace with InteractiveMindMapView when ready
                    NavigationStack {
                        VStack(spacing: 20) {
                            Image(systemName: "brain.head.profile")
                                .font(.system(size: 60))
                                .foregroundStyle(.purple)

                            Text("Mappa Mentale")
                                .font(.title)
                                .fontWeight(.bold)

                            Text(material.title)
                                .font(.headline)
                                .foregroundStyle(.secondary)

                            Text("Vista mappa mentale interattiva")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)

                            Spacer()
                        }
                        .padding()
                        .navigationTitle("Mappa Mentale")
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbar {
                            ToolbarItem(placement: .confirmationAction) {
                                Button("Chiudi") {
                                    selectedMaterial = nil
                                }
                            }
                        }
                    }
                } else {
                    // General mode - show material detail
                    MaterialDetailView(material: material)
                }
            }
        }
    }
}
