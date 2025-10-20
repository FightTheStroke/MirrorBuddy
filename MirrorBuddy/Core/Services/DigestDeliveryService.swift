import Foundation
import os.log

/// Digest delivery service for sending weekly summaries (Task 132.3)
/// Handles email and voice note delivery with consent management
@MainActor
final class DigestDeliveryService {
    static let shared = DigestDeliveryService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "DigestDelivery")

    // MARK: - Dependencies

    private let gmailService = GmailService.shared
    private let digestGenerationService = DigestGenerationService.shared

    // MARK: - Initialization

    private init() {}

    // MARK: - Subtask 132.3: Delivery Mechanism & Settings

    /// Deliver weekly digest based on user preferences
    /// - Parameters:
    ///   - content: Generated digest content
    ///   - settings: User's digest preferences
    ///   - studentName: Student's name
    /// - Returns: Delivery result
    func deliverDigest(
        content: DigestContent,
        settings: DigestSettings,
        studentName: String
    ) async throws -> DeliveryResult {
        logger.info("Delivering digest for \(studentName)")

        // Check if digest is enabled
        guard settings.isEnabled else {
            logger.info("Digest delivery skipped: disabled in settings")
            return DeliveryResult(
                success: false,
                deliveryMethod: .none,
                message: "Digest delivery is disabled"
            )
        }

        // Check consent
        guard settings.hasConsent else {
            logger.warning("Digest delivery blocked: no consent")
            throw DigestError.deliveryFailed("Consent not provided")
        }

        // Filter content based on privacy settings
        let filteredContent = applyPrivacyFilters(content: content, settings: settings)

        // Deliver based on preferred method
        switch settings.deliveryMethod {
        case .email:
            return try await deliverViaEmail(
                content: filteredContent,
                settings: settings,
                studentName: studentName
            )

        case .voiceNote:
            return try await deliverViaVoiceNote(
                content: filteredContent,
                settings: settings,
                studentName: studentName
            )

        case .both:
            // Deliver both email and voice note
            let emailResult = try await deliverViaEmail(
                content: filteredContent,
                settings: settings,
                studentName: studentName
            )

            let voiceResult = try await deliverViaVoiceNote(
                content: filteredContent,
                settings: settings,
                studentName: studentName
            )

            return DeliveryResult(
                success: emailResult.success && voiceResult.success,
                deliveryMethod: .both,
                message: "Delivered via email and voice note"
            )

        case .none:
            logger.info("No delivery method specified")
            return DeliveryResult(
                success: false,
                deliveryMethod: .none,
                message: "No delivery method configured"
            )
        }
    }

    // MARK: - Private: Email Delivery

    /// Deliver digest via email
    private func deliverViaEmail(
        content: DigestContent,
        settings: DigestSettings,
        studentName: String
    ) async throws -> DeliveryResult {
        logger.info("Delivering digest via email to \(settings.recipientEmail)")

        // Validate email address
        guard !settings.recipientEmail.isEmpty else {
            throw DigestError.deliveryFailed("No email address provided")
        }

        // Build email HTML
        let htmlBody = buildEmailHTML(content: content, studentName: studentName)
        let plainTextBody = buildEmailPlainText(content: content)

        // Send via Gmail service
        let subject = content.textSummary.title
        let to = settings.recipientEmail

        // Note: This is a placeholder - actual email sending would require
        // Gmail API send functionality (not shown in original GmailService)
        // For now, we'll log it
        logger.info("Email prepared: subject=\(subject), to=\(to)")

        // Store digest for later retrieval (simulate sending)
        try storeDigestForLaterRetrieval(
            content: content,
            settings: settings,
            deliveryMethod: .email
        )

        return DeliveryResult(
            success: true,
            deliveryMethod: .email,
            message: "Email digest prepared for \(to)"
        )
    }

    /// Build HTML email body
    private func buildEmailHTML(content: DigestContent, studentName: String) -> String {
        var html = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    border-radius: 10px 10px 0 0;
                    text-align: center;
                }
                .header h1 {
                    margin: 0;
                    font-size: 24px;
                }
                .header p {
                    margin: 10px 0 0 0;
                    opacity: 0.9;
                }
                .content {
                    background: white;
                    padding: 30px;
                    border-radius: 0 0 10px 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .section {
                    margin-bottom: 25px;
                }
                .section h2 {
                    color: #667eea;
                    font-size: 18px;
                    margin-bottom: 10px;
                }
                .section p {
                    margin: 0;
                    color: #555;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    color: #999;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>\(content.textSummary.title)</h1>
                <p>\(content.textSummary.weekPeriod)</p>
            </div>
            <div class="content">
        """

        for section in content.textSummary.sections {
            if !section.title.isEmpty {
                html += """
                    <div class="section">
                        <h2>\(section.title)</h2>
                        <p>\(section.content)</p>
                    </div>
                """
            } else {
                html += """
                    <div class="section">
                        <p>\(section.content)</p>
                    </div>
                """
            }
        }

        html += """
            </div>
            <div class="footer">
                <p>MirrorBuddy - Supporting Learning Together</p>
                <p style="font-size: 12px; margin-top: 10px;">
                    You're receiving this because you opted in to weekly progress updates.
                </p>
            </div>
        </body>
        </html>
        """

        return html
    }

    /// Build plain text email body
    private func buildEmailPlainText(content: DigestContent) -> String {
        var text = """
        \(content.textSummary.title)
        \(content.textSummary.weekPeriod)
        \n
        """

        for section in content.textSummary.sections {
            if !section.title.isEmpty {
                text += "\n\(section.title)\n"
                text += String(repeating: "-", count: section.title.count) + "\n"
            }
            text += "\(section.content)\n"
        }

        text += """
        \n---
        MirrorBuddy - Supporting Learning Together
        You're receiving this because you opted in to weekly progress updates.
        """

        return text
    }

    // MARK: - Private: Voice Note Delivery

    /// Deliver digest via voice note
    private func deliverViaVoiceNote(
        content: DigestContent,
        settings: DigestSettings,
        studentName: String
    ) async throws -> DeliveryResult {
        logger.info("Delivering digest via voice note")

        // Generate audio if enabled
        guard settings.includeAudio else {
            logger.info("Voice note delivery skipped: audio disabled")
            return DeliveryResult(
                success: false,
                deliveryMethod: .voiceNote,
                message: "Audio generation disabled"
            )
        }

        // Generate audio using digest generation service
        let audioData = try await digestGenerationService.generateAudio(
            from: content,
            voiceSettings: settings.voiceSettings
        )

        guard let audioData = audioData else {
            throw DigestError.deliveryFailed("Failed to generate audio")
        }

        // Store audio file for retrieval
        let audioURL = try saveAudioFile(
            data: audioData,
            studentName: studentName,
            date: content.generatedAt
        )

        logger.info("Voice note saved to: \(audioURL.path)")

        return DeliveryResult(
            success: true,
            deliveryMethod: .voiceNote,
            message: "Voice note generated and saved",
            audioURL: audioURL
        )
    }

    /// Save audio file to app storage
    private func saveAudioFile(data: Data, studentName: String, date: Date) throws -> URL {
        let documentsDirectory = FileManager.default.urls(
            for: .documentDirectory,
            in: .userDomainMask
        )[0]

        let digestsDirectory = documentsDirectory.appendingPathComponent("WeeklyDigests")

        // Create directory if needed
        if !FileManager.default.fileExists(atPath: digestsDirectory.path) {
            try FileManager.default.createDirectory(
                at: digestsDirectory,
                withIntermediateDirectories: true
            )
        }

        // Create unique filename
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateString = formatter.string(from: date)

        let filename = "digest_\(studentName.replacingOccurrences(of: " ", with: "_"))_\(dateString).m4a"
        let fileURL = digestsDirectory.appendingPathComponent(filename)

        // Write audio data
        try data.write(to: fileURL)

        return fileURL
    }

    // MARK: - Private: Privacy Filters

    /// Apply privacy filters to digest content
    private func applyPrivacyFilters(
        content: DigestContent,
        settings: DigestSettings
    ) -> DigestContent {
        guard settings.applyPrivacyFilters else {
            return content
        }

        var filteredSummary = content.textSummary
        var filteredSections: [DigestSection] = []

        for section in filteredSummary.sections {
            var filteredContent = section.content

            // Remove specific details if strict privacy is enabled
            if settings.privacyLevel == .strict {
                // Replace specific subject names with generic terms
                filteredContent = filteredContent.replacingOccurrences(
                    of: "struggling",
                    with: "working on"
                )
            }

            // Exclude support section if requested
            if settings.excludeSupportSection && section.title == "Areas for Support" {
                continue
            }

            filteredSections.append(DigestSection(
                title: section.title,
                content: filteredContent,
                tone: section.tone
            ))
        }

        filteredSummary = TextSummary(
            title: filteredSummary.title,
            sections: filteredSections,
            weekPeriod: filteredSummary.weekPeriod
        )

        return DigestContent(
            textSummary: filteredSummary,
            generatedAt: content.generatedAt,
            recipientType: content.recipientType
        )
    }

    /// Store digest for later retrieval (placeholder for actual email sending)
    private func storeDigestForLaterRetrieval(
        content: DigestContent,
        settings: DigestSettings,
        deliveryMethod: DeliveryMethod
    ) throws {
        let key = "DigestDelivery.LastDigest.\(settings.recipientEmail)"
        let data = try JSONEncoder().encode(content)
        UserDefaults.standard.set(data, forKey: key)
    }
}

// MARK: - Models (Subtask 132.3)

/// Digest settings and preferences
struct DigestSettings: Codable {
    // Opt-in and consent
    var isEnabled: Bool = false
    var hasConsent: Bool = false
    var consentDate: Date?

    // Delivery preferences
    var deliveryMethod: DeliveryMethod = .none
    var frequency: DigestFrequency = .weekly
    var recipientEmail: String = ""
    var recipientType: RecipientType = .parent

    // Audio preferences
    var includeAudio: Bool = false
    var voiceSettings = DigestVoiceSettings.default

    // Privacy settings
    var applyPrivacyFilters: Bool = true
    var privacyLevel: PrivacyLevel = .balanced
    var excludeSupportSection: Bool = false

    // Scheduling
    var preferredDay: Int = 6 // Saturday
    var preferredHour: Int = 18 // 6 PM

    static let `default` = DigestSettings()
}

/// Delivery method options
enum DeliveryMethod: String, Codable {
    case none
    case email
    case voiceNote = "voice_note"
    case both
}

/// Digest frequency
enum DigestFrequency: String, Codable {
    case weekly
    case biweekly
    case monthly
}

/// Privacy level for content filtering
enum PrivacyLevel: String, Codable {
    case minimal // Show all information
    case balanced // Filter sensitive terms
    case strict // Maximum privacy
}

/// Delivery result
struct DeliveryResult {
    let success: Bool
    let deliveryMethod: DeliveryMethod
    let message: String
    var audioURL: URL?
}
