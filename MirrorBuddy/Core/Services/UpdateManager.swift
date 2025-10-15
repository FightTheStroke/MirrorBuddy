//
//  UpdateManager.swift
//  MirrorBuddy
//
//  Central orchestrator for "Aggiornami" button
//  Coordinates: Drive sync → Gmail sync → Calendar sync → Mind map generation
//

import Foundation
import SwiftData
import os.log

/// Progress state for the update process
@Observable
@MainActor
final class UpdateProgress {
    var isUpdating: Bool = false
    var currentStep: UpdateStep = .idle
    var progress: Double = 0.0 // 0.0 to 1.0
    var statusMessage: String = ""
    var error: String?

    // Results
    var newDocumentsCount: Int = 0
    var newTasksCount: Int = 0
    var newEventsCount: Int = 0
    var mindMapsGenerated: Int = 0
}

/// Update steps
enum UpdateStep: String {
    case idle = "Inattivo"
    case authenticating = "Autenticazione..."
    case syncingDrive = "Sincronizzazione Google Drive..."
    case syncingGmail = "Controllo nuove mail..."
    case syncingCalendar = "Controllo calendario..."
    case generatingMindMaps = "Creazione mappe mentali..."
    case completed = "Aggiornamento completato!"
    case failed = "Errore durante l'aggiornamento"
}

/// Central update manager - orchestrates all sync operations
@MainActor
final class UpdateManager {
    static let shared = UpdateManager()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "UpdateManager")

    // Services
    private let googleOAuth = GoogleOAuthService.shared
    private var driveClient: GoogleDriveClient { .shared }
    private var gmailService: GmailService { .shared }
    private var calendarService: GoogleCalendarService { .shared }

    // State
    let progress = UpdateProgress()
    private var modelContext: ModelContext?

    private init() {}

    /// Configure with model context
    func configure(modelContext: ModelContext) {
        self.modelContext = modelContext
        logger.info("UpdateManager configured")
    }

    /// Main update function - called by "Aggiornami" button
    func performFullUpdate() async {
        guard !progress.isUpdating else {
            logger.warning("Update already in progress")
            return
        }

        logger.info("Starting full update")
        progress.isUpdating = true
        progress.error = nil
        progress.currentStep = .authenticating
        progress.progress = 0.0
        progress.statusMessage = "Preparazione..."

        // Reset counters
        progress.newDocumentsCount = 0
        progress.newTasksCount = 0
        progress.newEventsCount = 0
        progress.mindMapsGenerated = 0

        do {
            // Step 1: Check authentication (10%)
            try await checkAuthentication()
            progress.progress = 0.1
            try await _Concurrency.Task.sleep(nanoseconds: 500_000_000) // 0.5s delay for UX

            // Step 2: Sync Google Drive (30%)
            progress.currentStep = .syncingDrive
            progress.statusMessage = "Cerco nuovi documenti su Drive..."
            try await syncGoogleDrive()
            progress.progress = 0.4
            try await _Concurrency.Task.sleep(nanoseconds: 500_000_000)

            // Step 3: Sync Gmail (20%)
            progress.currentStep = .syncingGmail
            progress.statusMessage = "Controllo nuove mail dai professori..."
            try await syncGmail()
            progress.progress = 0.6
            try await _Concurrency.Task.sleep(nanoseconds: 500_000_000)

            // Step 4: Sync Calendar (15%)
            progress.currentStep = .syncingCalendar
            progress.statusMessage = "Controllo eventi nel calendario..."
            try await syncCalendar()
            progress.progress = 0.75
            try await _Concurrency.Task.sleep(nanoseconds: 500_000_000)

            // Step 5: Generate mind maps for new documents (25%)
            progress.currentStep = .generatingMindMaps
            progress.statusMessage = "Creo mappe mentali per i nuovi documenti..."
            try await generateMindMapsForNewDocuments()
            progress.progress = 1.0

            // Completed
            progress.currentStep = .completed
            progress.statusMessage = buildCompletionMessage()
            logger.info("Full update completed successfully")

        } catch {
            logger.error("Update failed: \(error.localizedDescription)")
            progress.currentStep = .failed
            progress.error = error.localizedDescription
            progress.statusMessage = "Errore: \(error.localizedDescription)"
        }

        // Keep "isUpdating" true for 2 seconds to show results
        try? await _Concurrency.Task.sleep(nanoseconds: 2_000_000_000)
        progress.isUpdating = false
    }

    // MARK: - Individual Sync Operations

    private func checkAuthentication() async throws {
        let isAuthenticated = await googleOAuth.isAuthenticated()
        guard isAuthenticated else {
            throw UpdateError.notAuthenticated
        }
        logger.debug("Authentication check passed")
    }

    private func syncGoogleDrive() async throws {
        guard let context = modelContext else {
            throw UpdateError.noModelContext
        }

        // List PDFs, Google Docs, and Images (PNG, JPG, HEIC)
        let query = """
            mimeType='application/pdf' or \
            mimeType='application/vnd.google-apps.document' or \
            mimeType='image/png' or \
            mimeType='image/jpeg' or \
            mimeType='image/heic' or \
            mimeType='image/heif'
            """
        let response = try await driveClient.listFiles(query: query)

        logger.debug("Found \(response.files.count) files on Drive")

        // Check which files are new (not in TrackedDriveFile)
        let descriptor = FetchDescriptor<TrackedDriveFile>()
        let trackedFiles = try context.fetch(descriptor)
        let trackedFileIDs = Set(trackedFiles.map { $0.fileID })

        var newFilesCount = 0

        for file in response.files {
            // Skip if already tracked
            if trackedFileIDs.contains(file.id) {
                continue
            }

            // Download file
            do {
                let localURL = try await GoogleDriveDownloadService.shared.downloadFile(fileId: file.id)

                // Create Material
                let title = file.name
                    .replacingOccurrences(of: ".pdf", with: "")
                    .replacingOccurrences(of: ".png", with: "")
                    .replacingOccurrences(of: ".jpg", with: "")
                    .replacingOccurrences(of: ".jpeg", with: "")

                let material = Material(
                    title: title,
                    subject: nil
                )
                material.googleDriveFileID = file.id
                material.pdfURL = localURL

                // Run OCR if it's an image
                if OCRService.isImage(url: localURL) {
                    do {
                        let extractedText = try await OCRService.shared.extractText(from: localURL)
                        material.extractedText = extractedText
                        logger.debug("OCR extracted \(extractedText.count) characters from \(file.name)")
                    } catch {
                        logger.warning("OCR failed for \(file.name): \(error.localizedDescription)")
                        material.extractedText = "[OCR failed: \(error.localizedDescription)]"
                    }
                }

                context.insert(material)

                // Track file
                let trackedFile = TrackedDriveFile(
                    fileID: file.id,
                    name: file.name,
                    mimeType: file.mimeType
                )
                context.insert(trackedFile)

                newFilesCount += 1
                logger.debug("Imported new file: \(file.name)")

            } catch {
                logger.warning("Failed to import file \(file.name): \(error.localizedDescription)")
            }
        }

        try context.save()
        progress.newDocumentsCount = newFilesCount
        logger.info("Synced \(newFilesCount) new documents from Drive")
    }

    private func syncGmail() async throws {
        let messages = try await gmailService.syncEmails(fromTeachersOnly: true)
        let assignments = gmailService.extractAssignments(from: messages)
        try await gmailService.syncAssignmentsToTasks(assignments)

        progress.newTasksCount = assignments.count
        logger.info("Synced \(assignments.count) new tasks from Gmail")
    }

    private func syncCalendar() async throws {
        let events = try await calendarService.syncCalendarEvents()
        let assignments = calendarService.extractAssignments(from: events)
        try await calendarService.syncAssignmentsToTasks(assignments)

        progress.newEventsCount = events.count
        progress.newTasksCount += assignments.count
        logger.info("Synced \(events.count) calendar events, created \(assignments.count) tasks")
    }

    private func generateMindMapsForNewDocuments() async throws {
        guard let context = modelContext else {
            throw UpdateError.noModelContext
        }

        // Find materials without mind maps
        let descriptor = FetchDescriptor<Material>(
            predicate: #Predicate { material in
                material.mindMap == nil
            }
        )

        let materialsWithoutMindMaps = try context.fetch(descriptor)

        logger.debug("Generating mind maps for \(materialsWithoutMindMaps.count) materials")

        var generatedCount = 0

        for material in materialsWithoutMindMaps {
            // Skip if no text content
            guard !material.extractedText.isEmpty else { continue }

            // Generate mind map (placeholder - actual implementation uses AI service)
            let mindMap = MindMap(materialID: material.id)
            mindMap.material = material

            // Create root node (positioned at center)
            let rootNode = MindMapNode(
                title: material.title,
                content: String(material.extractedText.prefix(200)),
                positionX: 0,
                positionY: 0,
                color: material.subject?.colorName ?? "blue"
            )
            rootNode.mindMap = mindMap
            mindMap.nodes = [rootNode]

            material.mindMap = mindMap
            context.insert(mindMap)
            context.insert(rootNode)

            generatedCount += 1
            logger.debug("Generated mind map for: \(material.title)")
        }

        try context.save()
        progress.mindMapsGenerated = generatedCount
        logger.info("Generated \(generatedCount) mind maps")
    }

    // MARK: - Helpers

    private func buildCompletionMessage() -> String {
        var parts: [String] = []

        if progress.newDocumentsCount > 0 {
            parts.append("\(progress.newDocumentsCount) nuovi documenti")
        }
        if progress.newTasksCount > 0 {
            parts.append("\(progress.newTasksCount) nuovi compiti")
        }
        if progress.newEventsCount > 0 {
            parts.append("\(progress.newEventsCount) eventi")
        }
        if progress.mindMapsGenerated > 0 {
            parts.append("\(progress.mindMapsGenerated) mappe mentali create")
        }

        if parts.isEmpty {
            return "Tutto aggiornato! Nessuna novità."
        } else {
            return "Trovati: " + parts.joined(separator: ", ")
        }
    }
}

// MARK: - Errors

enum UpdateError: LocalizedError {
    case notAuthenticated
    case noModelContext
    case syncFailed(String)

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "Non sei autenticato con Google. Vai nelle Impostazioni per connetterti."
        case .noModelContext:
            return "Errore interno: ModelContext non disponibile"
        case .syncFailed(let message):
            return "Sincronizzazione fallita: \(message)"
        }
    }
}
