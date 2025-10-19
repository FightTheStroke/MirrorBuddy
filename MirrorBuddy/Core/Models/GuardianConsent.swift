import Foundation
import SwiftData

/// Guardian consent and privacy control settings
@Model
final class GuardianConsent {

    @Attribute(.unique) var id: UUID
    var isPINProtected: Bool
    var pinHash: String?

    // Consent toggles
    var allowRecording: Bool
    var allowExport: Bool
    var allowPersonaAdjustment: Bool
    var allowThirdPartySharing: Bool
    var allowAnalytics: Bool

    // Last updated
    var lastUpdated: Date
    var updatedBy: String? // Guardian identifier

    init(
        isPINProtected: Bool = true,
        allowRecording: Bool = false,
        allowExport: Bool = false,
        allowPersonaAdjustment: Bool = true,
        allowThirdPartySharing: Bool = false,
        allowAnalytics: Bool = true
    ) {
        self.id = UUID()
        self.isPINProtected = isPINProtected
        self.allowRecording = allowRecording
        self.allowExport = allowExport
        self.allowPersonaAdjustment = allowPersonaAdjustment
        self.allowThirdPartySharing = allowThirdPartySharing
        self.allowAnalytics = allowAnalytics
        self.lastUpdated = Date()
    }

    func setPIN(_ pin: String) {
        self.pinHash = hashPIN(pin)
        self.isPINProtected = true
        self.lastUpdated = Date()
    }

    func verifyPIN(_ pin: String) -> Bool {
        guard let hash = pinHash else { return false }
        return hashPIN(pin) == hash
    }

    private func hashPIN(_ pin: String) -> String {
        // Simple hash - in production use proper crypto
        return String(pin.hashValue)
    }
}
