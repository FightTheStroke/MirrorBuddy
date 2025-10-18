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
                            FlashcardStudyView(material: material)
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
                            if let mindMap = material.mindMap {
                                InteractiveMindMapView(mindMap: mindMap)
                            }
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
                    NavigationStack {
                        FlashcardStudyView(material: material)
                    }
                } else if selectedStudyMode == .mindMap {
                    // Real InteractiveMindMapView
                    if let mindMap = material.mindMap {
                        NavigationStack {
                            InteractiveMindMapView(mindMap: mindMap)
                                .navigationTitle(material.title)
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
                        // Fallback if no mind map exists
                        NavigationStack {
                            ContentUnavailableView {
                                Label("Nessuna Mappa Mentale", systemImage: "brain.head.profile")
                            } description: {
                                Text("Questo materiale non ha ancora una mappa mentale")
                            }
                            .navigationTitle(material.title)
                            .navigationBarTitleDisplayMode(.inline)
                            .toolbar {
                                ToolbarItem(placement: .confirmationAction) {
                                    Button("Chiudi") {
                                        selectedMaterial = nil
                                    }
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
