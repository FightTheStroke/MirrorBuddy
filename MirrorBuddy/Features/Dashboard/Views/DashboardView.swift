//
//  DashboardView.swift
//  MirrorBuddy
//
//  Task 109: Extracted from MainTabView for better code organization
//  Main dashboard tab showing materials, quick actions, and context banner
//

import SwiftUI
import SwiftData

/// Main dashboard view for materials and quick actions (Task 109)
struct DashboardView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var voiceCommandHandler: AppVoiceCommandHandler
    @Query private var materials: [Material]
    @Query private var subjects: [SubjectEntity]
    @State private var showingImport = false
    @State private var selectedMaterial: Material?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Context Banner at the top (Task 102.1)
                ContextBannerView()

                ScrollView {
                    VStack(spacing: 20) {
                        // Big "Aggiornami" button - front and center
                        UpdateButtonView()
                            .padding(.top)

                        QuickActionsSection(showingImport: $showingImport)
                        MaterialsSection(
                            materials: materials,
                            subjects: subjects,
                            showingImport: $showingImport,
                            selectedMaterial: $selectedMaterial
                        )
                    }
                    .padding(.vertical)
                }
            }
            .navigationTitle("MirrorBuddy")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    CompactSyncStatusView()
                }

                ToolbarItem {
                    Button {
                        showingImport = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .buttonStyle(.icon(color: .blue, size: 48))
                    .accessibilityLabel("Aggiungi materiale")
                    .accessibilityHint("Tocca due volte per importare nuovo materiale")
                }
            }
            .sheet(isPresented: $showingImport) {
                MaterialImportView()
            }
            .sheet(item: $selectedMaterial) { material in
                MaterialDetailView(material: material)
            }
            // Task 112: Voice command material detail navigation
            .onChange(of: voiceCommandHandler.selectedMaterialID) { _, materialID in
                guard let materialID = materialID else { return }

                // Find material by ID (UUID string)
                if let material = materials.first(where: { $0.id.uuidString == materialID }) {
                    selectedMaterial = material
                    voiceCommandHandler.selectedMaterialID = nil // Reset flag
                }
            }
        }
    }
}

// MARK: - Quick Actions Section

/// Quick action cards for common tasks (Task 109)
struct QuickActionsSection: View {
    @Binding var showingImport: Bool
    @State private var showingScanner = false
    @State private var scannedMaterial: Material?
    @State private var showingVoiceConversation = false // Task 102.3

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Azioni rapide")
                .font(.headline)
                .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    QuickActionCard(
                        icon: "cloud.fill",
                        title: "Importa da Drive",
                        color: .blue
                    ) {
                        showingImport = true
                    }
                    .accessibilityLabelWithVoiceCommand("Importa materiali da Google Drive", voiceCommand: "importa materiale")

                    QuickActionCard(
                        icon: "doc.text.viewfinder",
                        title: "Scansiona",
                        color: .green
                    ) {
                        showingScanner = true
                    }
                    .accessibilityLabelWithVoiceCommand("Scansiona documento", voiceCommand: "fotografa")

                    QuickActionCard(
                        icon: "waveform",
                        title: "Lezione vocale",
                        color: .purple
                    ) {
                        // Launch voice conversation (Task 102.3)
                        showingVoiceConversation = true
                    }
                    .accessibilityLabelWithVoiceCommand("Avvia lezione vocale", voiceCommand: QuickActionVoiceCommands.voiceLesson)
                }
                .padding(.horizontal)
            }
        }
        .fullScreenCover(isPresented: $showingScanner) {
            DocumentScannerView { material in
                scannedMaterial = material
            }
            .ignoresSafeArea()
        }
        .sheet(item: $scannedMaterial) { material in
            MaterialDetailView(material: material)
        }
        .sheet(isPresented: $showingVoiceConversation) {
            // Task 102.3: Wire voice conversation integration
            NavigationStack {
                VoiceConversationView()
            }
        }
    }
}

// MARK: - Materials Section

/// Section displaying materials grouped by subject (Task 109)
struct MaterialsSection: View {
    let materials: [Material]
    let subjects: [SubjectEntity]
    @Binding var showingImport: Bool
    @Binding var selectedMaterial: Material?

    var body: some View {
        Group {
            if materials.isEmpty {
                emptyState
            } else {
                materialsList
            }
        }
    }

    private var emptyState: some View {
        ContentUnavailableView {
            Label("Nessun materiale", systemImage: "book.closed")
        } description: {
            Text("Importa materiali da Google Drive per iniziare")
        } actions: {
            Button {
                showingImport = true
            } label: {
                Label("Importa materiali", systemImage: "cloud.fill")
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(height: 300)
    }

    private var materialsList: some View {
        ForEach(subjects) { subject in
            SubjectMaterialsRow(
                subject: subject,
                materials: materials.filter { $0.subject?.id == subject.id },
                selectedMaterial: $selectedMaterial
            )
        }
    }
}

// MARK: - Subject Materials Row

/// Row displaying materials for a specific subject (Task 109)
struct SubjectMaterialsRow: View {
    let subject: SubjectEntity
    let materials: [Material]
    @Binding var selectedMaterial: Material?

    var body: some View {
        if !materials.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Label(subject.displayName, systemImage: subject.iconName)
                        .font(.headline)
                        .foregroundStyle(subject.color)

                    Spacer()

                    Text("\(materials.count)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(materials) { material in
                            MaterialCardView(material: material) {
                                selectedMaterial = material
                            }
                            .frame(width: 160, height: 200)
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
    }
}

// MARK: - Quick Action Card

/// Card view for quick action buttons (Task 109)
struct QuickActionCard: View {
    let icon: String
    let title: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 32))
                    .foregroundStyle(color)

                Text(title)
                    .font(.caption)
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.center)
            }
            .frame(width: 120, height: 100)
            .background(color.opacity(0.1))
            .cornerRadius(12)
        }
        .buttonStyle(.childFriendly)
        .accessibilityLabel(title)
        .accessibilityHint("Tocca due volte per aprire")
    }
}
