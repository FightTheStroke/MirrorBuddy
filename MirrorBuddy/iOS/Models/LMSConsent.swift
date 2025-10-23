import Foundation
import SwiftData

/// LMS platform types
enum LMSPlatform: String, Codable {
    case canvas
    case googleClassroom
}

/// Consent record for LMS data access
@Model
final class LMSConsent {
    var id = UUID()
    var platform: LMSPlatform
    var isGranted: Bool = false
    var grantedAt: Date?
    var revokedAt: Date?
    var guardianApproved: Bool = false
    var guardianApprovedAt: Date?

    // OAuth tokens (encrypted in Keychain, this stores reference)
    var accessTokenKeychainKey: String?
    var refreshTokenKeychainKey: String?

    // Platform-specific data
    var canvasBaseURL: String? // Canvas instance URL (e.g., "school.instructure.com")
    var lastSyncedAt: Date?

    init(platform: LMSPlatform) {
        self.id = UUID()
        self.platform = platform
        self.isGranted = false
    }

    /// Grant consent for LMS access
    func grant(guardianApproved: Bool = false) {
        self.isGranted = true
        self.grantedAt = Date()
        self.revokedAt = nil
        self.guardianApproved = guardianApproved
        if guardianApproved {
            self.guardianApprovedAt = Date()
        }
    }

    /// Revoke consent
    func revoke() {
        self.isGranted = false
        self.revokedAt = Date()
    }

    /// Check if consent is valid
    var isValid: Bool {
        isGranted && revokedAt == nil
    }
}
