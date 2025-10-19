//
//  TemporalParser.swift
//  MirrorBuddy
//
//  Task 115.1: Natural language temporal reference parsing
//  Parses expressions like "last Tuesday", "3 weeks ago", "yesterday", "the last thing I studied"
//

import Foundation

/// Date range result from temporal parsing
struct DateRange {
    let start: Date
    let end: Date
    let confidence: Double
    let parsedExpression: String
}

/// Temporal reference parser for natural language date/time expressions
struct TemporalParser {
    // MARK: - Public API

    /// Parse a temporal reference from natural language text
    /// - Parameter text: Input text containing temporal reference
    /// - Returns: DateRange if a valid temporal expression is found
    static func parseTemporal(_ text: String) -> DateRange? {
        let lowercased = text.lowercased()
        let calendar = Calendar.current
        let now = Date()

        // Try different parsing strategies in order of specificity

        // 1. Absolute temporal references (today, yesterday, etc.)
        if let range = parseAbsoluteTemporal(lowercased, calendar: calendar, now: now) {
            return range
        }

        // 2. Relative temporal references (X days/weeks/months ago)
        if let range = parseRelativeTemporal(lowercased, calendar: calendar, now: now) {
            return range
        }

        // 3. Named day references (last Monday, this Tuesday, etc.)
        if let range = parseNamedDayReference(lowercased, calendar: calendar, now: now) {
            return range
        }

        // 4. "Last" references (last week, last month, etc.)
        if let range = parseLastReference(lowercased, calendar: calendar, now: now) {
            return range
        }

        // 5. Contextual references (recent, latest, etc.)
        if let range = parseContextualReference(lowercased, calendar: calendar, now: now) {
            return range
        }

        return nil
    }

    // MARK: - Parsing Strategies

    /// Parse absolute temporal references (today, yesterday, tomorrow)
    private static func parseAbsoluteTemporal(_ text: String, calendar: Calendar, now: Date) -> DateRange? {
        // Today
        if text.contains("today") || text.contains("oggi") {
            let startOfDay = calendar.startOfDay(for: now)
            return DateRange(
                start: startOfDay,
                end: now,
                confidence: 1.0,
                parsedExpression: "today"
            )
        }

        // Yesterday
        if text.contains("yesterday") || text.contains("ieri") {
            guard let yesterday = calendar.date(byAdding: .day, value: -1, to: now) else { return nil }
            let startOfDay = calendar.startOfDay(for: yesterday)
            guard let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay) else { return nil }
            return DateRange(
                start: startOfDay,
                end: endOfDay,
                confidence: 1.0,
                parsedExpression: "yesterday"
            )
        }

        // Day before yesterday
        if text.contains("day before yesterday") || text.contains("l'altro ieri") || text.contains("altroieri") {
            guard let twoDaysAgo = calendar.date(byAdding: .day, value: -2, to: now) else { return nil }
            let startOfDay = calendar.startOfDay(for: twoDaysAgo)
            guard let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay) else { return nil }
            return DateRange(
                start: startOfDay,
                end: endOfDay,
                confidence: 1.0,
                parsedExpression: "day before yesterday"
            )
        }

        // This week
        if text.contains("this week") || text.contains("questa settimana") {
            let startOfWeek = calendar.dateInterval(of: .weekOfYear, for: now)?.start ?? now
            return DateRange(
                start: startOfWeek,
                end: now,
                confidence: 0.9,
                parsedExpression: "this week"
            )
        }

        // This month
        if text.contains("this month") || text.contains("questo mese") {
            let startOfMonth = calendar.dateInterval(of: .month, for: now)?.start ?? now
            return DateRange(
                start: startOfMonth,
                end: now,
                confidence: 0.9,
                parsedExpression: "this month"
            )
        }

        return nil
    }

    /// Parse relative temporal references (3 days ago, 2 weeks ago, etc.)
    private static func parseRelativeTemporal(_ text: String, calendar: Calendar, now: Date) -> DateRange? {
        // Regex patterns for different languages
        let patterns = [
            // English: "3 days ago", "2 weeks ago", "1 month ago"
            #"(\d+)\s+(day|days|week|weeks|month|months)\s+ago"#,
            // Italian: "3 giorni fa", "2 settimane fa", "1 mese fa"
            #"(\d+)\s+(giorno|giorni|settimana|settimane|mese|mesi)\s+fa"#
        ]

        for pattern in patterns {
            if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
               let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) {
                // Extract number
                guard let numberRange = Range(match.range(at: 1), in: text),
                      let number = Int(text[numberRange]) else { continue }

                // Extract unit
                guard let unitRange = Range(match.range(at: 2), in: text) else { continue }
                let unit = String(text[unitRange]).lowercased()

                // Determine calendar component
                let component: Calendar.Component
                if unit.contains("day") || unit.contains("giorn") {
                    component = .day
                } else if unit.contains("week") || unit.contains("settiman") {
                    component = .weekOfYear
                } else if unit.contains("month") || unit.contains("mes") {
                    component = .month
                } else {
                    continue
                }

                // Calculate date range
                guard let startDate = calendar.date(byAdding: component, value: -number, to: now) else { continue }
                let startOfPeriod = calendar.startOfDay(for: startDate)
                guard let endOfPeriod = calendar.date(byAdding: .day, value: 1, to: startOfPeriod) else { continue }

                return DateRange(
                    start: startOfPeriod,
                    end: endOfPeriod,
                    confidence: 0.95,
                    parsedExpression: "\(number) \(unit) ago"
                )
            }
        }

        return nil
    }

    /// Parse named day references (last Monday, this Friday, etc.)
    private static func parseNamedDayReference(_ text: String, calendar: Calendar, now: Date) -> DateRange? {
        let dayNames: [(english: String, italian: String, weekday: Int)] = [
            ("sunday", "domenica", 1),
            ("monday", "lunedì", 2),
            ("tuesday", "martedì", 3),
            ("wednesday", "mercoledì", 4),
            ("thursday", "giovedì", 5),
            ("friday", "venerdì", 6),
            ("saturday", "sabato", 7)
        ]

        for (english, italian, weekday) in dayNames {
            let hasDay = text.contains(english) || text.contains(italian)
            guard hasDay else { continue }

            // Check for "last" modifier
            if text.contains("last") || text.contains("scorso") || text.contains("scorsa") {
                // Find the most recent occurrence of this weekday
                guard let targetDate = findPreviousWeekday(weekday, from: now, calendar: calendar) else { continue }
                let startOfDay = calendar.startOfDay(for: targetDate)
                guard let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay) else { return nil }

                return DateRange(
                    start: startOfDay,
                    end: endOfDay,
                    confidence: 0.9,
                    parsedExpression: "last \(english)"
                )
            }

            // Check for "this" modifier
            if text.contains("this") || text.contains("questo") || text.contains("questa") {
                // Find this week's occurrence of the weekday
                guard let targetDate = findWeekdayInCurrentWeek(weekday, from: now, calendar: calendar) else { continue }
                let startOfDay = calendar.startOfDay(for: targetDate)
                guard let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay) else { return nil }

                return DateRange(
                    start: startOfDay,
                    end: endOfDay,
                    confidence: 0.85,
                    parsedExpression: "this \(english)"
                )
            }
        }

        return nil
    }

    /// Parse "last X" references (last week, last month, last year)
    private static func parseLastReference(_ text: String, calendar: Calendar, now: Date) -> DateRange? {
        // Last week
        if (text.contains("last week") || text.contains("settimana scorsa")) && !text.contains("weeks") {
            guard let lastWeek = calendar.date(byAdding: .weekOfYear, value: -1, to: now),
                  let interval = calendar.dateInterval(of: .weekOfYear, for: lastWeek) else { return nil }
            return DateRange(
                start: interval.start,
                end: interval.end,
                confidence: 0.95,
                parsedExpression: "last week"
            )
        }

        // Last month
        if (text.contains("last month") || text.contains("mese scorso")) && !text.contains("months") {
            guard let lastMonth = calendar.date(byAdding: .month, value: -1, to: now),
                  let interval = calendar.dateInterval(of: .month, for: lastMonth) else { return nil }
            return DateRange(
                start: interval.start,
                end: interval.end,
                confidence: 0.95,
                parsedExpression: "last month"
            )
        }

        // Last year
        if text.contains("last year") || text.contains("anno scorso") {
            guard let lastYear = calendar.date(byAdding: .year, value: -1, to: now),
                  let interval = calendar.dateInterval(of: .year, for: lastYear) else { return nil }
            return DateRange(
                start: interval.start,
                end: interval.end,
                confidence: 0.95,
                parsedExpression: "last year"
            )
        }

        return nil
    }

    /// Parse contextual references (recent, latest, last thing)
    private static func parseContextualReference(_ text: String, calendar: Calendar, now: Date) -> DateRange? {
        // "Recent" - default to last 7 days
        if text.contains("recent") || text.contains("recente") || text.contains("recenti") {
            guard let weekAgo = calendar.date(byAdding: .day, value: -7, to: now) else { return nil }
            return DateRange(
                start: weekAgo,
                end: now,
                confidence: 0.7,
                parsedExpression: "recent (last 7 days)"
            )
        }

        // "Latest" or "last thing" - very recent (last 24 hours)
        if text.contains("latest") || text.contains("last thing") ||
            text.contains("ultimo") || text.contains("ultima cosa") {
            guard let dayAgo = calendar.date(byAdding: .day, value: -1, to: now) else { return nil }
            return DateRange(
                start: dayAgo,
                end: now,
                confidence: 0.8,
                parsedExpression: "latest (last 24 hours)"
            )
        }

        // "Most recent" - last 3 days
        if text.contains("most recent") || text.contains("più recente") {
            guard let threeDaysAgo = calendar.date(byAdding: .day, value: -3, to: now) else { return nil }
            return DateRange(
                start: threeDaysAgo,
                end: now,
                confidence: 0.75,
                parsedExpression: "most recent (last 3 days)"
            )
        }

        return nil
    }

    // MARK: - Helper Functions

    /// Find the most recent occurrence of a weekday before the given date
    private static func findPreviousWeekday(_ targetWeekday: Int, from date: Date, calendar: Calendar) -> Date? {
        let currentWeekday = calendar.component(.weekday, from: date)

        // Calculate days to subtract
        var daysToSubtract = currentWeekday - targetWeekday
        if daysToSubtract <= 0 {
            daysToSubtract += 7 // Go to previous week
        }

        return calendar.date(byAdding: .day, value: -daysToSubtract, to: date)
    }

    /// Find a weekday in the current week
    private static func findWeekdayInCurrentWeek(_ targetWeekday: Int, from date: Date, calendar: Calendar) -> Date? {
        let currentWeekday = calendar.component(.weekday, from: date)
        let daysToAdd = targetWeekday - currentWeekday

        return calendar.date(byAdding: .day, value: daysToAdd, to: date)
    }
}

// MARK: - Relative References Extension

extension TemporalParser {
    /// Parse relative references like "before this", "after that", "previous", "next"
    /// Requires context of a reference date
    static func parseRelativeReference(_ text: String, relativeTo referenceDate: Date) -> DateRange? {
        let lowercased = text.lowercased()
        let calendar = Calendar.current

        // "Before this/that"
        if lowercased.contains("before") || lowercased.contains("prima") {
            // Return a range ending at the reference date
            guard let weekBefore = calendar.date(byAdding: .day, value: -7, to: referenceDate) else { return nil }
            return DateRange(
                start: weekBefore,
                end: referenceDate,
                confidence: 0.7,
                parsedExpression: "before reference"
            )
        }

        // "After this/that"
        if lowercased.contains("after") || lowercased.contains("dopo") {
            // Return a range starting at the reference date
            guard let weekAfter = calendar.date(byAdding: .day, value: 7, to: referenceDate) else { return nil }
            return DateRange(
                start: referenceDate,
                end: weekAfter,
                confidence: 0.7,
                parsedExpression: "after reference"
            )
        }

        // "Previous"
        if lowercased.contains("previous") || lowercased.contains("precedente") {
            guard let dayBefore = calendar.date(byAdding: .day, value: -1, to: referenceDate) else { return nil }
            let startOfDay = calendar.startOfDay(for: dayBefore)
            guard let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay) else { return nil }
            return DateRange(
                start: startOfDay,
                end: endOfDay,
                confidence: 0.8,
                parsedExpression: "previous"
            )
        }

        // "Next"
        if lowercased.contains("next") || lowercased.contains("prossimo") || lowercased.contains("prossima") {
            guard let dayAfter = calendar.date(byAdding: .day, value: 1, to: referenceDate) else { return nil }
            let startOfDay = calendar.startOfDay(for: dayAfter)
            guard let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay) else { return nil }
            return DateRange(
                start: startOfDay,
                end: endOfDay,
                confidence: 0.8,
                parsedExpression: "next"
            )
        }

        return nil
    }
}
