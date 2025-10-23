import Foundation

/// Generates comprehensive summaries of historical eras
@MainActor
final class EraSummaryGenerator {
    private let geminiClient: GeminiClient

    init(geminiClient: GeminiClient) {
        self.geminiClient = geminiClient
    }

    /// Generate a detailed summary for a historical era
    func generateSummary(era: HistoricalEra) async throws -> EraSummary {
        let prompt = createEraSummaryPrompt(era: era)

        let response = try await geminiClient.generateContent(
            prompt: prompt,
            systemInstruction: """
            You are a history professor specializing in synthesizing historical information. \
            Provide comprehensive, accurate summaries of historical eras. \
            Return valid JSON only.
            """
        )

        guard let data = response.data(using: .utf8),
              let summaryData = try? JSONDecoder().decode(EraSummaryData.self, from: data) else {
            throw HistoryModeError.generationFailed("Failed to parse era summary")
        }

        return EraSummary(
            era: era,
            keyEvents: summaryData.keyEvents,
            majorFigures: summaryData.majorFigures,
            culturalDevelopments: summaryData.culturalDevelopments,
            politicalStructure: summaryData.politicalStructure,
            economicConditions: summaryData.economicConditions,
            socialStructure: summaryData.socialStructure,
            technologicalAdvances: summaryData.technologicalAdvances,
            legacyAndImpact: summaryData.legacyAndImpact
        )
    }

    private func createEraSummaryPrompt(era: HistoricalEra) -> String {
        """
        Create a comprehensive summary of the following historical era:

        Name: \(era.name)
        Period: \(era.startYear) - \(era.endYear)
        Region: \(era.region)
        Context: \(era.description)

        Provide detailed information in the following categories:

        1. Key Events: List 5-10 major historical events that defined this era
        2. Major Figures: List 5-10 influential people from this period
        3. Cultural Developments: Describe 3-5 significant cultural achievements or movements
        4. Political Structure: Describe the dominant political systems and governance
        5. Economic Conditions: Describe the economic situation and major economic developments
        6. Social Structure: Describe the social hierarchy and class systems
        7. Technological Advances: List 3-5 significant technological innovations
        8. Legacy and Impact: Describe how this era influenced later periods and modern times

        Return the response as valid JSON with these exact keys:
        {
          "keyEvents": ["event1", "event2", ...],
          "majorFigures": ["figure1", "figure2", ...],
          "culturalDevelopments": ["development1", ...],
          "politicalStructure": "description",
          "economicConditions": "description",
          "socialStructure": "description",
          "technologicalAdvances": ["advance1", ...],
          "legacyAndImpact": "description"
        }
        """
    }

    private struct EraSummaryData: Codable {
        let keyEvents: [String]
        let majorFigures: [String]
        let culturalDevelopments: [String]
        let politicalStructure: String
        let economicConditions: String
        let socialStructure: String
        let technologicalAdvances: [String]
        let legacyAndImpact: String
    }
}
