import SwiftData
import SwiftUI

/// View for exporting mind maps and summaries
struct MindMapExportView: View {
    let mindMap: MindMap

    @Environment(\.dismiss) private var dismiss
    @StateObject private var exportService = KnowledgeExportService()

    @State private var selectedFormat: ExportFormat = .pdf
    @State private var isExporting = false
    @State private var exportedURL: URL?
    @State private var showingShareSheet = false
    @State private var errorMessage: String?

    // Notion settings
    @State private var notionToken = ""
    @State private var notionParentPageID = ""
    @State private var showingNotionSetup = false

    enum ExportFormat: String, CaseIterable {
        case pdf = "PDF"
        case markdown = "Markdown"
        case notion = "Notion"

        var icon: String {
            switch self {
            case .pdf: return "doc.fill"
            case .markdown: return "doc.text.fill"
            case .notion: return "link.circle.fill"
            }
        }

        var description: String {
            switch self {
            case .pdf: return "Export as a formatted PDF document"
            case .markdown: return "Export as plain Markdown text"
            case .notion: return "Send directly to your Notion workspace"
            }
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("Export \"\(mindMap.material?.title ?? "Mind Map")\" to share or save your knowledge.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Section("Export Format") {
                    ForEach(ExportFormat.allCases, id: \.self) { format in
                        Button(action: { selectedFormat = format }) {
                            HStack {
                                Image(systemName: format.icon)
                                    .foregroundColor(.blue)
                                    .frame(width: 30)

                                VStack(alignment: .leading, spacing: 4) {
                                    Text(format.rawValue)
                                        .font(.headline)
                                        .foregroundColor(.primary)
                                    Text(format.description)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }

                                Spacer()

                                if selectedFormat == format {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.blue)
                                }
                            }
                        }
                    }
                }

                if selectedFormat == .notion {
                    Section("Notion Settings") {
                        Button(action: { showingNotionSetup = true }) {
                            HStack {
                                Text("Configure Notion Integration")
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .foregroundColor(.secondary)
                            }
                        }

                        if !notionToken.isEmpty {
                            Label("Notion configured", systemImage: "checkmark.circle.fill")
                                .foregroundColor(.green)
                        }
                    }
                }

                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }

                Section {
                    Button(action: performExport) {
                        HStack {
                            Spacer()
                            if isExporting {
                                ProgressView()
                                    .padding(.trailing, 8)
                            }
                            Text(isExporting ? "Exporting..." : "Export Now")
                                .bold()
                            Spacer()
                        }
                    }
                    .disabled(isExporting || (selectedFormat == .notion && notionToken.isEmpty))
                }
            }
            .navigationTitle("Export Mind Map")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showingShareSheet) {
                if let url = exportedURL {
                    MindMapShareSheet(items: [url])
                }
            }
            .sheet(isPresented: $showingNotionSetup) {
                NotionSetupView(
                    token: $notionToken,
                    parentPageID: $notionParentPageID
                )
            }
        }
    }

    private func performExport() {
        isExporting = true
        errorMessage = nil

        _Concurrency.Task {
            do {
                switch selectedFormat {
                case .pdf:
                    let url = try exportService.exportMindMapToPDF(mindMap: mindMap)
                    await MainActor.run {
                        exportedURL = url
                        showingShareSheet = true
                        isExporting = false
                    }

                case .markdown:
                    let markdown = exportService.exportMindMapToMarkdown(mindMap: mindMap)
                    let url = try saveMarkdownToFile(markdown: markdown)
                    await MainActor.run {
                        exportedURL = url
                        showingShareSheet = true
                        isExporting = false
                    }

                case .notion:
                    let notionJSON = exportService.exportMindMapToNotionJSON(mindMap: mindMap)
                    let pageID = try await exportService.sendToNotion(
                        notionJSON: notionJSON,
                        notionToken: notionToken,
                        parentPageID: notionParentPageID
                    )
                    await MainActor.run {
                        isExporting = false
                        errorMessage = "Successfully exported to Notion! Page ID: \(pageID)"
                        dismiss()
                    }
                }
            } catch {
                await MainActor.run {
                    isExporting = false
                    errorMessage = "Export failed: \(error.localizedDescription)"
                }
            }
        }
    }

    private func saveMarkdownToFile(markdown: String) throws -> URL {
        let filename = "mindmap_\(mindMap.id.uuidString).md"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        try markdown.write(to: url, atomically: true, encoding: .utf8)
        return url
    }
}

// MARK: - Summary Export View

struct SummaryExportView: View {
    let material: Material
    let summary: String

    @Environment(\.dismiss) private var dismiss
    @StateObject private var exportService = KnowledgeExportService()

    @State private var selectedFormat: MindMapExportView.ExportFormat = .pdf
    @State private var isExporting = false
    @State private var exportedURL: URL?
    @State private var showingShareSheet = false
    @State private var errorMessage: String?

    @State private var notionToken = ""
    @State private var notionParentPageID = ""
    @State private var showingNotionSetup = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("Export summary of \"\(material.title)\"")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Section("Export Format") {
                    ForEach(MindMapExportView.ExportFormat.allCases, id: \.self) { format in
                        Button(action: { selectedFormat = format }) {
                            HStack {
                                Image(systemName: format.icon)
                                    .foregroundColor(.blue)
                                    .frame(width: 30)

                                VStack(alignment: .leading, spacing: 4) {
                                    Text(format.rawValue)
                                        .font(.headline)
                                        .foregroundColor(.primary)
                                    Text(format.description)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }

                                Spacer()

                                if selectedFormat == format {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.blue)
                                }
                            }
                        }
                    }
                }

                if selectedFormat == .notion {
                    Section("Notion Settings") {
                        Button(action: { showingNotionSetup = true }) {
                            HStack {
                                Text("Configure Notion Integration")
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .foregroundColor(.secondary)
                            }
                        }

                        if !notionToken.isEmpty {
                            Label("Notion configured", systemImage: "checkmark.circle.fill")
                                .foregroundColor(.green)
                        }
                    }
                }

                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }

                Section {
                    Button(action: performExport) {
                        HStack {
                            Spacer()
                            if isExporting {
                                ProgressView()
                                    .padding(.trailing, 8)
                            }
                            Text(isExporting ? "Exporting..." : "Export Now")
                                .bold()
                            Spacer()
                        }
                    }
                    .disabled(isExporting || (selectedFormat == .notion && notionToken.isEmpty))
                }
            }
            .navigationTitle("Export Summary")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showingShareSheet) {
                if let url = exportedURL {
                    MindMapShareSheet(items: [url])
                }
            }
            .sheet(isPresented: $showingNotionSetup) {
                NotionSetupView(
                    token: $notionToken,
                    parentPageID: $notionParentPageID
                )
            }
        }
    }

    private func performExport() {
        isExporting = true
        errorMessage = nil

        _Concurrency.Task {
            do {
                switch selectedFormat {
                case .pdf:
                    let url = try exportService.exportSummaryToPDF(material: material, summary: summary)
                    await MainActor.run {
                        exportedURL = url
                        showingShareSheet = true
                        isExporting = false
                    }

                case .markdown:
                    let markdown = exportService.exportSummaryToMarkdown(material: material, summary: summary)
                    let url = try saveMarkdownToFile(markdown: markdown)
                    await MainActor.run {
                        exportedURL = url
                        showingShareSheet = true
                        isExporting = false
                    }

                case .notion:
                    let notionJSON = exportService.exportSummaryToNotionJSON(material: material, summary: summary)
                    let pageID = try await exportService.sendToNotion(
                        notionJSON: notionJSON,
                        notionToken: notionToken,
                        parentPageID: notionParentPageID
                    )
                    await MainActor.run {
                        isExporting = false
                        errorMessage = "Successfully exported to Notion! Page ID: \(pageID)"
                        dismiss()
                    }
                }
            } catch {
                await MainActor.run {
                    isExporting = false
                    errorMessage = "Export failed: \(error.localizedDescription)"
                }
            }
        }
    }

    private func saveMarkdownToFile(markdown: String) throws -> URL {
        let filename = "summary_\(material.id.uuidString).md"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        try markdown.write(to: url, atomically: true, encoding: .utf8)
        return url
    }
}

// MARK: - Notion Setup View

struct NotionSetupView: View {
    @Binding var token: String
    @Binding var parentPageID: String

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("To export to Notion, you need an integration token and a parent page ID.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Section("Notion Integration Token") {
                    SecureField("secret_xxx...", text: $token)
                        .textContentType(.password)

                    if let notionURL = URL(string: "https://www.notion.so/my-integrations") {
                        Link(destination: notionURL) {
                            Label("Create integration token", systemImage: "arrow.up.right.square")
                                .font(.caption)
                        }
                    }
                }

                Section("Parent Page ID") {
                    TextField("xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", text: $parentPageID)
                        .autocapitalization(.none)

                    Text("The ID of the Notion page where exports will be added as sub-pages.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Section {
                    if let docsURL = URL(string: "https://developers.notion.com/docs/create-a-notion-integration") {
                        Link(destination: docsURL) {
                            Label("Learn more about Notion integrations", systemImage: "book.fill")
                        }
                    }
                }
            }
            .navigationTitle("Notion Setup")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                    .disabled(token.isEmpty || parentPageID.isEmpty)
                }
            }
        }
    }
}

// MARK: - Share Sheet

struct MindMapShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

#Preview {
    let config = ModelConfiguration(isStoredInMemoryOnly: true)
    guard let container = try? ModelContainer(for: MindMap.self, configurations: config) else {
        return Text("Preview unavailable")
    }

    let mindMap = MindMap(materialID: UUID())
    container.mainContext.insert(mindMap)

    return MindMapExportView(mindMap: mindMap)
        .modelContainer(container)
}
