//
//  MaterialImportView.swift
//  MirrorBuddy
//
//  View for importing materials from Google Drive
//

import SwiftUI
import SwiftData
import UniformTypeIdentifiers

struct MaterialImportView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @StateObject private var authViewModel = GoogleDriveAuthViewModel()
    @State private var isImporting = false
    @State private var selectedFiles: Set<String> = []
    @State private var availableFiles: [DriveFile] = []
    @State private var showError: String?
    @State private var showingFilePicker = false
    @State private var importSource: ImportSource = .googleDrive

    enum ImportSource {
        case googleDrive
        case fileSystem
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Source Picker
                Picker("Sorgente", selection: $importSource) {
                    Text("Google Drive").tag(ImportSource.googleDrive)
                    Text("File System").tag(ImportSource.fileSystem)
                }
                .pickerStyle(.segmented)
                .padding()

                // Content based on source
                Group {
                    if importSource == .fileSystem {
                        fileSystemView
                    } else if !authViewModel.isAuthenticated {
                    // Not authenticated - show connect button
                    ContentUnavailableView {
                        Label("Google Drive non connesso", systemImage: "xmark.icloud")
                    } description: {
                        Text("Connetti il tuo account Google Drive per importare materiali di studio")
                    } actions: {
                        NavigationLink {
                            GoogleDriveAuthView()
                        } label: {
                            Label("Connetti Google Drive", systemImage: "link")
                        }
                        .buttonStyle(.borderedProminent)
                    }
                } else if isImporting {
                    // Loading state
                    VStack(spacing: 20) {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .scaleEffect(1.5)

                        Text("Caricamento file da Google Drive...")
                            .font(.headline)
                            .foregroundStyle(.secondary)
                    }
                } else if availableFiles.isEmpty {
                    // No files found
                    ContentUnavailableView {
                        Label("Nessun file trovato", systemImage: "doc.questionmark")
                    } description: {
                        Text("Non sono stati trovati file PDF o documenti Google nel tuo Drive")
                    } actions: {
                        Button {
                            loadFiles()
                        } label: {
                            Label("Ricarica", systemImage: "arrow.clockwise")
                        }
                        .buttonStyle(.borderedProminent)
                    }
                } else {
                    // File list
                    List(availableFiles, id: \.id, selection: $selectedFiles) { file in
                        HStack {
                            Image(systemName: file.isPDF ? "doc.fill" : "doc.text.fill")
                                .foregroundStyle(file.isPDF ? .red : .blue)
                                .frame(width: 32)

                            VStack(alignment: .leading, spacing: 4) {
                                Text(file.name)
                                    .font(.headline)

                                if let sizeString = file.size, let sizeInt = Int64(sizeString) {
                                    Text(ByteCountFormatter.string(fromByteCount: sizeInt, countStyle: .file))
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }

                            Spacer()

                            if selectedFiles.contains(file.id) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(.blue)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture {
                            toggleSelection(file.id)
                        }
                    }
                }
            }
            }
            .navigationTitle(importSource == .googleDrive ? "Importa da Drive" : "Importa File")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annulla") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .primaryAction) {
                    Button("Importa (\(selectedFiles.count))") {
                        importSelectedFiles()
                    }
                    .disabled(selectedFiles.isEmpty)
                }
            }
            .alert("Errore", isPresented: .constant(showError != nil)) {
                Button("OK") {
                    showError = nil
                }
            } message: {
                if let error = showError {
                    Text(error)
                }
            }
        }
        .onAppear {
            _Concurrency.Task {
                await authViewModel.checkAuthenticationStatus()
                if authViewModel.isAuthenticated {
                    loadFiles()
                }
            }
        }
    }

    // MARK: - File System View
    private var fileSystemView: some View {
        ContentUnavailableView {
            Label("Seleziona File", systemImage: "doc.badge.plus")
        } description: {
            Text("Tocca il pulsante + per selezionare file PDF o documenti dal tuo dispositivo")
        } actions: {
            Button {
                showingFilePicker = true
            } label: {
                Label("Seleziona File", systemImage: "folder")
            }
            .buttonStyle(.borderedProminent)
        }
        .fileImporter(
            isPresented: $showingFilePicker,
            allowedContentTypes: [.pdf, .plainText, .rtf, .image],
            allowsMultipleSelection: true
        ) { result in
            handleFileSelection(result)
        }
    }

    private func toggleSelection(_ id: String) {
        if selectedFiles.contains(id) {
            selectedFiles.remove(id)
        } else {
            selectedFiles.insert(id)
        }
    }

    private func loadFiles() {
        isImporting = true

        _Concurrency.Task {
            do {
                // List files from Google Drive (PDFs and Google Docs)
                let response = try await GoogleDriveClient.shared.listFiles(query: "mimeType='application/pdf' or mimeType='application/vnd.google-apps.document'")
                await MainActor.run {
                    availableFiles = response.files
                    isImporting = false
                }
            } catch {
                await MainActor.run {
                    showError = "Errore nel caricamento dei file: \(error.localizedDescription)"
                    isImporting = false
                }
            }
        }
    }

    private func handleFileSelection(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            importLocalFiles(urls)
        case .failure(let error):
            showError = "Errore nella selezione dei file: \(error.localizedDescription)"
        }
    }

    private func importLocalFiles(_ urls: [URL]) {
        dismiss()

        _Concurrency.Task {
            for url in urls {
                // Access security-scoped resource
                guard url.startAccessingSecurityScopedResource() else {
                    continue
                }
                defer { url.stopAccessingSecurityScopedResource() }

                do {
                    // Copy file to app's Documents directory
                    let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
                    let fileName = url.lastPathComponent
                    let destinationURL = documentsPath.appendingPathComponent(fileName)

                    // Remove existing file if it exists
                    if FileManager.default.fileExists(atPath: destinationURL.path) {
                        try FileManager.default.removeItem(at: destinationURL)
                    }

                    // Copy the file
                    try FileManager.default.copyItem(at: url, to: destinationURL)

                    // Create Material entry
                    let material = Material(
                        title: fileName.replacingOccurrences(of: ".pdf", with: "").replacingOccurrences(of: ".txt", with: ""),
                        subject: nil
                    )
                    material.pdfURL = destinationURL

                    await MainActor.run {
                        modelContext.insert(material)
                        try? modelContext.save()
                    }
                } catch {
                    print("Error importing local file \(url.lastPathComponent): \(error)")
                }
            }
        }
    }

    private func importSelectedFiles() {
        dismiss()

        // Start import process in background
        _Concurrency.Task {
            for fileID in selectedFiles {
                guard let file = availableFiles.first(where: { $0.id == fileID }) else {
                    continue
                }

                do {
                    // Download and process file
                    let localURL = try await GoogleDriveDownloadService.shared.downloadFile(fileId: file.id)

                    // Create Material entry
                    let material = Material(
                        title: file.name.replacingOccurrences(of: ".pdf", with: ""),
                        subject: nil  // User can assign later
                    )
                    material.googleDriveFileID = file.id
                    material.pdfURL = localURL

                    await MainActor.run {
                        modelContext.insert(material)
                        try? modelContext.save()
                    }

                    // Queue for processing (extract text, generate mind map, flashcards)
                    // This will be handled by background processing pipeline
                } catch {
                    print("Error importing file \(file.name): \(error)")
                }
            }
        }
    }
}

#Preview {
    MaterialImportView()
        .modelContainer(for: Material.self, inMemory: true)
}
