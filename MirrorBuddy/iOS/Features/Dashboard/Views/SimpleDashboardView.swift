import SwiftUI
import SwiftData

/// ULTRA-SIMPLE Dashboard - Complete UI Redesign
/// User feedback: "la UI fa ancora cagare" - rebuilding from scratch
///
/// Design Principles:
/// 1. EXTREME SIMPLICITY - One thing at a time
/// 2. CLEAR STATE - Always show what's happening
/// 3. BIG OBVIOUS BUTTONS - No hunting for actions
/// 4. IMMEDIATE FEEDBACK - No silent operations
struct SimpleDashboardView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var materials: [Material]

    @State private var showingImport = false
    @State private var selectedMaterial: Material?

    // Processing materials (real-time)
    private var processingMaterials: [Material] {
        materials.filter { $0.processingStatus == .processing }
    }

    // Ready materials (completed and has content)
    private var readyMaterials: [Material] {
        materials.filter {
            $0.processingStatus == .completed &&
            ($0.mindMap != nil || !($0.flashcards?.isEmpty ?? true))
        }
    }

    // Failed materials
    private var failedMaterials: [Material] {
        materials.filter { $0.processingStatus == .failed }
    }

    // Pending materials (waiting to process)
    private var pendingMaterials: [Material] {
        materials.filter { $0.processingStatus == .pending }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                // Background
                Color(.systemGroupedBackground)
                    .ignoresSafeArea()

                if materials.isEmpty {
                    emptyState
                } else {
                    ScrollView {
                        VStack(spacing: 24) {
                            // SECTION 1: What's Happening NOW
                            if !processingMaterials.isEmpty {
                                processingSection
                            }

                            // SECTION 2: Failed (if any)
                            if !failedMaterials.isEmpty {
                                failedSection
                            }

                            // SECTION 3: Ready to Study
                            if !readyMaterials.isEmpty {
                                readySection
                            }

                            // SECTION 4: Waiting (if any)
                            if !pendingMaterials.isEmpty {
                                pendingSection
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("MirrorBuddy")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showingImport = true
                    } label: {
                        Label("Importa", systemImage: "plus.circle.fill")
                            .font(.title3)
                            .fontWeight(.semibold)
                    }
                }
            }
            .sheet(isPresented: $showingImport) {
                MaterialImportView()
            }
            .sheet(item: $selectedMaterial) { material in
                MaterialDetailView(material: material)
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 32) {
            Spacer()

            Image(systemName: "book.closed.fill")
                .font(.system(size: 80))
                .foregroundStyle(.gray.opacity(0.3))

            VStack(spacing: 12) {
                Text("Nessun Materiale")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Importa documenti da Google Drive per iniziare")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            Button {
                showingImport = true
            } label: {
                Label("Importa Materiale", systemImage: "plus.circle.fill")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(16)
            }
            .padding(.horizontal, 40)

            Spacer()
        }
    }

    // MARK: - Processing Section

    private var processingSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "gearshape.2.fill")
                    .font(.title2)
                    .foregroundStyle(.blue)
                    .symbolEffect(.pulse)

                Text("IN ELABORAZIONE")
                    .font(.headline)
                    .fontWeight(.bold)

                Spacer()

                Text("\(processingMaterials.count)")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(.blue)
            }

            ForEach(processingMaterials) { material in
                ProcessingMaterialCard(material: material)
            }
        }
        .padding()
        .background(Color.blue.opacity(0.05))
        .cornerRadius(20)
    }

    // MARK: - Failed Section

    private var failedSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.title2)
                    .foregroundStyle(.red)

                Text("ERRORI")
                    .font(.headline)
                    .fontWeight(.bold)

                Spacer()

                Text("\(failedMaterials.count)")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(.red)
            }

            ForEach(failedMaterials) { material in
                FailedMaterialCard(material: material)
            }
        }
        .padding()
        .background(Color.red.opacity(0.05))
        .cornerRadius(20)
    }

    // MARK: - Ready Section

    private var readySection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title2)
                    .foregroundStyle(.green)

                Text("PRONTI DA STUDIARE")
                    .font(.headline)
                    .fontWeight(.bold)

                Spacer()

                Text("\(readyMaterials.count)")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(.green)
            }

            ForEach(readyMaterials) { material in
                Button {
                    selectedMaterial = material
                } label: {
                    ReadyMaterialCard(material: material)
                }
                .buttonStyle(.plain)
            }
        }
        .padding()
        .background(Color.green.opacity(0.05))
        .cornerRadius(20)
    }

    // MARK: - Pending Section

    private var pendingSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "clock.fill")
                    .font(.title2)
                    .foregroundStyle(.orange)

                Text("IN ATTESA")
                    .font(.headline)
                    .fontWeight(.bold)

                Spacer()

                Text("\(pendingMaterials.count)")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(.orange)
            }

            ForEach(pendingMaterials) { material in
                PendingMaterialCard(material: material)
            }
        }
        .padding()
        .background(Color.orange.opacity(0.05))
        .cornerRadius(20)
    }
}

// MARK: - Material Cards

struct ProcessingMaterialCard: View {
    let material: Material

    var body: some View {
        HStack(spacing: 16) {
            ProgressView()
                .controlSize(.large)
                .tint(.blue)

            VStack(alignment: .leading, spacing: 4) {
                Text(material.title)
                    .font(.body)
                    .fontWeight(.semibold)
                    .lineLimit(2)

                Text("Generazione mappe e flashcards...")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
}

struct FailedMaterialCard: View {
    let material: Material

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: "xmark.circle.fill")
                .font(.title)
                .foregroundStyle(.red)

            VStack(alignment: .leading, spacing: 4) {
                Text(material.title)
                    .font(.body)
                    .fontWeight(.semibold)
                    .lineLimit(2)

                Text("Elaborazione fallita - verifica connessione")
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
}

struct ReadyMaterialCard: View {
    let material: Material

    private var hasContent: String {
        var items: [String] = []
        if material.mindMap != nil {
            items.append("Mappa")
        }
        if !(material.flashcards?.isEmpty ?? true) {
            items.append("\(material.flashcards?.count ?? 0) Cards")
        }
        return items.joined(separator: " • ")
    }

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: "brain.head.profile")
                .font(.title)
                .foregroundStyle(.green)

            VStack(alignment: .leading, spacing: 4) {
                Text(material.title)
                    .font(.body)
                    .fontWeight(.semibold)
                    .lineLimit(2)
                    .foregroundStyle(.primary)

                Text(hasContent)
                    .font(.caption)
                    .foregroundStyle(.green)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
}

struct PendingMaterialCard: View {
    let material: Material

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: "doc.fill")
                .font(.title)
                .foregroundStyle(.orange)

            VStack(alignment: .leading, spacing: 4) {
                Text(material.title)
                    .font(.body)
                    .fontWeight(.semibold)
                    .lineLimit(2)

                Text("In attesa di elaborazione")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
}

#Preview("Empty") {
    SimpleDashboardView()
        .modelContainer(for: Material.self, inMemory: true)
}

#Preview("With Content") {
    let container = try! ModelContainer(for: Material.self, configurations: ModelConfiguration(isStoredInMemoryOnly: true))

    // Processing material
    let processing = Material(title: "Fotosintesi Clorofilliana", subject: nil)
    processing.processingStatus = .processing
    container.mainContext.insert(processing)

    // Ready material
    let ready = Material(title: "Storia della Rivoluzione Francese", subject: nil)
    ready.processingStatus = .completed
    container.mainContext.insert(ready)

    // Failed material
    let failed = Material(title: "Matematica - Equazioni", subject: nil)
    failed.processingStatus = .failed
    container.mainContext.insert(failed)

    // Pending material
    let pending = Material(title: "Geografia dell'Europa", subject: nil)
    pending.processingStatus = .pending
    container.mainContext.insert(pending)

    return SimpleDashboardView()
        .modelContainer(container)
}
