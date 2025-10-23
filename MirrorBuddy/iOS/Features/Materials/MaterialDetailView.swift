import PDFKit
import SwiftData
import SwiftUI

/// Material detail view with comprehensive features (Task 28, refactored in Task 108)
/// Simplified vertical layout with collapsible sections for better accessibility
struct MaterialDetailView: View {
    @Bindable var material: Material
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var showShareSheet = false
    @State private var isProcessing = false

    // Task 108: Collapsible section states (default all expanded for discoverability)
    @State private var isOverviewExpanded = true
    @State private var isMindMapExpanded = true
    @State private var isFlashcardsExpanded = true
    @State private var isSummaryExpanded = true

    var body: some View {
        NavigationStack {
            ScrollView {
                // Task 108: Vertical layout with collapsible sections
                // Eliminates cognitive load of tab switching for users with learning disabilities
                LazyVStack(spacing: 20, pinnedViews: []) {
                    // Header with quick actions (Subtask 28.1)
                    headerSection
                        .padding(.bottom, 8)

                    // Task 108: Collapsible sections replace tab navigation
                    // All content visible in single scrollable view

                    // Section 1: Overview (always visible, contains primary content)
                    DisclosureGroup(
                        isExpanded: $isOverviewExpanded,
                        content: { overviewContent.padding(.top, 12) },
                        label: {
                            SectionHeaderLabel(
                                icon: "book.fill",
                                title: "Panoramica",
                                color: .blue
                            )
                        }
                    )
                    .accessibilityLabel("Sezione Panoramica, \(isOverviewExpanded ? "espansa" : "compressa")")
                    .accessibilityHint("Doppio tap per \(isOverviewExpanded ? "comprimere" : "espandere")")

                    Divider()

                    // Section 2: Mind Map
                    DisclosureGroup(
                        isExpanded: $isMindMapExpanded,
                        content: { mindMapContent.padding(.top, 12) },
                        label: {
                            SectionHeaderLabel(
                                icon: "brain.head.profile",
                                title: "Mappa Mentale",
                                color: .purple
                            )
                        }
                    )
                    .accessibilityLabel("Sezione Mappa Mentale, \(isMindMapExpanded ? "espansa" : "compressa")")
                    .accessibilityHint("Doppio tap per \(isMindMapExpanded ? "comprimere" : "espandere")")

                    Divider()

                    // Section 3: Flashcards
                    DisclosureGroup(
                        isExpanded: $isFlashcardsExpanded,
                        content: { flashcardsContent.padding(.top, 12) },
                        label: {
                            SectionHeaderLabel(
                                icon: "rectangle.portrait.on.rectangle.portrait.fill",
                                title: "Flashcard",
                                color: .orange
                            )
                        }
                    )
                    .accessibilityLabel("Sezione Flashcard, \(isFlashcardsExpanded ? "espansa" : "compressa")")
                    .accessibilityHint("Doppio tap per \(isFlashcardsExpanded ? "comprimere" : "espandere")")

                    Divider()

                    // Section 4: Summary
                    DisclosureGroup(
                        isExpanded: $isSummaryExpanded,
                        content: { summaryContent.padding(.top, 12) },
                        label: {
                            SectionHeaderLabel(
                                icon: "doc.text.fill",
                                title: "Riassunto",
                                color: .green
                            )
                        }
                    )
                    .accessibilityLabel("Sezione Riassunto, \(isSummaryExpanded ? "espansa" : "compressa")")
                    .accessibilityHint("Doppio tap per \(isSummaryExpanded ? "comprimere" : "espandere")")
                }
                .padding()
            }
            .navigationTitle(material.title)
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    shareButton
                }
            }
            .sheet(isPresented: $showShareSheet) {
                shareSheet
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Dettagli materiale: \(material.title)")
    }

    // MARK: - Header Section (Subtask 28.1)

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Subject badge
            if let subject = material.subject {
                HStack {
                    Circle()
                        .fill(subject.color)
                        .frame(width: 12, height: 12)

                    Text(subject.displayName)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            // Task 108: Quick action buttons now expand/collapse sections
            HStack(spacing: 12) {
                QuickActionButton(
                    icon: "book.fill",
                    title: "Panoramica",
                    color: .blue
                ) {
                    withAnimation { isOverviewExpanded.toggle() }
                }

                QuickActionButton(
                    icon: "brain.head.profile",
                    title: "Mappa",
                    color: .purple
                ) {
                    withAnimation { isMindMapExpanded.toggle() }
                }

                QuickActionButton(
                    icon: "rectangle.portrait.on.rectangle.portrait.fill",
                    title: "Flashcard",
                    color: .orange
                ) {
                    withAnimation { isFlashcardsExpanded.toggle() }
                }

                QuickActionButton(
                    icon: "doc.text.fill",
                    title: "Riassunto",
                    color: .green
                ) {
                    withAnimation { isSummaryExpanded.toggle() }
                }
            }

            // Processing status
            if material.processingStatus == .processing {
                ProgressView("Elaborazione in corso...")
                    .font(.caption)
            }
        }
    }

    // Task 108: Tab selector removed - replaced with collapsible sections

    // MARK: - Overview Content (Subtask 28.2)

    @ViewBuilder
    private var overviewContent: some View {
        VStack(alignment: .leading, spacing: 20) {
            // PDF preview or text content
            if let pdfURL = material.pdfURL {
                PDFPreviewSection(url: pdfURL)
            } else if let textContent = material.textContent {
                TextContentSection(text: textContent)
            }

            // Statistics
            StatisticsSection(material: material)

            // Metadata
            MetadataSection(material: material)
        }
    }

    // MARK: - Mind Map Content (Subtask 28.2)

    @ViewBuilder
    private var mindMapContent: some View {
        if let mindMap = material.mindMap {
            VStack(alignment: .leading, spacing: 16) {
                Text("Mappa Mentale")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("\(mindMap.nodesArray.count) nodi")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                // Preview of first few nodes
                ForEach(mindMap.nodesArray.prefix(5)) { node in
                    NodePreviewCard(node: node)
                }

                // View full mind map button
                NavigationLink {
                    // InteractiveMindMapView here
                    Text("Vista completa mappa mentale")
                } label: {
                    Label("Visualizza Mappa Completa", systemImage: "arrow.right.circle.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundStyle(.white)
                        .cornerRadius(12)
                }
            }
        } else {
            EmptyStateView(
                icon: "brain.head.profile",
                title: "Nessuna Mappa Mentale",
                message: "Genera una mappa mentale per questo materiale",
                actionTitle: "Genera Mappa"
            ) { generateMindMap() }
        }
    }

    // MARK: - Flashcards Content (Subtask 28.2)

    @ViewBuilder
    private var flashcardsContent: some View {
        let flashcards = getFlashcards()

        if !flashcards.isEmpty {
            VStack(alignment: .leading, spacing: 16) {
                Text("Flashcard")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("\(flashcards.count) flashcard disponibili")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                // Preview of first few flashcards
                ForEach(flashcards.prefix(3)) { flashcard in
                    FlashcardPreviewCard(flashcard: flashcard)
                }

                // Study flashcards button
                NavigationLink {
                    Text("Vista studio flashcard")
                } label: {
                    Label("Inizia Studio", systemImage: "play.circle.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.orange)
                        .foregroundStyle(.white)
                        .cornerRadius(12)
                }
            }
        } else {
            EmptyStateView(
                icon: "rectangle.portrait.on.rectangle.portrait.fill",
                title: "Nessuna Flashcard",
                message: "Genera flashcard per questo materiale",
                actionTitle: "Genera Flashcard"
            ) { generateFlashcards() }
        }
    }

    // MARK: - Summary Content (Subtask 28.2)

    @ViewBuilder
    private var summaryContent: some View {
        if let summary = material.summary {
            VStack(alignment: .leading, spacing: 16) {
                Text("Riassunto")
                    .font(.title2)
                    .fontWeight(.bold)

                Text(summary)
                    .font(.body)
                    .lineSpacing(8)

                // Text-to-speech controls (Task 73.3)
                TTSCompactControlsView(text: summary) {
                    TextToSpeechService.shared.speak(summary)
                }
            }
        } else {
            EmptyStateView(
                icon: "doc.text.fill",
                title: "Nessun Riassunto",
                message: "Genera un riassunto per questo materiale",
                actionTitle: "Genera Riassunto"
            ) { generateSummary() }
        }
    }

    // MARK: - Share Button (Subtask 28.3)

    private var shareButton: some View {
        Button {
            showShareSheet = true
        } label: {
            Image(systemName: "square.and.arrow.up")
                .font(.headline)
                .frame(width: 44, height: 44)
        }
        .accessibilityLabel("Condividi materiale")
    }

    @ViewBuilder
    private var shareSheet: some View {
        if let pdfURL = material.pdfURL {
            MaterialShareSheet(items: [pdfURL])
        } else if let textContent = material.textContent {
            MaterialShareSheet(items: [textContent])
        }
    }

    // MARK: - Actions

    private func getFlashcards() -> [Flashcard] {
        let materialID = material.id
        let descriptor = FetchDescriptor<Flashcard>(
            predicate: #Predicate { flashcard in
                flashcard.materialID == materialID
            }
        )
        return (try? modelContext.fetch(descriptor)) ?? []
    }

    private func generateMindMap() {
        isProcessing = true
        _Concurrency.Task {
            do {
                _ = try await MindMapGenerationService.shared.generateMindMap(
                    from: material.textContent ?? material.title,
                    materialID: material.id
                )
                isProcessing = false
            } catch {
                isProcessing = false
            }
        }
    }

    private func generateFlashcards() {
        isProcessing = true
        _Concurrency.Task {
            do {
                _ = try await FlashcardGenerationService.shared.generateFlashcards(
                    from: material.textContent ?? material.title,
                    materialID: material.id
                )
                isProcessing = false
            } catch {
                isProcessing = false
            }
        }
    }

    private func generateSummary() {
        isProcessing = true
        _Concurrency.Task {
            do {
                _ = try await SummaryGenerationService.shared.generateSummary(
                    for: material.textContent ?? material.title
                )
                isProcessing = false
            } catch {
                isProcessing = false
            }
        }
    }
}

// MARK: - Supporting Views

struct QuickActionButton: View {
    let icon: String
    let title: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                Text(title)
                    .font(.caption)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 80)
            .background(color.opacity(0.1))
            .foregroundStyle(color)
            .cornerRadius(12)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(title)
        .accessibilityAddTraits(.isButton)
    }
}

struct TabButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.blue : Color.gray.opacity(0.1))
                .foregroundStyle(isSelected ? .white : .primary)
                .cornerRadius(20)
        }
    }
}

struct PDFPreviewSection: View {
    let url: URL

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Documento PDF")
                .font(.headline)

            // PDF preview placeholder
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.gray.opacity(0.1))
                .frame(height: 200)
                .overlay(
                    VStack {
                        Image(systemName: "doc.fill")
                            .font(.system(size: 60))
                            .foregroundStyle(.secondary)
                        Text("Anteprima PDF")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                )
        }
    }
}

struct TextContentSection: View {
    let text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Contenuto")
                .font(.headline)

            Text(text)
                .font(.body)
                .lineLimit(10)
                .lineSpacing(4)
        }
    }
}

struct StatisticsSection: View {
    let material: Material

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Statistiche")
                .font(.headline)

            HStack(spacing: 20) {
                StatItem(icon: "clock", value: "0h", label: "Tempo Studio")
                StatItem(icon: "checkmark.circle", value: "0", label: "Completato")
                StatItem(icon: "flame.fill", value: "0", label: "Streak")
            }
        }
    }
}

struct StatItem: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3)
            Text(value)
                .font(.headline)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct MetadataSection: View {
    let material: Material

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Informazioni")
                .font(.headline)

            MetadataRow(label: "Creato", value: material.createdAt.formatted(date: .abbreviated, time: .shortened))

            if let lastAccessed = material.lastAccessedAt {
                MetadataRow(label: "Ultimo accesso", value: lastAccessed.formatted(date: .abbreviated, time: .shortened))
            }
        }
    }
}

struct MetadataRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.subheadline)
        }
    }
}

struct NodePreviewCard: View {
    let node: MindMapNode

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(node.title)
                .font(.headline)

            if let content = node.content {
                Text(content)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.gray.opacity(0.05))
        .cornerRadius(12)
    }
}

struct FlashcardPreviewCard: View {
    let flashcard: Flashcard

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(flashcard.question)
                .font(.headline)

            Text(flashcard.answer)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.orange.opacity(0.05))
        .cornerRadius(12)
    }
}

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    let actionTitle: String
    let action: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: icon)
                .font(.system(size: 60))
                .foregroundStyle(.secondary)

            VStack(spacing: 8) {
                Text(title)
                    .font(.headline)
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            Button(action: action) {
                Text(actionTitle)
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundStyle(.white)
                    .cornerRadius(12)
            }
        }
        .padding()
    }
}

struct MaterialShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// MARK: - Helper Extension

extension Color {
    init?(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            return nil
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Section Header Label (Task 108)

/// Section header label for collapsible sections
struct SectionHeaderLabel: View {
    let icon: String
    let title: String
    let color: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)
                .frame(width: 32)

            Text(title)
                .font(.title3)
                .fontWeight(.semibold)

            Spacer()
        }
        .padding(.vertical, 8)
        .contentShape(Rectangle())
    }
}
