import Foundation
import os.log

/// Privacy-compliant structured audit logging service
@MainActor
final class StructuredAuditLogger {
    static let shared = StructuredAuditLogger()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "Audit")

    enum EventType: String {
        case voiceCommand = "voice_command"
        case apiCall = "api_call"
        case dataExport = "data_export"
        case consentChange = "consent_change"
        case recordingStart = "recording_start"
        case recordingStop = "recording_stop"
        case error
    }

    struct AuditEvent: Codable {
        let timestamp: Date
        let eventType: EventType
        let userId: String? // Anonymized
        let metadata: [String: String]
        let success: Bool

        init(type: EventType, userId: String? = nil, metadata: [String: String] = [:], success: Bool = true) {
            self.timestamp = Date()
            self.eventType = type
            self.userId = userId?.prefix(8).description // Truncate for privacy
            self.metadata = metadata
            self.success = success
        }
    }

    private init() {}

    func log(_ event: AuditEvent) {
        let message = """
        [AUDIT] \(event.eventType.rawValue) | \
        success=\(event.success) | \
        metadata=\(event.metadata)
        """

        if event.success {
            logger.info("\(message)")
        } else {
            logger.error("\(message)")
        }
    }

    // Convenience methods
    func logVoiceCommand(_ command: String, success: Bool) {
        let event = AuditEvent(
            type: .voiceCommand,
            metadata: ["command": command],
            success: success
        )
        log(event)
    }

    func logAPICall(_ endpoint: String, success: Bool, duration: TimeInterval) {
        let event = AuditEvent(
            type: .apiCall,
            metadata: ["endpoint": endpoint, "duration": String(format: "%.2fs", duration)],
            success: success
        )
        log(event)
    }

    func logDataExport(_ format: String, recordCount: Int) {
        let event = AuditEvent(
            type: .dataExport,
            metadata: ["format": format, "records": "\(recordCount)"],
            success: true
        )
        log(event)
    }

    func logConsentChange(_ setting: String, newValue: Bool) {
        let event = AuditEvent(
            type: .consentChange,
            metadata: ["setting": setting, "value": "\(newValue)"],
            success: true
        )
        log(event)
    }
}
