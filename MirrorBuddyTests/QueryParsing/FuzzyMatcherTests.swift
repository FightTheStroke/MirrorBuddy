//
//  FuzzyMatcherTests.swift
//  MirrorBuddyTests
//
//  Task 115.2: Tests for fuzzy matching algorithms
//  Tests Levenshtein distance, Soundex, and Jaro-Winkler similarity
//

@testable import MirrorBuddy
import XCTest

final class FuzzyMatcherTests: XCTestCase {
    var matcher: FuzzyMatcher!

    override func setUp() {
        super.setUp()
        matcher = FuzzyMatcher(config: .default)
    }

    // MARK: - Levenshtein Distance Tests

    func testLevenshteinIdenticalStrings() {
        let distance = matcher.levenshteinDistance("hello", "hello")
        XCTAssertEqual(distance, 0)
    }

    func testLevenshteinSingleInsertion() {
        let distance = matcher.levenshteinDistance("hello", "helo")
        XCTAssertEqual(distance, 1)
    }

    func testLevenshteinSingleDeletion() {
        let distance = matcher.levenshteinDistance("hello", "helllo")
        XCTAssertEqual(distance, 1)
    }

    func testLevenshteinSingleSubstitution() {
        let distance = matcher.levenshteinDistance("hello", "hallo")
        XCTAssertEqual(distance, 1)
    }

    func testLevenshteinMultipleEdits() {
        let distance = matcher.levenshteinDistance("kitten", "sitting")
        XCTAssertEqual(distance, 3) // k→s, e→i, insert g
    }

    func testLevenshteinQuadraticEquation() {
        let distance = matcher.levenshteinDistance("quadratic", "quadrtatic")
        XCTAssertEqual(distance, 1) // Missing 'a'
    }

    func testLevenshteinComplexTypo() {
        let distance = matcher.levenshteinDistance("mnemonic", "noomonic")
        XCTAssertEqual(distance, 2) // m→n, n→o
    }

    func testLevenshteinEmptyStrings() {
        XCTAssertEqual(matcher.levenshteinDistance("", ""), 0)
        XCTAssertEqual(matcher.levenshteinDistance("hello", ""), 5)
        XCTAssertEqual(matcher.levenshteinDistance("", "hello"), 5)
    }

    func testLevenshteinCaseSensitivity() {
        // Default matcher is case-insensitive
        let distance1 = matcher.levenshteinDistance("hello", "HELLO")
        let distance2 = matcher.levenshteinDistance("hello", "hello")

        // After normalization, should be same
        XCTAssertEqual(distance1, distance2)
    }

    // MARK: - Soundex Tests

    func testSoundexBasic() {
        XCTAssertEqual(matcher.soundex("Robert"), "R163")
        XCTAssertEqual(matcher.soundex("Rupert"), "R163")
    }

    func testSoundexPhoneticSimilarity() {
        XCTAssertEqual(matcher.soundex("Smith"), "S530")
        XCTAssertEqual(matcher.soundex("Smyth"), "S530")
    }

    func testSoundexMnemonic() {
        let code1 = matcher.soundex("mnemonic")
        let code2 = matcher.soundex("noomonic")
        let code3 = matcher.soundex("neumonic")

        // All should have similar codes (though not necessarily identical)
        XCTAssertEqual(code1.first, "M")
        XCTAssertEqual(code2.first, "N")
        XCTAssertEqual(code3.first, "N")
    }

    func testSoundexPhosphorus() {
        let code1 = matcher.soundex("phosphorus")
        let code2 = matcher.soundex("fosforus")

        // Should match phonetically
        XCTAssertEqual(code1, code2)
    }

    func testSoundexEmptyString() {
        XCTAssertEqual(matcher.soundex(""), "0000")
    }

    func testSoundexSingleCharacter() {
        let code = matcher.soundex("A")
        XCTAssertEqual(code.first, "A")
        XCTAssertEqual(code.count, 4)
    }

    func testSoundexNumbersAndSpecialChars() {
        // Should ignore non-letters
        let code = matcher.soundex("test123")
        XCTAssertEqual(code, matcher.soundex("test"))
    }

    func testSoundexDuplicateConsonants() {
        // Should collapse duplicates
        XCTAssertEqual(matcher.soundex("letter"), matcher.soundex("leter"))
    }

    // MARK: - Fuzzy Matching Tests

    func testFindBestMatchExact() {
        let candidates = ["apple", "banana", "cherry"]
        let result = matcher.findBestMatch(query: "apple", in: candidates)

        XCTAssertNotNil(result)
        XCTAssertEqual(result?.matchedString, "apple")
        XCTAssertEqual(result?.score, 1.0)
        XCTAssertEqual(result?.matchType, .exact)
    }

    func testFindBestMatchTypo() {
        let candidates = ["quadratic equation", "linear equation", "cubic equation"]
        let result = matcher.findBestMatch(query: "quadrtatic equation", in: candidates)

        XCTAssertNotNil(result)
        XCTAssertEqual(result?.matchedString, "quadratic equation")
        XCTAssertGreaterThan(try XCTUnwrap(result).score, 0.8)
    }

    func testFindBestMatchPhonetic() {
        let matcher = FuzzyMatcher(config: FuzzyMatchConfig(
            levenshteinThreshold: 10,
            minimumSimilarity: 0.5,
            enablePhonetic: true
        ))

        let candidates = ["mnemonic devices", "memory techniques", "recall methods"]
        let result = matcher.findBestMatch(query: "noomonic devices", in: candidates)

        XCTAssertNotNil(result)
        XCTAssertEqual(result?.matchedString, "mnemonic devices")
    }

    func testFindMatchesMultiple() {
        let candidates = [
            "algebra basics",
            "advanced algebra",
            "algebra applications",
            "geometry basics"
        ]

        let matches = matcher.findMatches(query: "algebra", in: candidates)

        // Should find all 3 algebra matches
        XCTAssertGreaterThanOrEqual(matches.count, 3)
        XCTAssertTrue(matches.allSatisfy { $0.matchedString.contains("algebra") })
    }

    func testFindMatchesThreshold() {
        let strictMatcher = FuzzyMatcher(config: .strict)

        let candidates = ["test", "testing", "tester", "attest"]
        let matches = strictMatcher.findMatches(query: "test", in: candidates)

        // Strict config should be more selective
        XCTAssertLessThan(matches.count, 4)
    }

    func testFindMatchesEmpty() {
        let matches = matcher.findMatches(query: "test", in: [])
        XCTAssertTrue(matches.isEmpty)
    }

    func testFindMatchesNoMatches() {
        let matcher = FuzzyMatcher(config: .strict)
        let candidates = ["apple", "banana", "cherry"]
        let matches = matcher.findMatches(query: "zebra", in: candidates)

        // Should find no matches with strict config
        XCTAssertTrue(matches.isEmpty)
    }

    // MARK: - Partial Matching Tests

    func testPartialMatchSubstring() {
        let matcher = FuzzyMatcher(config: FuzzyMatchConfig(
            enablePartialMatch: true
        ))

        let candidates = ["algebraic expressions", "basic algebra", "calculus"]
        let result = matcher.findBestMatch(query: "algebra", in: candidates)

        XCTAssertNotNil(result)
        XCTAssertTrue(try XCTUnwrap(result).matchedString.contains("algebra"))
    }

    func testPartialMatchWordLevel() {
        let matcher = FuzzyMatcher(config: .relaxed)

        let candidates = ["introduction to calculus", "calculus basics", "algebra introduction"]
        let matches = matcher.findMatches(query: "intro calculus", in: candidates)

        XCTAssertGreaterThan(matches.count, 0)
        XCTAssertTrue(matches.first.matchedString.contains("calculus"))
    }

    // MARK: - Configuration Tests

    func testDefaultConfiguration() {
        let defaultMatcher = FuzzyMatcher(config: .default)

        XCTAssertEqual(defaultMatcher.config.levenshteinThreshold, 3)
        XCTAssertEqual(defaultMatcher.config.minimumSimilarity, 0.6)
        XCTAssertTrue(defaultMatcher.config.enablePhonetic)
        XCTAssertTrue(defaultMatcher.config.enablePartialMatch)
    }

    func testStrictConfiguration() {
        let strictMatcher = FuzzyMatcher(config: .strict)

        XCTAssertEqual(strictMatcher.config.levenshteinThreshold, 2)
        XCTAssertEqual(strictMatcher.config.minimumSimilarity, 0.8)
        XCTAssertFalse(strictMatcher.config.enablePhonetic)
        XCTAssertFalse(strictMatcher.config.enablePartialMatch)
    }

    func testRelaxedConfiguration() {
        let relaxedMatcher = FuzzyMatcher(config: .relaxed)

        XCTAssertEqual(relaxedMatcher.config.levenshteinThreshold, 5)
        XCTAssertEqual(relaxedMatcher.config.minimumSimilarity, 0.5)
        XCTAssertTrue(relaxedMatcher.config.enablePhonetic)
        XCTAssertTrue(relaxedMatcher.config.enablePartialMatch)
    }

    // MARK: - Jaro-Winkler Tests

    func testJaroWinklerIdentical() {
        let similarity = matcher.jaroWinklerSimilarity("hello", "hello")
        XCTAssertEqual(similarity, 1.0)
    }

    func testJaroWinklerSimilar() {
        let similarity = matcher.jaroWinklerSimilarity("martha", "marhta")
        XCTAssertGreaterThan(similarity, 0.9) // Very similar
    }

    func testJaroWinklerDifferent() {
        let similarity = matcher.jaroWinklerSimilarity("hello", "world")
        XCTAssertLessThan(similarity, 0.5) // Not similar
    }

    func testJaroWinklerCommonPrefix() {
        // Should favor strings with common prefix
        let sim1 = matcher.jaroWinklerSimilarity("test123", "test456")
        let sim2 = matcher.jaroWinklerSimilarity("abc123", "xyz456")

        XCTAssertGreaterThan(sim1, sim2)
    }

    // MARK: - Real-World Use Cases

    func testMaterialTitleTypos() {
        let candidates = [
            "Quadratic Equations Chapter 5",
            "Linear Equations Basics",
            "Polynomial Functions"
        ]

        let result = matcher.findBestMatch(query: "quadrtatic equations", in: candidates)

        XCTAssertNotNil(result)
        XCTAssertTrue(try XCTUnwrap(result).matchedString.contains("Quadratic"))
    }

    func testPhoneticVariations() {
        let matcher = FuzzyMatcher(config: .relaxed)

        let candidates = [
            "Phosphorus Properties",
            "Nitrogen Cycle",
            "Carbon Chemistry"
        ]

        let result = matcher.findBestMatch(query: "fosforus properties", in: candidates)

        XCTAssertNotNil(result)
        XCTAssertTrue(try XCTUnwrap(result).matchedString.contains("Phosphorus"))
    }

    func testMultiWordQueries() {
        let candidates = [
            "Introduction to Organic Chemistry",
            "Advanced Organic Chemistry",
            "Basic Chemistry Concepts"
        ]

        let matches = matcher.findMatches(query: "organic chemistry", in: candidates)

        XCTAssertGreaterThanOrEqual(matches.count, 2)
        XCTAssertTrue(matches.allSatisfy { $0.matchedString.contains("Organic") })
    }

    // MARK: - Edge Cases

    func testVeryLongStrings() {
        let longString = String(repeating: "a", count: 1_000)
        let longStringWithTypo = String(repeating: "a", count: 999) + "b"

        let distance = matcher.levenshteinDistance(longString, longStringWithTypo)
        XCTAssertEqual(distance, 2) // One deletion, one substitution
    }

    func testUnicodeCharacters() {
        let distance = matcher.levenshteinDistance("café", "cafe")
        XCTAssertEqual(distance, 1) // é → e
    }

    func testSpecialCharacters() {
        let candidates = ["C++ Programming", "C# Basics", "C Programming"]
        let result = matcher.findBestMatch(query: "c++ programming", in: candidates)

        XCTAssertNotNil(result)
        XCTAssertEqual(result?.matchedString, "C++ Programming")
    }

    func testEmptyQuery() {
        let candidates = ["test1", "test2"]
        let result = matcher.findBestMatch(query: "", in: candidates)

        // Should handle gracefully
        XCTAssertNil(result)
    }

    // MARK: - Performance Tests

    func testLevenshteinPerformance() {
        measure {
            for _ in 0..<1_000 {
                _ = matcher.levenshteinDistance("quadratic equation", "quadrtatic equation")
            }
        }
        // Should complete in reasonable time
    }

    func testSoundexPerformance() {
        measure {
            for _ in 0..<1_000 {
                _ = matcher.soundex("phosphorus")
            }
        }
        // Should be very fast (O(n))
    }

    func testFuzzyMatchPerformanceLarge() {
        let candidates = (0..<1_000).map { "material \($0)" }

        measure {
            _ = matcher.findMatches(query: "material 500", in: candidates)
        }
        // Should handle 1000 candidates efficiently
    }

    // MARK: - Convenience Extension Tests

    func testMatchWithConfig() {
        let candidates = ["test", "testing", "tester"]
        let matches = FuzzyMatcher.matchWithConfig(
            query: "test",
            candidates: candidates,
            threshold: 0.8,
            maxDistance: 2,
            phonetic: false
        )

        XCTAssertGreaterThan(matches.count, 0)
    }
}
