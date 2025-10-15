//
//  DocumentScannerView.swift
//  MirrorBuddy
//
//  Document scanner using VisionKit's DocumentCamera
//  Scans multiple pages, auto-crops, and runs OCR
//

import SwiftUI
import VisionKit
import SwiftData

struct DocumentScannerView: UIViewControllerRepresentable {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    let onComplete: (Material) -> Void

    func makeUIViewController(context: Context) -> VNDocumentCameraViewController {
        let scanner = VNDocumentCameraViewController()
        scanner.delegate = context.coordinator
        return scanner
    }

    func updateUIViewController(_ uiViewController: VNDocumentCameraViewController, context: Context) {
        // No updates needed
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self, modelContext: modelContext, onComplete: onComplete)
    }

    @MainActor
    class Coordinator: NSObject, VNDocumentCameraViewControllerDelegate {
        let parent: DocumentScannerView
        let modelContext: ModelContext
        let onComplete: (Material) -> Void

        init(parent: DocumentScannerView, modelContext: ModelContext, onComplete: @escaping (Material) -> Void) {
            self.parent = parent
            self.modelContext = modelContext
            self.onComplete = onComplete
        }

        // MARK: - Delegate Methods

        func documentCameraViewController(
            _ controller: VNDocumentCameraViewController,
            didFinishWith scan: VNDocumentCameraScan
        ) {
            // Dismiss scanner
            controller.dismiss(animated: true)

            // Process scanned document in background
            _Concurrency.Task { @MainActor in
                await processScan(scan)
            }
        }

        func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
            controller.dismiss(animated: true)
        }

        func documentCameraViewController(
            _ controller: VNDocumentCameraViewController,
            didFailWithError error: Error
        ) {
            print("Document scanner failed: \(error.localizedDescription)")
            controller.dismiss(animated: true)
        }

        // MARK: - Processing

        private func processScan(_ scan: VNDocumentCameraScan) async {
            let pageCount = scan.pageCount
            guard pageCount > 0 else { return }

            print("Processing \(pageCount) scanned pages...")

            // Save images to Documents directory
            let documentsPath = FileManager.default.urls(
                for: .documentDirectory,
                in: .userDomainMask
            )[0]

            let timestamp = Date().timeIntervalSince1970
            let scanFolderURL = documentsPath.appendingPathComponent("Scan_\(Int(timestamp))")

            do {
                try FileManager.default.createDirectory(
                    at: scanFolderURL,
                    withIntermediateDirectories: true
                )

                var imageURLs: [URL] = []

                // Save each page as image
                for pageIndex in 0..<pageCount {
                    let image = scan.imageOfPage(at: pageIndex)
                    let imageURL = scanFolderURL.appendingPathComponent("page_\(pageIndex + 1).png")

                    if let data = image.pngData() {
                        try data.write(to: imageURL)
                        imageURLs.append(imageURL)
                    }
                }

                // Run OCR on all pages
                let extractedText = try await OCRService.shared.extractText(from: imageURLs)

                // Create PDF (optional - for now save as images)
                // Could use PDFKit to create PDF from images

                // Create Material
                let material = Material(
                    title: "Documento scannerizzato \(Date().formatted(date: .abbreviated, time: .shortened))",
                    subject: nil
                )
                material.extractedText = extractedText
                material.pdfURL = imageURLs.first // Store first page URL (or create PDF)

                // Save to SwiftData
                modelContext.insert(material)
                try modelContext.save()

                print("✅ Scanned document saved: \(material.title)")
                print("   Pages: \(pageCount)")
                print("   Text extracted: \(extractedText.count) characters")

                // Notify completion
                onComplete(material)

            } catch {
                print("❌ Failed to process scanned document: \(error)")
            }
        }
    }
}

// MARK: - Scanner Button (Integration)

struct ScanDocumentButton: View {
    @Environment(\.modelContext) private var modelContext
    @State private var showingScanner = false
    @State private var scannedMaterial: Material?
    @State private var showingMaterialDetail = false

    var body: some View {
        Button {
            showingScanner = true
        } label: {
            Label("Scansiona Documento", systemImage: "doc.text.viewfinder")
        }
        .fullScreenCover(isPresented: $showingScanner) {
            DocumentScannerView { material in
                scannedMaterial = material
                showingMaterialDetail = true
            }
            .ignoresSafeArea()
        }
        .sheet(item: $scannedMaterial) { material in
            MaterialDetailView(material: material)
        }
    }
}

#Preview {
    ScanDocumentButton()
        .modelContainer(for: Material.self, inMemory: true)
}
