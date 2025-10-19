@testable import MirrorBuddy
import XCTest

@MainActor
final class ItalianModeTests: XCTestCase {
    var italianMode: ItalianModeService!

    override func setUp() {
        super.setUp()
        italianMode = ItalianModeService.shared
    }

    override func tearDown() {
        italianMode = nil
        super.tearDown()
    }

    // MARK: - ItalianModeService Tests

    func testStartSession() {
        // Given
        let topic = ItalianTopic.grammar
        let level = GrammarLevel.intermediate

        // When
        italianMode.startSession(topic: topic, level: level)

        // Then
        XCTAssertEqual(italianMode.currentTopic, topic)
        XCTAssertEqual(italianMode.grammarLevel, level)
    }

    func testRecordVocabularyPractice() {
        // Given
        let word = VocabularyWord(
            italian: "casa",
            english: "house",
            level: .beginner,
            category: .nouns,
            exampleSentence: "La mia casa è grande."
        )

        // When
        italianMode.recordVocabularyPractice(word, correct: true)

        // Then
        XCTAssertEqual(italianMode.vocabularyProgress.reviewingWords.count, 1)
    }

    func testGetSessionStats() {
        // Given
        italianMode.startSession(topic: .grammar, level: .intermediate)

        // When
        let stats = italianMode.getSessionStats()

        // Then
        XCTAssertEqual(stats.topic, .grammar)
        XCTAssertEqual(stats.grammarLevel, .intermediate)
    }

    // MARK: - ItalianGrammarHelper Tests

    func testGetBeginnerRules() {
        // Given
        let helper = ItalianGrammarHelper()

        // When
        let rules = helper.getRules(for: .beginner)

        // Then
        XCTAssertFalse(rules.isEmpty)
        XCTAssertTrue(rules.contains { $0.level == .beginner })
    }

    func testSearchGrammarRules() {
        // Given
        let helper = ItalianGrammarHelper()

        // When
        let results = helper.searchRules(query: "article")

        // Then
        XCTAssertFalse(results.isEmpty)
    }

    func testAnalyzeSentence() {
        // Given
        let helper = ItalianGrammarHelper()
        let sentence = "Il libro è interessante."

        // When
        let analysis = helper.analyzeSentence(sentence)

        // Then
        XCTAssertEqual(analysis.sentence, sentence)
        XCTAssertNotNil(analysis.overallCorrectness)
    }

    func testGetArticlesExplanation() {
        // Given
        let helper = ItalianGrammarHelper()

        // When
        let explanation = helper.getExplanation(for: .articles)

        // Then
        XCTAssertFalse(explanation.summary.isEmpty)
        XCTAssertFalse(explanation.practiceExercises.isEmpty)
    }

    // MARK: - ItalianConjugationTables Tests

    func testConjugateRegularAREVerb() {
        // Given
        let tables = ItalianConjugationTables()

        // When
        let conjugation = tables.getConjugation(verb: "parlare")

        // Then
        XCTAssertNotNil(conjugation)
        XCTAssertEqual(conjugation?.infinitive, "parlare")
        XCTAssertEqual(conjugation?.type, .are)
        XCTAssertEqual(conjugation?.presenteIndicativo.forms["io"], "parlo")
    }

    func testConjugateIrregularVerb() {
        // Given
        let tables = ItalianConjugationTables()

        // When
        let conjugation = tables.getConjugation(verb: "essere")

        // Then
        XCTAssertNotNil(conjugation)
        XCTAssertEqual(conjugation?.type, .irregular)
        XCTAssertEqual(conjugation?.presenteIndicativo.forms["io"], "sono")
        XCTAssertEqual(conjugation?.presenteIndicativo.forms["tu"], "sei")
    }

    func testGetSpecificTense() {
        // Given
        let tables = ItalianConjugationTables()

        // When
        let tense = tables.getConjugationForTense(verb: "avere", tense: .futuroSemplice)

        // Then
        XCTAssertNotNil(tense)
        XCTAssertEqual(tense?.forms["io"], "avrò")
    }

    func testAllTensesPresent() {
        // Given
        let tables = ItalianConjugationTables()

        // When
        let conjugation = tables.getConjugation(verb: "parlare")

        // Then
        XCTAssertNotNil(conjugation?.presenteIndicativo)
        XCTAssertNotNil(conjugation?.imperfettoIndicativo)
        XCTAssertNotNil(conjugation?.passatoRemoto)
        XCTAssertNotNil(conjugation?.futuroSemplice)
        XCTAssertNotNil(conjugation?.condizionalePresente)
        XCTAssertNotNil(conjugation?.presenteCongiuntivo)
        XCTAssertNotNil(conjugation?.imperfettoCongiuntivo)
        XCTAssertNotNil(conjugation?.imperativo)
    }

    // MARK: - ItalianVocabularyBuilder Tests

    func testGetWordsForTopic() {
        // Given
        let builder = ItalianVocabularyBuilder()

        // When
        let words = builder.getWords(for: .vocabulary)

        // Then
        XCTAssertFalse(words.isEmpty)
    }

    func testGetWordsByLevel() {
        // Given
        let builder = ItalianVocabularyBuilder()

        // When
        let beginnerWords = builder.getWordsByLevel(.beginner)

        // Then
        XCTAssertFalse(beginnerWords.isEmpty)
        XCTAssertTrue(beginnerWords.allSatisfy { $0.level == .beginner })
    }

    func testGetWordsByCategory() {
        // Given
        let builder = ItalianVocabularyBuilder()

        // When
        let nouns = builder.getWordsByCategory(.nouns)

        // Then
        XCTAssertFalse(nouns.isEmpty)
        XCTAssertTrue(nouns.allSatisfy { $0.category == .nouns })
    }

    func testSearchWords() {
        // Given
        let builder = ItalianVocabularyBuilder()

        // When
        let results = builder.search(query: "casa")

        // Then
        XCTAssertFalse(results.isEmpty)
        XCTAssertTrue(results.contains { $0.italian.lowercased() == "casa" })
    }

    // MARK: - ItalianReadingAssistant Tests

    func testAnalyzeTextDifficulty() {
        // Given
        let assistant = ItalianReadingAssistant()
        let simpleText = "Il gatto è nero. La casa è grande."
        let complexText = "Nonostante le molteplici difficoltà incontrate durante il percorso, riuscimmo a raggiungere l'obiettivo prefissato."

        // When
        let simpleDifficulty = assistant.analyzeTextDifficulty(simpleText)
        let complexDifficulty = assistant.analyzeTextDifficulty(complexText)

        // Then
        XCTAssertNotNil(simpleDifficulty.score)
        XCTAssertNotNil(complexDifficulty.score)
        XCTAssertTrue(complexDifficulty.score > simpleDifficulty.score)
    }

    func testExtractKeyVocabulary() {
        // Given
        let assistant = ItalianReadingAssistant()
        let text = "Il libro interessante racconta una storia avvincente."

        // When
        let vocabulary = assistant.extractKeyVocabulary(text)

        // Then
        XCTAssertFalse(vocabulary.isEmpty)
    }

    func testGenerateComprehensionQuestions() {
        // Given
        let assistant = ItalianReadingAssistant()
        let text = "Marco va a scuola ogni giorno."

        // When
        let questions = assistant.generateComprehensionQuestions(text, count: 3)

        // Then
        XCTAssertEqual(questions.count, 3)
        XCTAssertFalse(questions[0].question.isEmpty)
    }

    func testSuggestReadingStrategies() {
        // Given
        let assistant = ItalianReadingAssistant()
        let difficulty = TextDifficulty(level: .beginner, score: 10, wordCount: 50, estimatedReadingTime: 15, vocabularyLevel: "Simple")

        // When
        let strategies = assistant.suggestReadingStrategies(for: difficulty)

        // Then
        XCTAssertFalse(strategies.isEmpty)
        XCTAssertTrue(strategies.allSatisfy { !$0.name.isEmpty && !$0.description.isEmpty })
    }

    // MARK: - ItalianAudioReader Tests

    func testInitialization() {
        // Given/When
        let reader = ItalianAudioReader()

        // Then
        XCTAssertFalse(reader.isPlaying)
        XCTAssertFalse(reader.isPaused)
        XCTAssertNil(reader.currentText)
    }

    func testReadText() {
        // Given
        let reader = ItalianAudioReader()
        let text = "Ciao, come stai?"

        // When
        reader.read(text)

        // Then
        XCTAssertEqual(reader.currentText, text)
        XCTAssertTrue(reader.isPlaying)
    }

    func testPauseAndResume() {
        // Given
        let reader = ItalianAudioReader()
        reader.read("Test text")

        // When
        reader.pause()

        // Then
        XCTAssertTrue(reader.isPaused)

        // When
        reader.resume()

        // Then
        XCTAssertFalse(reader.isPaused)
    }

    func testStop() {
        // Given
        let reader = ItalianAudioReader()
        reader.read("Test text")

        // When
        reader.stop()

        // Then
        XCTAssertFalse(reader.isPlaying)
        XCTAssertNil(reader.currentText)
    }

    // MARK: - ItalianPrompts Tests

    func testGetTopicPrompt() {
        // Given
        let prompts = ItalianPrompts()

        // When
        let prompt = prompts.getTopicPrompt(for: .grammar, level: .intermediate)

        // Then
        XCTAssertFalse(prompt.isEmpty)
        XCTAssertTrue(prompt.contains("grammatica") || prompt.contains("grammar"))
    }

    func testGetGrammarExplanationPrompt() {
        // Given
        let prompts = ItalianPrompts()

        // When
        let prompt = prompts.getGrammarExplanationPrompt(concept: "articoli", level: .beginner)

        // Then
        XCTAssertFalse(prompt.isEmpty)
        XCTAssertTrue(prompt.contains("articoli"))
    }

    func testGetConversationPrompt() {
        // Given
        let prompts = ItalianPrompts()

        // When
        let prompt = prompts.getConversationPrompt(topic: "cibo")

        // Then
        XCTAssertFalse(prompt.isEmpty)
        XCTAssertTrue(prompt.contains("cibo"))
    }

    // MARK: - ItalianMindMapTemplate Tests

    func testGenerateGrammarTemplate() {
        // Given
        let templateGenerator = ItalianMindMapTemplate()

        // When
        let template = templateGenerator.generateTemplate(for: .grammar)

        // Then
        XCTAssertEqual(template.topic, .grammar)
        XCTAssertFalse(template.branches.isEmpty)
        XCTAssertFalse(template.studyNotes.isEmpty)
    }

    func testGenerateVocabularyTemplate() {
        // Given
        let templateGenerator = ItalianMindMapTemplate()

        // When
        let template = templateGenerator.generateTemplate(for: .vocabulary)

        // Then
        XCTAssertEqual(template.topic, .vocabulary)
        XCTAssertTrue(template.branches.contains { $0.title.contains("Vocabolario") || $0.title.contains("Quotidiana") })
    }

    func testGenerateLiteratureTemplate() {
        // Given
        let templateGenerator = ItalianMindMapTemplate()

        // When
        let template = templateGenerator.generateTemplate(for: .literature)

        // Then
        XCTAssertEqual(template.topic, .literature)
        XCTAssertTrue(template.branches.contains { $0.title.contains("Periodi") || $0.title.contains("Letterari") })
    }
}
