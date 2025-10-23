import Foundation
import os.log

/// Comprehensive Italian grammar explanation system
@MainActor
final class ItalianGrammarHelper {
    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "ItalianGrammar")

    // MARK: - Grammar Rules

    /// Get grammar rules for a specific level
    func getRules(for level: GrammarLevel) -> [GrammarRule] {
        switch level {
        case .beginner:
            return beginnerRules
        case .intermediate:
            return intermediateRules
        case .advanced:
            return advancedRules
        }
    }

    /// Search grammar rules by topic
    func searchRules(query: String) -> [GrammarRule] {
        let allRules = beginnerRules + intermediateRules + advancedRules
        let lowercaseQuery = query.lowercased()

        return allRules.filter { rule in
            rule.title.lowercased().contains(lowercaseQuery) ||
                rule.category.rawValue.lowercased().contains(lowercaseQuery) ||
                rule.tags.contains { $0.lowercased().contains(lowercaseQuery) }
        }
    }

    /// Get explanation for a specific grammar concept
    func getExplanation(for concept: GrammarConcept) -> GrammarExplanation {
        switch concept {
        case .articles:
            return explainArticles()
        case .pronouns:
            return explainPronouns()
        case .verbTenses:
            return explainVerbTenses()
        case .adjectives:
            return explainAdjectives()
        case .prepositions:
            return explainPrepositions()
        case .sentenceStructure:
            return explainSentenceStructure()
        case .conditionals:
            return explainConditionals()
        case .subjunctive:
            return explainSubjunctive()
        }
    }

    /// Analyze a sentence for grammar errors
    func analyzeSentence(_ sentence: String) -> GrammarAnalysis {
        var errors: [ItalianGrammarError] = []
        var suggestions: [String] = []

        // Check for common errors (simplified version)
        if sentence.contains("il libro") || sentence.contains("la libro") {
            if sentence.contains("la libro") {
                errors.append(ItalianGrammarError(
                    type: .articleGender,
                    position: sentence.range(of: "la libro")?.lowerBound ?? sentence.startIndex,
                    message: "'Libro' is masculine, should use 'il libro'",
                    correction: "il libro"
                ))
            }
        }

        // Check for double negatives
        if sentence.lowercased().contains("non") && sentence.lowercased().contains("niente") {
            suggestions.append("Italian uses double negatives correctly: 'non... niente' is proper grammar")
        }

        return GrammarAnalysis(
            sentence: sentence,
            errors: errors,
            suggestions: suggestions,
            overallCorrectness: errors.isEmpty ? 1.0 : 0.7
        )
    }

    // MARK: - Grammar Rules by Level

    private var beginnerRules: [GrammarRule] {
        [
            GrammarRule(
                id: "articles_basic",
                title: "Definite and Indefinite Articles",
                category: .articles,
                level: .beginner,
                explanation: """
                Italian has gendered articles that must agree with the noun.

                Definite (the):
                - il (masculine singular): il libro (the book)
                - la (feminine singular): la casa (the house)
                - i (masculine plural): i libri (the books)
                - le (feminine plural): le case (the houses)

                Indefinite (a/an):
                - un (masculine): un libro (a book)
                - una (feminine): una casa (a house)
                """,
                examples: [
                    "Il gatto è nero. (The cat is black.)",
                    "Una donna cammina. (A woman walks.)",
                    "I bambini giocano. (The children play.)"
                ],
                commonMistakes: [
                    "Using 'il' with feminine nouns",
                    "Forgetting to match article gender with noun"
                ],
                tags: ["articles", "gender", "basic"]
            ),
            GrammarRule(
                id: "present_tense",
                title: "Present Tense Conjugation",
                category: .verbTenses,
                level: .beginner,
                explanation: """
                Regular verbs in present tense follow patterns based on their infinitive ending.

                -ARE verbs (parlare - to speak):
                io parlo, tu parli, lui/lei parla, noi parliamo, voi parlate, loro parlano

                -ERE verbs (scrivere - to write):
                io scrivo, tu scrivi, lui/lei scrive, noi scriviamo, voi scrivete, loro scrivono

                -IRE verbs (dormire - to sleep):
                io dormo, tu dormi, lui/lei dorme, noi dormiamo, voi dormite, loro dormono
                """,
                examples: [
                    "Io parlo italiano. (I speak Italian.)",
                    "Tu scrivi una lettera. (You write a letter.)",
                    "Lui dorme. (He sleeps.)"
                ],
                commonMistakes: [
                    "Forgetting to change verb endings",
                    "Using Spanish endings instead of Italian"
                ],
                tags: ["verbs", "present tense", "conjugation"]
            ),
            GrammarRule(
                id: "basic_pronouns",
                title: "Subject Pronouns",
                category: .pronouns,
                level: .beginner,
                explanation: """
                Italian subject pronouns are often omitted because the verb ending indicates the subject.

                Singular:
                - io (I)
                - tu (you, informal)
                - lui (he), lei (she), Lei (you, formal)

                Plural:
                - noi (we)
                - voi (you plural)
                - loro (they)

                Note: Italian has formal 'you' (Lei) and informal 'you' (tu).
                """,
                examples: [
                    "Io sono studente. (I am a student.)",
                    "(Tu) Parli inglese? (Do you speak English?)",
                    "Noi mangiamo pizza. (We eat pizza.)"
                ],
                commonMistakes: [
                    "Overusing pronouns (they're often optional)",
                    "Using 'tu' in formal situations"
                ],
                tags: ["pronouns", "subject", "basic"]
            )
        ]
    }

    private var intermediateRules: [GrammarRule] {
        [
            GrammarRule(
                id: "past_tense",
                title: "Passato Prossimo",
                category: .verbTenses,
                level: .intermediate,
                explanation: """
                The passato prossimo is the most common past tense in Italian.
                Formed with: present of avere/essere + past participle

                With avere (most verbs):
                - Ho mangiato (I ate/have eaten)
                - Hai parlato (You spoke/have spoken)

                With essere (motion, state verbs):
                - Sono andato/a (I went)
                - È arrivato/a (He/She arrived)

                Note: With essere, the past participle agrees with the subject in gender/number.
                """,
                examples: [
                    "Ho studiato ieri. (I studied yesterday.)",
                    "Siamo andati al cinema. (We went to the cinema.)",
                    "Maria è partita stamattina. (Maria left this morning.)"
                ],
                commonMistakes: [
                    "Using wrong auxiliary (avere vs essere)",
                    "Forgetting agreement with essere"
                ],
                tags: ["verbs", "past tense", "passato prossimo"]
            ),
            GrammarRule(
                id: "direct_pronouns",
                title: "Direct Object Pronouns",
                category: .pronouns,
                level: .intermediate,
                explanation: """
                Direct object pronouns replace direct objects to avoid repetition.

                Forms:
                - mi (me)
                - ti (you, informal)
                - lo (him/it masculine), la (her/it feminine)
                - ci (us)
                - vi (you plural)
                - li (them masculine), le (them feminine)

                Placement: Before conjugated verb, attached to infinitive.
                """,
                examples: [
                    "Lo vedo. (I see him/it.)",
                    "Mi chiami? (Are you calling me?)",
                    "Voglio vederla. (I want to see her/it.)"
                ],
                commonMistakes: [
                    "Wrong placement of pronouns",
                    "Confusing direct and indirect pronouns"
                ],
                tags: ["pronouns", "direct object", "intermediate"]
            ),
            GrammarRule(
                id: "prepositions_articulated",
                title: "Preposizioni Articolate",
                category: .prepositions,
                level: .intermediate,
                explanation: """
                When certain prepositions combine with articles, they form one word.

                di + il = del, di + la = della, di + i = dei, di + le = delle
                a + il = al, a + la = alla, a + i = ai, a + le = alle
                da + il = dal, da + la = dalla, da + i = dai, da + le = dalle
                in + il = nel, in + la = nella, in + i = nei, in + le = nelle
                su + il = sul, su + la = sulla, su + i = sui, su + le = sulle
                """,
                examples: [
                    "Vado al cinema. (I go to the cinema.)",
                    "Il libro è sulla tavola. (The book is on the table.)",
                    "Vengo dalla stazione. (I come from the station.)"
                ],
                commonMistakes: [
                    "Forgetting to combine preposition and article",
                    "Wrong combination forms"
                ],
                tags: ["prepositions", "articles", "contractions"]
            )
        ]
    }

    private var advancedRules: [GrammarRule] {
        [
            GrammarRule(
                id: "subjunctive_present",
                title: "Present Subjunctive",
                category: .verbTenses,
                level: .advanced,
                explanation: """
                The subjunctive expresses doubt, desire, emotion, or uncertainty.
                Used after certain conjunctions and expressions.

                Formation for -ARE verbs (parlare):
                che io parli, che tu parli, che lui/lei parli,
                che noi parliamo, che voi parliate, che loro parlino

                Common triggers:
                - Penso che... (I think that...)
                - È importante che... (It's important that...)
                - Voglio che... (I want that...)
                - Benché... (Although...)
                """,
                examples: [
                    "Penso che sia giusto. (I think it's right.)",
                    "Voglio che tu venga. (I want you to come.)",
                    "Benché faccia freddo, esco. (Although it's cold, I'm going out.)"
                ],
                commonMistakes: [
                    "Using indicative instead of subjunctive",
                    "Incorrect subjunctive conjugations"
                ],
                tags: ["subjunctive", "mood", "advanced"]
            ),
            GrammarRule(
                id: "conditional_perfect",
                title: "Conditional Perfect (Condizionale Passato)",
                category: .verbTenses,
                level: .advanced,
                explanation: """
                Used for hypothetical past situations or reported speech in the past.
                Formed with: conditional of avere/essere + past participle

                With avere:
                avrei parlato (I would have spoken)

                With essere:
                sarei andato/a (I would have gone)

                Often used with 'se' clauses (if clauses).
                """,
                examples: [
                    "Avrei studiato di più. (I would have studied more.)",
                    "Sarei venuto se avessi saputo. (I would have come if I had known.)",
                    "Ha detto che sarebbe arrivato. (He said he would have arrived.)"
                ],
                commonMistakes: [
                    "Using wrong tense in conditional sentences",
                    "Forgetting agreement with essere"
                ],
                tags: ["conditional", "past", "hypothetical"]
            ),
            GrammarRule(
                id: "passive_voice",
                title: "Passive Voice",
                category: .sentenceStructure,
                level: .advanced,
                explanation: """
                Passive voice emphasizes the action rather than who performs it.
                Formed with: essere + past participle (agrees with subject)

                Active: Marco scrive la lettera. (Marco writes the letter.)
                Passive: La lettera è scritta da Marco. (The letter is written by Marco.)

                Alternative: Si passivante
                Si scrive la lettera. (The letter is written.)
                """,
                examples: [
                    "Il libro è stato letto. (The book was read.)",
                    "La casa fu costruita nel 1800. (The house was built in 1800.)",
                    "Si parlano molte lingue qui. (Many languages are spoken here.)"
                ],
                commonMistakes: [
                    "Forgetting agreement of past participle",
                    "Overusing passive voice"
                ],
                tags: ["passive", "voice", "structure"]
            )
        ]
    }

    // MARK: - Concept Explanations

    private func explainArticles() -> GrammarExplanation {
        GrammarExplanation(
            concept: .articles,
            summary: "Italian articles must agree with nouns in gender and number.",
            detailedExplanation: """
            Italian has two genders (masculine and feminine) and two numbers (singular and plural).
            Articles must match the noun they modify.

            Rules for choosing articles:
            1. Check if noun is masculine or feminine
            2. Check if singular or plural
            3. Check first letter of following word (affects article choice)

            Special cases:
            - lo/gli before words starting with s+consonant, z, ps, gn, x, y
            - l' before vowels (singular only)
            """,
            visualAid: "Table of article forms",
            practiceExercises: [
                "Convert: a book → un libro",
                "Convert: the houses → le case",
                "Convert: the students → gli studenti"
            ]
        )
    }

    private func explainPronouns() -> GrammarExplanation {
        GrammarExplanation(
            concept: .pronouns,
            summary: "Italian has various pronoun types that replace nouns.",
            detailedExplanation: """
            Types of pronouns:
            1. Subject pronouns (io, tu, lui/lei, noi, voi, loro)
            2. Direct object pronouns (mi, ti, lo/la, ci, vi, li/le)
            3. Indirect object pronouns (mi, ti, gli/le, ci, vi, loro)
            4. Reflexive pronouns (mi, ti, si, ci, vi, si)

            Placement rules:
            - Before conjugated verbs
            - Attached to infinitives, gerunds, and imperatives
            - Combined pronouns follow specific order
            """,
            visualAid: "Pronoun placement chart",
            practiceExercises: [
                "Replace: Vedo Marco → Lo vedo",
                "Replace: Parlo a Maria → Le parlo",
                "Replace: Mi lavo le mani → Me le lavo"
            ]
        )
    }

    private func explainVerbTenses() -> GrammarExplanation {
        GrammarExplanation(
            concept: .verbTenses,
            summary: "Italian has multiple tenses to express time and aspect.",
            detailedExplanation: """
            Main tenses:
            1. Presente (present)
            2. Passato prossimo (recent past)
            3. Imperfetto (imperfect/ongoing past)
            4. Futuro (future)
            5. Condizionale (conditional)
            6. Congiuntivo (subjunctive)

            Choosing tenses:
            - Present: habitual actions, current states
            - Passato prossimo: completed actions
            - Imperfetto: ongoing past actions, descriptions
            - Futuro: future actions, predictions
            """,
            visualAid: "Tense timeline",
            practiceExercises: [
                "Conjugate 'parlare' in presente",
                "Form passato prossimo of 'andare'",
                "Use imperfetto vs passato prossimo"
            ]
        )
    }

    private func explainAdjectives() -> GrammarExplanation {
        GrammarExplanation(
            concept: .adjectives,
            summary: "Adjectives agree with nouns in gender and number.",
            detailedExplanation: """
            Agreement rules:
            - Masculine singular: -o (bello)
            - Feminine singular: -a (bella)
            - Masculine plural: -i (belli)
            - Feminine plural: -e (belle)

            Position:
            - Most adjectives follow the noun: la casa grande
            - Some common adjectives precede: bello, brutto, buono, cattivo, giovane, vecchio, grande, piccolo

            Special forms:
            - Bello changes like definite articles before nouns
            """,
            visualAid: "Adjective agreement table",
            practiceExercises: [
                "Agree: il ragazzo (intelligente)",
                "Agree: le ragazze (alto)",
                "Position: una casa (bello)"
            ]
        )
    }

    private func explainPrepositions() -> GrammarExplanation {
        GrammarExplanation(
            concept: .prepositions,
            summary: "Prepositions show relationships between words.",
            detailedExplanation: """
            Main prepositions:
            - di (of, from)
            - a (to, at)
            - da (from, by, since)
            - in (in, to)
            - con (with)
            - su (on)
            - per (for, through)
            - tra/fra (between, among)

            Usage notes:
            - 'a' for motion toward cities: Vado a Roma
            - 'in' for motion toward countries: Vado in Italia
            - 'da' for motion toward people: Vado da Mario
            """,
            visualAid: "Preposition usage chart",
            practiceExercises: [
                "Fill: Vado ___ scuola (a)",
                "Fill: Vengo ___ Italia (dall')",
                "Fill: Studio ___ tre ore (da)"
            ]
        )
    }

    private func explainSentenceStructure() -> GrammarExplanation {
        GrammarExplanation(
            concept: .sentenceStructure,
            summary: "Italian sentence structure is flexible but has patterns.",
            detailedExplanation: """
            Basic structure: Subject + Verb + Object (SVO)
            But Italian allows flexibility for emphasis.

            Word order variations:
            - Questions: often same as statements (intonation changes)
            - Emphasis: move emphasized element to start
            - Pronouns: special placement rules

            Negation:
            - Place 'non' before verb: Non parlo italiano.
            - Double negatives are correct: Non ho niente.
            """,
            visualAid: "Sentence structure diagrams",
            practiceExercises: [
                "Form question: Tu parli italiano?",
                "Negate: Mangio la pizza → Non mangio la pizza",
                "Emphasize: IL LIBRO ho letto (not the magazine)"
            ]
        )
    }

    private func explainConditionals() -> GrammarExplanation {
        GrammarExplanation(
            concept: .conditionals,
            summary: "Conditional expresses hypothetical situations.",
            detailedExplanation: """
            Types of conditionals:

            1. Real (likely): Present + Future
               Se piove, starò a casa. (If it rains, I'll stay home.)

            2. Hypothetical (unlikely): Imperfect Subjunctive + Conditional
               Se avessi tempo, verrei. (If I had time, I would come.)

            3. Impossible (past): Pluperfect Subjunctive + Conditional Perfect
               Se avessi studiato, avrei passato. (If I had studied, I would have passed.)
            """,
            visualAid: "Conditional types table",
            practiceExercises: [
                "Complete: Se ___ (avere) tempo, verrei.",
                "Complete: Se ___ (studiare), avrei passato.",
                "Form: If I were rich, I would travel."
            ]
        )
    }

    private func explainSubjunctive() -> GrammarExplanation {
        GrammarExplanation(
            concept: .subjunctive,
            summary: "Subjunctive expresses doubt, desire, and emotion.",
            detailedExplanation: """
            When to use subjunctive:

            1. After expressions of:
               - Doubt: Dubito che...
               - Desire: Voglio che...
               - Emotion: Sono felice che...
               - Opinion: Penso che...

            2. After certain conjunctions:
               - benché (although)
               - prima che (before)
               - affinché (so that)
               - senza che (without)

            3. In relative clauses expressing uncertainty

            Formation varies by tense: present, imperfect, perfect, pluperfect subjunctive
            """,
            visualAid: "Subjunctive trigger words list",
            practiceExercises: [
                "Complete: Penso che lui ___ (essere) intelligente.",
                "Complete: Voglio che tu ___ (venire).",
                "Complete: Benché ___ (piovere), esco."
            ]
        )
    }
}

// MARK: - Supporting Types

struct GrammarRule: Identifiable, Codable {
    let id: String
    let title: String
    let category: GrammarCategory
    let level: GrammarLevel
    let explanation: String
    let examples: [String]
    let commonMistakes: [String]
    let tags: [String]
}

enum GrammarCategory: String, Codable {
    case articles = "Articles"
    case pronouns = "Pronouns"
    case verbTenses = "Verb Tenses"
    case adjectives = "Adjectives"
    case prepositions = "Prepositions"
    case sentenceStructure = "Sentence Structure"
    case mood = "Mood"
}

enum GrammarConcept {
    case articles
    case pronouns
    case verbTenses
    case adjectives
    case prepositions
    case sentenceStructure
    case conditionals
    case subjunctive
}

struct GrammarExplanation {
    let concept: GrammarConcept
    let summary: String
    let detailedExplanation: String
    let visualAid: String
    let practiceExercises: [String]
}

struct GrammarAnalysis {
    let sentence: String
    let errors: [ItalianGrammarError]
    let suggestions: [String]
    let overallCorrectness: Double
}

struct ItalianGrammarError {
    let type: ErrorType
    let position: String.Index
    let message: String
    let correction: String

    enum ErrorType {
        case articleGender
        case verbConjugation
        case agreement
        case wordOrder
        case preposition
    }
}
