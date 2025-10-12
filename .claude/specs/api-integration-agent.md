# API Integration Agent Specification
**Agent ID**: `api-integration-agent`
**Role**: External API Integration Specialist
**Priority**: High
**Model**: claude-sonnet-4.5

---

## Overview

You are the API Integration Agent responsible for connecting MirrorBuddy to external services: OpenAI, Gemini, and Google Workspace. You build upon foundation-agent's client infrastructure.

---

## Assigned Tasks

### Task 16-18: Google Drive Integration

**File**: `Core/APIs/GoogleDrive/DriveService.swift`

```swift
import GoogleAPIClientForREST_Drive

@MainActor
final class DriveService: ObservableObject {
    private let service = GTLRDriveService()
    private let targetFolderName = "Mario - Scuola"

    func configure(with authorizer: GTMFetcherAuthorizationProtocol) {
        service.authorizer = authorizer
    }

    /// List all files in Mario's school folder
    func listFiles() async throws -> [DriveFile] {
        // 1. Find folder ID
        let folderQuery = GTLRDriveQuery_FilesList.query()
        folderQuery.q = "name='\(targetFolderName)' and mimeType='application/vnd.google-apps.folder'"
        folderQuery.fields = "files(id, name)"

        let folderResult = try await service.executeQuery(folderQuery) as! GTLRDrive_FileList
        guard let folderId = folderResult.files?.first?.identifier else {
            throw DriveError.folderNotFound
        }

        // 2. List files in folder
        let filesQuery = GTLRDriveQuery_FilesList.query()
        filesQuery.q = "'\(folderId)' in parents and trashed=false"
        filesQuery.fields = "files(id, name, mimeType, modifiedTime, size)"
        filesQuery.orderBy = "modifiedTime desc"

        let filesResult = try await service.executeQuery(filesQuery) as! GTLRDrive_FileList

        return filesResult.files?.compactMap { file in
            DriveFile(
                id: file.identifier ?? "",
                name: file.name ?? "",
                mimeType: file.mimeType ?? "",
                modifiedTime: file.modifiedTime?.date,
                size: file.size?.int64Value
            )
        } ?? []
    }

    /// Download a file from Drive
    func downloadFile(fileId: String, to localURL: URL) async throws {
        let query = GTLRDriveQuery_FilesGet.queryForMedia(withFileId: fileId)

        let progressBlock: GTLRServiceProgressBlock = { _, totalBytesRead, totalBytesExpected in
            let progress = Double(totalBytesRead) / Double(totalBytesExpected)
            print("Download progress: \(progress * 100)%")
        }

        service.executeQuery(query, progressBlock: progressBlock) { _, data, error in
            if let error = error {
                throw DriveError.downloadFailed(error)
            }

            guard let data = data as? Data else {
                throw DriveError.invalidData
            }

            try data.write(to: localURL)
        }
    }
}

struct DriveFile {
    let id: String
    let name: String
    let mimeType: String
    let modifiedTime: Date?
    let size: Int64?
}

enum DriveError: Error {
    case folderNotFound
    case downloadFailed(Error)
    case invalidData
}
```

### Task 19: PDF Text Extraction

**File**: `Core/Processing/PDFProcessor.swift`

```swift
import Vision
import PDFKit

@MainActor
final class PDFProcessor {

    /// Extract text from PDF using VisionKit OCR
    func extractText(from pdfURL: URL) async throws -> String {
        guard let pdfDocument = PDFDocument(url: pdfURL) else {
            throw PDFError.invalidPDF
        }

        var allText = ""

        for pageIndex in 0..<pdfDocument.pageCount {
            guard let page = pdfDocument.page(at: pageIndex),
                  let pageImage = page.thumbnail(of: CGSize(width: 1000, height: 1000), for: .mediaBox) else {
                continue
            }

            // Use VisionKit for OCR
            let requestHandler = VNImageRequestHandler(cgImage: pageImage.cgImage!, options: [:])
            let request = VNRecognizeTextRequest()
            request.recognitionLevel = .accurate
            request.recognitionLanguages = ["it", "en"]

            try requestHandler.perform([request])

            guard let observations = request.results else { continue }

            let pageText = observations.compactMap { observation in
                observation.topCandidates(1).first?.string
            }.joined(separator: "\n")

            allText += pageText + "\n\n"
        }

        return allText
    }
}

enum PDFError: Error {
    case invalidPDF
    case extractionFailed
}
```

### Task 20-24: AI Processing Pipeline

**File**: `Core/Processing/MaterialProcessor.swift`

```swift
@MainActor
final class MaterialProcessor {
    private let openAIClient: OpenAIClient
    private let appleAIClient: AppleIntelligenceClient
    private let pdfProcessor: PDFProcessor

    init(openAIClient: OpenAIClient, appleAIClient: AppleIntelligenceClient, pdfProcessor: PDFProcessor) {
        self.openAIClient = openAIClient
        self.appleAIClient = appleAIClient
        self.pdfProcessor = pdfProcessor
    }

    /// Process material in parallel
    func process(material: Material) async throws {
        material.processingStatus = .processing

        // 1. Extract text
        guard let pdfURL = material.pdfURL else {
            throw ProcessingError.noPDF
        }

        let text = try await pdfProcessor.extractText(from: pdfURL)
        material.textContent = text

        // 2. Process in parallel
        async let summary = generateSummary(text: text)
        async let mindMapData = generateMindMap(text: text, subject: material.subject)
        async let flashcards = generateFlashcards(text: text)

        // 3. Save results
        material.summary = try await summary
        material.mindMap = try await createMindMapModel(from: mindMapData)
        material.flashcards = try await flashcards

        material.processingStatus = .completed
    }

    private func generateSummary(text: String) async throws -> String {
        // Use Apple Intelligence for speed and privacy
        return try await appleAIClient.summarize(text: text)
    }

    private func generateMindMap(text: String, subject: Subject) async throws -> MindMapData {
        let prompt = """
        Create a mind map for this \(subject.rawValue) material.
        - Maximum 3 levels deep
        - 5-7 words per node
        - Concrete examples
        - Simplified for dyslexia

        Material:
        \(text.prefix(5000))
        """

        let request = ChatCompletionRequest(
            model: "gpt-5",
            messages: [.init(role: "user", content: prompt)],
            temperature: 0.7,
            maxTokens: 2000
        )

        let response = try await openAIClient.chatCompletion(request: request)
        let jsonString = response.choices.first?.message.content ?? "{}"

        // Parse JSON to MindMapData
        return try JSONDecoder().decode(MindMapData.self, from: jsonString.data(using: .utf8)!)
    }

    private func generateFlashcards(text: String) async throws -> [Flashcard] {
        // Use GPT-5 nano for cost efficiency
        let prompt = """
        Generate 10 flashcards from this material.
        Format: JSON array [{"front": "...", "back": "..."}]

        Material:
        \(text.prefix(3000))
        """

        let request = ChatCompletionRequest(
            model: "gpt-5-nano",
            messages: [.init(role: "user", content: prompt)],
            temperature: 0.8,
            maxTokens: 1000
        )

        let response = try await openAIClient.chatCompletion(request: request)
        // Parse and create Flashcard objects
        return []
    }

    private func createMindMapModel(from data: MindMapData) async throws -> MindMap {
        let mindMap = MindMap()

        // Generate DALL-E images for top nodes in parallel
        let imagePromises = data.nodes.prefix(5).map { node in
            generateNodeImage(text: node.text)
        }

        let images = try await withThrowingTaskGroup(of: URL?.self) { group in
            for promise in imagePromises {
                group.addTask { try await promise }
            }

            var results: [URL?] = []
            for try await image in group {
                results.append(image)
            }
            return results
        }

        // Create MindMapNode objects with images
        // ...

        return mindMap
    }

    private func generateNodeImage(text: String) async throws -> URL? {
        let prompt = "Simple, minimalist illustration of: \(text). Clean, educational style. No text."
        return try await openAIClient.generateImage(prompt: prompt)
    }
}

struct MindMapData: Codable {
    struct Node: Codable {
        let text: String
        let level: Int
        let children: [Node]
    }

    let nodes: [Node]
}

enum ProcessingError: Error {
    case noPDF
    case failed
}
```

### Task 42-43: Calendar & Gmail Integration

**File**: `Core/APIs/Google/CalendarService.swift`

```swift
import GoogleAPIClientForREST_Calendar

@MainActor
final class CalendarService {
    private let service = GTLRCalendarService()

    func configure(with authorizer: GTMFetcherAuthorizationProtocol) {
        service.authorizer = authorizer
    }

    func fetchUpcomingEvents() async throws -> [CalendarEvent] {
        let query = GTLRCalendarQuery_EventsList.query(withCalendarId: "primary")
        query.timeMin = GTLRDateTime(date: Date())
        query.singleEvents = true
        query.orderBy = kGTLRCalendarOrderByStartTime

        let result = try await service.executeQuery(query) as! GTLRCalendar_Events

        return result.items?.compactMap { event in
            CalendarEvent(
                id: event.identifier ?? "",
                summary: event.summary ?? "",
                start: event.start?.dateTime?.date ?? event.start?.date?.date,
                end: event.end?.dateTime?.date ?? event.end?.date?.date,
                description: event.descriptionProperty
            )
        } ?? []
    }
}

struct CalendarEvent {
    let id: String
    let summary: String
    let start: Date?
    let end: Date?
    let description: String?
}
```

---

## Definition of Done

- [ ] Google Drive integration working
- [ ] PDF text extraction functional
- [ ] Material processing pipeline complete
- [ ] Mind map generation working
- [ ] Flashcard generation working
- [ ] Calendar integration working
- [ ] Gmail integration working
- [ ] Error handling robust
- [ ] Tests passing (>80% coverage)
- [ ] API costs within budget

---

**Connect the world to MirrorBuddy. Make it seamless. 🌐**
