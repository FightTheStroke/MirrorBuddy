import Foundation

/// History-specific prompts for AI interactions
enum HistoryPrompts {
    // MARK: - Timeline Prompts

    static func timelinePrompt(topic: String, startYear: Int, endYear: Int) -> String {
        """
        Create a detailed historical timeline for the following topic:

        Topic: \(topic)
        Time Period: \(startYear) - \(endYear)

        Generate a comprehensive timeline with 8-15 significant events. For each event, provide:

        1. title: A clear, concise title (50 characters max)
        2. date: Full date if known, or "Month Year" or just the year
        3. year: The year as an integer
        4. description: A detailed description (100-200 characters)
        5. significance: Why this event was historically important (100-200 characters)
        6. category: One of: political, military, cultural, economic, social, technological

        Return valid JSON in this exact format:
        {
          "events": [
            {
              "id": "unique-uuid",
              "title": "Event Title",
              "date": "Month Day, Year",
              "year": 1945,
              "description": "What happened",
              "significance": "Why it mattered",
              "category": "military"
            }
          ]
        }

        Ensure events are chronologically ordered and cover the full time period.
        """
    }

    // MARK: - Character Profile Prompts

    static func characterProfilePrompt(characterName: String, context: String?) -> String {
        let contextSection = context.map { "\nContext: \($0)\n" } ?? ""

        return """
        Create a comprehensive historical profile for:

        Name: \(characterName)\(contextSection)

        Provide detailed information in valid JSON format:
        {
          "name": "\(characterName)",
          "birthDate": "Full date or year",
          "deathDate": "Full date or year (or null if still living)",
          "nationality": "Country/region",
          "occupation": "Primary role or profession",
          "biography": "Comprehensive 200-300 word biography covering their life and times",
          "majorAccomplishments": [
            "List 4-6 major achievements or contributions"
          ],
          "historicalSignificance": "150-200 word explanation of their impact on history",
          "relatedFigures": [
            "List 4-6 contemporary or related historical figures"
          ],
          "interestingFacts": [
            "List 4-6 lesser-known interesting facts about this person"
          ]
        }

        Focus on historical accuracy and provide specific, verifiable information.
        """
    }

    // MARK: - Map Prompts

    static func historicalMapPrompt(topic: String, era: HistoricalEra) -> String {
        """
        Generate historical locations for an interactive map:

        Topic: \(topic)
        Era: \(era.name) (\(era.startYear)-\(era.endYear))
        Region: \(era.region)
        Context: \(era.description)

        Provide 5-10 significant locations related to this topic and era.

        For each location, include:
        1. name: The historical name of the location
        2. latitude: Precise latitude coordinate
        3. longitude: Precise longitude coordinate
        4. description: What this location is (100 characters)
        5. historicalSignificance: Why it's important to this topic (150 characters)
        6. timeframe: When it was significant (e.g., "1940-1945")
        7. relatedEvents: Array of 2-4 related event names

        Return valid JSON:
        [
          {
            "name": "Location Name",
            "latitude": 48.8566,
            "longitude": 2.3522,
            "description": "Description of the location",
            "historicalSignificance": "Why it matters",
            "timeframe": "Time period",
            "relatedEvents": ["Event 1", "Event 2"]
          }
        ]

        Use accurate geographic coordinates. Ensure locations are spread across the relevant geographic area.
        """
    }

    // MARK: - Study Assistance Prompts

    static func essayHelpPrompt(topic: String, thesis: String?) -> String {
        let thesisSection = thesis.map { "\nProposed Thesis: \($0)\n" } ?? ""

        return """
        Help the student develop a history essay on:

        Topic: \(topic)\(thesisSection)

        Provide:
        1. Three potential thesis statements (if not provided)
        2. A suggested outline with 4-5 main points
        3. Key historical evidence for each main point
        4. Potential counterarguments to consider
        5. Recommended primary and secondary sources

        Format as a structured study guide.
        """
    }

    static func compareContrastPrompt(subject1: String, subject2: String, aspect: String) -> String {
        """
        Compare and contrast the following historical subjects:

        Subject 1: \(subject1)
        Subject 2: \(subject2)
        Focus: \(aspect)

        Provide:
        1. Key similarities (3-5 points)
        2. Key differences (3-5 points)
        3. Historical context for each
        4. Significance of the comparison
        5. Impact on later historical developments

        Present in a clear, organized format suitable for study notes.
        """
    }

    static func causeEffectPrompt(event: String) -> String {
        """
        Analyze the causes and effects of:

        Historical Event: \(event)

        Provide:
        1. Long-term causes (3-4 factors)
        2. Short-term/immediate causes (2-3 factors)
        3. Immediate effects/consequences (3-4 points)
        4. Long-term impacts (3-4 points)
        5. Historical significance and legacy

        Explain the causal relationships clearly for student understanding.
        """
    }

    // MARK: - Homework Help Prompts

    static func documentAnalysisPrompt(documentText: String, documentType: String) -> String {
        """
        Analyze this historical document:

        Type: \(documentType)
        Content: \(documentText)

        Provide analysis covering:
        1. Historical context (when, where, who)
        2. Main arguments or points
        3. Intended audience and purpose
        4. Tone and perspective
        5. Historical significance
        6. Potential biases or limitations
        7. Key quotes and their meaning

        Format as a comprehensive document analysis guide.
        """
    }

    static func quizPreparationPrompt(topic: String, focus: [String]) -> String {
        let focusAreas = focus.joined(separator: ", ")

        return """
        Create quiz preparation material for:

        Topic: \(topic)
        Focus Areas: \(focusAreas)

        Generate:
        1. 10 key terms with definitions
        2. 5 important dates to memorize
        3. 5 potential essay questions
        4. 10 multiple choice practice questions with answers
        5. Key themes and concepts to understand
        6. Study tips specific to this topic

        Format as a complete study guide.
        """
    }

    // MARK: - Interactive Learning Prompts

    static func historicalDebatePrompt(issue: String, perspective1: String, perspective2: String) -> String {
        """
        Create materials for a historical debate on:

        Issue: \(issue)
        Perspective 1: \(perspective1)
        Perspective 2: \(perspective2)

        For each perspective, provide:
        1. Main arguments (3-4 points)
        2. Historical evidence supporting the position
        3. Key figures who held this view
        4. Potential rebuttals to the opposing side
        5. Historical context and background

        Format to help students understand both sides of the historical issue.
        """
    }

    static func rolePlayScenarioPrompt(historicalPeriod: String, character: String) -> String {
        """
        Create a role-play scenario for historical understanding:

        Time Period: \(historicalPeriod)
        Character Role: \(character)

        Provide:
        1. Character background and context
        2. Historical situation/scenario
        3. Key challenges the character faced
        4. Important decisions to consider
        5. Historical constraints and options available
        6. Outcome considerations

        Make it educational and engaging for historical understanding.
        """
    }
}
