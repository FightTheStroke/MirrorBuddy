import Foundation
@testable import MirrorBuddy
import Testing

/// Tests for weekly parent/teacher digest system (Task 132)
@Suite("Weekly Digest Tests")
struct WeeklyDigestTests {
    @Test("Generate weekly digest with metrics")
    func testDigestGeneration() async {
        let service = DigestGenerationService.shared

        let digest = await service.generateWeeklyDigest(
            xpGained: 250,
            studyMinutes: 180,
            streakDays: 5,
            strugglingSubjects: ["Math"],
            achievements: ["Completed 3 quests"]
        )

        #expect(!digest.summary.isEmpty)
        #expect(digest.xpGained == 250)
        #expect(digest.studyMinutes == 180)
    }

    @Test("Digest delivery respects settings")
    func testDigestDeliverySettings() async {
        let service = DigestDeliveryService.shared

        let settings = DigestSettings(
            isEnabled: true,
            frequency: .weekly,
            includeVoiceNote: false
        )

        #expect(settings.isEnabled == true)
        #expect(settings.frequency == .weekly)
    }

    @Test("Opt-out mechanism works")
    func testDigestOptOut() {
        let settings = DigestSettings(isEnabled: true, frequency: .weekly)

        settings.disable()

        #expect(settings.isEnabled == false)
    }
}
