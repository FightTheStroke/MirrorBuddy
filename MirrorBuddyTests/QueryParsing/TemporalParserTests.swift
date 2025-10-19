//
//  TemporalParserTests.swift
//  MirrorBuddyTests
//
//  Task 115.1: Tests for temporal reference parsing
//  Tests all temporal patterns including edge cases
//

@testable import MirrorBuddy
import XCTest

final class TemporalParserTests: XCTestCase {
    // MARK: - Absolute Temporal Tests

    func testParseTodayEnglish() throws {
        let result = TemporalParser.parseTemporal("show materials from today")

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 1.0)
        XCTAssertEqual(unwrapped.parsedExpression, "today")

        // Verify date range is for today
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: Date())
        XCTAssertEqual(calendar.startOfDay(for: unwrapped.start), startOfDay)
    }

    func testParseTodayItalian() {
        let result = TemporalParser.parseTemporal("mostra materiali di oggi")

        XCTAssertNotNil(result)
        XCTAssertEqual(result?.confidence, 1.0)
        XCTAssertEqual(result?.parsedExpression, "today")
    }

    func testParseYesterdayEnglish() throws {
        let result = TemporalParser.parseTemporal("materials from yesterday")

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 1.0)
        XCTAssertEqual(unwrapped.parsedExpression, "yesterday")

        // Verify date range is for yesterday
        let calendar = Calendar.current
        guard let yesterday = calendar.date(byAdding: .day, value: -1, to: Date()) else {
            XCTFail("Failed to calculate yesterday's date")
            return
        }
        let startOfYesterday = calendar.startOfDay(for: yesterday)

        XCTAssertEqual(calendar.startOfDay(for: unwrapped.start), startOfYesterday)
    }

    func testParseYesterdayItalian() {
        let result = TemporalParser.parseTemporal("materiali di ieri")

        XCTAssertNotNil(result)
        XCTAssertEqual(result?.parsedExpression, "yesterday")
    }

    func testParseDayBeforeYesterday() throws {
        let result = TemporalParser.parseTemporal("show materials from day before yesterday")

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 1.0)
        XCTAssertEqual(unwrapped.parsedExpression, "day before yesterday")

        // Verify it's 2 days ago
        let calendar = Calendar.current
        guard let twoDaysAgo = calendar.date(byAdding: .day, value: -2, to: Date()) else {
            XCTFail("Failed to calculate 2 days ago")
            return
        }
        let startOfDay = calendar.startOfDay(for: twoDaysAgo)

        XCTAssertEqual(calendar.startOfDay(for: unwrapped.start), startOfDay)
    }

    func testParseThisWeek() throws {
        let result = TemporalParser.parseTemporal("materials from this week")

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 0.9)
        XCTAssertEqual(unwrapped.parsedExpression, "this week")

        // Verify start is beginning of current week
        let calendar = Calendar.current
        let startOfWeek = calendar.dateInterval(of: .weekOfYear, for: Date())?.start

        XCTAssertEqual(calendar.startOfDay(for: unwrapped.start), startOfWeek)
    }

    func testParseThisMonth() throws {
        let result = TemporalParser.parseTemporal("this month's materials")

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 0.9)
        XCTAssertEqual(unwrapped.parsedExpression, "this month")

        // Verify start is beginning of current month
        let calendar = Calendar.current
        let startOfMonth = calendar.dateInterval(of: .month, for: Date())?.start

        XCTAssertEqual(calendar.startOfDay(for: unwrapped.start), startOfMonth)
    }

    // MARK: - Relative Temporal Tests

    func testParseThreeDaysAgo() throws {
        let result = TemporalParser.parseTemporal("show materials from 3 days ago")

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 0.95)
        XCTAssertEqual(unwrapped.parsedExpression, "3 days ago")

        // Verify it's 3 days ago
        let calendar = Calendar.current
        guard let threeDaysAgo = calendar.date(byAdding: .day, value: -3, to: Date()) else {
            XCTFail("Failed to calculate 3 days ago")
            return
        }
        let startOfDay = calendar.startOfDay(for: threeDaysAgo)

        XCTAssertEqual(calendar.startOfDay(for: unwrapped.start), startOfDay)
    }

    func testParseTwoWeeksAgo() throws {
        let result = TemporalParser.parseTemporal("materials from 2 weeks ago")

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 0.95)
        XCTAssertEqual(unwrapped.parsedExpression, "2 weeks ago")

        // Verify it's 2 weeks ago
        let calendar = Calendar.current
        guard let twoWeeksAgo = calendar.date(byAdding: .weekOfYear, value: -2, to: Date()) else {
            XCTFail("Failed to calculate 2 weeks ago")
            return
        }
        let startOfDay = calendar.startOfDay(for: twoWeeksAgo)

        XCTAssertEqual(calendar.startOfDay(for: unwrapped.start), startOfDay)
    }

    func testParseOneMonthAgo() throws {
        let result = TemporalParser.parseTemporal("materials from 1 month ago")

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 0.95)
        XCTAssertEqual(unwrapped.parsedExpression, "1 month ago")

        // Verify it's 1 month ago
        let calendar = Calendar.current
        guard let oneMonthAgo = calendar.date(byAdding: .month, value: -1, to: Date()) else {
            XCTFail("Failed to calculate 1 month ago")
            return
        }
        let startOfDay = calendar.startOfDay(for: oneMonthAgo)

        XCTAssertEqual(calendar.startOfDay(for: unwrapped.start), startOfDay)
    }

    func testParseItalianGiorniFa() {
        let result = TemporalParser.parseTemporal("materiali di 5 giorni fa")

        XCTAssertNotNil(result)
        XCTAssertEqual(result?.parsedExpression, "5 giorni fa")
    }

    func testParseItalianSettimaneFa() {
        let result = TemporalParser.parseTemporal("materiali di 3 settimane fa")

        XCTAssertNotNil(result)
        XCTAssertEqual(result?.parsedExpression, "3 settimane fa")
    }

    // MARK: - Named Day Tests

    func testParseLastMonday() throws {
        let result = TemporalParser.parseTemporal("show materials from last Monday")

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 0.9)
        XCTAssertEqual(unwrapped.parsedExpression, "last monday")

        // Verify it's a Monday
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: unwrapped.start)
        XCTAssertEqual(weekday, 2) // Monday = 2
    }

    func testParseLastFriday() throws {
        let result = TemporalParser.parseTemporal("materials from last Friday")

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.parsedExpression, "last friday")

        // Verify it's a Friday
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: unwrapped.start)
        XCTAssertEqual(weekday, 6) // Friday = 6
    }

    func testParseThisTuesday() throws {
        let result = TemporalParser.parseTemporal("materials from this Tuesday")

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 0.85)
        XCTAssertEqual(unwrapped.parsedExpression, "this tuesday")

        // Verify it's a Tuesday
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: unwrapped.start)
        XCTAssertEqual(weekday, 3) // Tuesday = 3
    }

    func testParseItalianScorsoMartedi() throws {
        let result = TemporalParser.parseTemporal("materiali di martedì scorso")

        let unwrapped = try XCTUnwrap(result)
        XCTAssertTrue(unwrapped.parsedExpression.contains("mart"))
    }

    // MARK: - Last Reference Tests

    func testParseLastWeek() throws {
        let result = TemporalParser.parseTemporal("materials from last week")

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 0.95)
        XCTAssertEqual(unwrapped.parsedExpression, "last week")

        // Verify it's a full week interval
        let duration = unwrapped.end.timeIntervalSince(unwrapped.start)
        XCTAssertEqual(duration, 7 * 24 * 60 * 60, accuracy: 60) // ~7 days
    }

    func testParseLastMonth() throws {
        let result = TemporalParser.parseTemporal("last month's materials")

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 0.95)
        XCTAssertEqual(unwrapped.parsedExpression, "last month")

        // Verify it's a month interval (approximately)
        let duration = unwrapped.end.timeIntervalSince(unwrapped.start)
        XCTAssertGreaterThan(duration, 28 * 24 * 60 * 60) // At least 28 days
        XCTAssertLessThan(duration, 32 * 24 * 60 * 60) // At most 32 days
    }

    func testParseLastYear() throws {
        let result = TemporalParser.parseTemporal("materials from last year")

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 0.95)
        XCTAssertEqual(unwrapped.parsedExpression, "last year")
    }

    // MARK: - Contextual Reference Tests

    func testParseRecent() throws {
        let result = TemporalParser.parseTemporal("show recent materials")

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 0.7)
        XCTAssertEqual(unwrapped.parsedExpression, "recent (last 7 days)")

        // Verify it's ~7 days
        let duration = unwrapped.end.timeIntervalSince(unwrapped.start)
        XCTAssertEqual(duration, 7 * 24 * 60 * 60, accuracy: 60)
    }

    func testParseLatest() throws {
        let result = TemporalParser.parseTemporal("show latest materials")

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 0.8)
        XCTAssertEqual(unwrapped.parsedExpression, "latest (last 24 hours)")

        // Verify it's ~24 hours
        let duration = unwrapped.end.timeIntervalSince(unwrapped.start)
        XCTAssertEqual(duration, 24 * 60 * 60, accuracy: 60)
    }

    func testParseMostRecent() throws {
        let result = TemporalParser.parseTemporal("most recent materials")

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 0.75)
        XCTAssertEqual(unwrapped.parsedExpression, "most recent (last 3 days)")

        // Verify it's ~3 days
        let duration = unwrapped.end.timeIntervalSince(unwrapped.start)
        XCTAssertEqual(duration, 3 * 24 * 60 * 60, accuracy: 60)
    }

    // MARK: - Relative Reference Tests

    func testParseBeforeReference() throws {
        let referenceDate = Date()
        let result = TemporalParser.parseRelativeReference("before this", relativeTo: referenceDate)

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 0.7)
        XCTAssertLessThan(unwrapped.start, referenceDate)
        XCTAssertEqual(unwrapped.end, referenceDate)
    }

    func testParseAfterReference() throws {
        let referenceDate = Date()
        let result = TemporalParser.parseRelativeReference("after that", relativeTo: referenceDate)

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 0.7)
        XCTAssertEqual(unwrapped.start, referenceDate)
        XCTAssertGreaterThan(unwrapped.end, referenceDate)
    }

    func testParsePreviousReference() throws {
        let referenceDate = Date()
        let result = TemporalParser.parseRelativeReference("previous", relativeTo: referenceDate)

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 0.8)
        XCTAssertLessThan(unwrapped.start, referenceDate)
    }

    func testParseNextReference() throws {
        let referenceDate = Date()
        let result = TemporalParser.parseRelativeReference("next", relativeTo: referenceDate)

        let unwrapped = try XCTUnwrap(result)
        XCTAssertEqual(unwrapped.confidence, 0.8)
        XCTAssertGreaterThan(unwrapped.start, referenceDate)
    }

    // MARK: - Edge Cases

    func testParseEmptyString() {
        let result = TemporalParser.parseTemporal("")

        XCTAssertNil(result)
    }

    func testParseNonTemporalQuery() {
        let result = TemporalParser.parseTemporal("show materials about algebra")

        XCTAssertNil(result)
    }

    func testParseMultipleTemporalReferences() {
        // Should match first valid pattern
        let result = TemporalParser.parseTemporal("show materials from yesterday and today")

        XCTAssertNotNil(result)
        // Should match "yesterday" first
        XCTAssertEqual(result?.parsedExpression, "yesterday")
    }

    func testParseMixedLanguage() {
        let result = TemporalParser.parseTemporal("show materials from ieri") // Mixed English-Italian

        XCTAssertNotNil(result)
        XCTAssertEqual(result?.parsedExpression, "yesterday")
    }

    // MARK: - Performance Tests

    func testParsePerformance() {
        measure {
            for _ in 0..<1_000 {
                _ = TemporalParser.parseTemporal("show materials from 3 days ago")
            }
        }
        // Should complete in reasonable time (< 1 second for 1000 iterations)
    }
}
