import Foundation

/// Centralized localization for Proactive Coaching feature
enum ProactiveCoachingStrings {

    // MARK: - Context Tracker

    enum StudyMode {
        static let math = NSLocalizedString(
            "proactive.coaching.study_mode.math",
            value: "Matematica",
            comment: "Math study mode name"
        )
        static let italian = NSLocalizedString(
            "proactive.coaching.study_mode.italian",
            value: "Italiano",
            comment: "Italian study mode name"
        )
        static let history = NSLocalizedString(
            "proactive.coaching.study_mode.history",
            value: "Storia",
            comment: "History study mode name"
        )
        static let science = NSLocalizedString(
            "proactive.coaching.study_mode.science",
            value: "Scienze",
            comment: "Science study mode name"
        )
        static let language = NSLocalizedString(
            "proactive.coaching.study_mode.language",
            value: "Lingue",
            comment: "Language study mode name"
        )
        static let general = NSLocalizedString(
            "proactive.coaching.study_mode.general",
            value: "Generale",
            comment: "General study mode name"
        )
    }

    // MARK: - Idle Detector

    enum IdlePrompts {
        static let frustrated = NSLocalizedString(
            "proactive.coaching.idle.frustrated",
            value: "Sembra che tu sia un po' frustrato. Vuoi fare una pausa o provo a spiegarti meglio?",
            comment: "Prompt when user appears frustrated"
        )

        static let confused = NSLocalizedString(
            "proactive.coaching.idle.confused",
            value: "Noto che sei un po' confuso. Posso aiutarti a chiarire qualcosa?",
            comment: "Prompt when user appears confused"
        )

        static let needsBreak = NSLocalizedString(
            "proactive.coaching.idle.needs_break",
            value: "Hai studiato molto bene! Che ne dici di una pausa di 5 minuti?",
            comment: "Prompt suggesting a break"
        )

        static let possiblyStuck = NSLocalizedString(
            "proactive.coaching.idle.possibly_stuck",
            value: "Sei bloccato su qualcosa? Posso aiutarti!",
            comment: "Prompt when user might be stuck"
        )

        static let unknown = NSLocalizedString(
            "proactive.coaching.idle.unknown",
            value: "Tutto bene? Sono qui se hai bisogno di aiuto!",
            comment: "Generic idle prompt"
        )
    }

    // MARK: - Working Memory Checkpoints

    enum Checkpoints {
        static let greeting1 = NSLocalizedString(
            "proactive.coaching.checkpoint.greeting1",
            value: "Ciao! Facciamo un rapido ripasso.",
            comment: "First checkpoint greeting"
        )

        static let greeting2 = NSLocalizedString(
            "proactive.coaching.checkpoint.greeting2",
            value: "Perfetto, facciamo un altro checkpoint.",
            comment: "Subsequent checkpoint greeting"
        )

        static func studyingSubject(_ subject: String) -> String {
            String(format: NSLocalizedString(
                "proactive.coaching.checkpoint.studying_subject",
                value: "Stiamo studiando %@.",
                comment: "Checkpoint message mentioning subject"
            ), subject)
        }

        static let performanceExcellent = NSLocalizedString(
            "proactive.coaching.checkpoint.performance.excellent",
            value: "Stai andando benissimo!",
            comment: "Excellent performance feedback"
        )

        static let performanceGood = NSLocalizedString(
            "proactive.coaching.checkpoint.performance.good",
            value: "Buon lavoro finora!",
            comment: "Good performance feedback"
        )

        static let performanceDifficult = NSLocalizedString(
            "proactive.coaching.checkpoint.performance.difficult",
            value: "So che alcuni concetti possono essere difficili, ma ce la stai facendo!",
            comment: "Encouraging message for difficult concepts"
        )

        static let continue = NSLocalizedString(
            "proactive.coaching.checkpoint.continue",
            value: "Continua così!",
            comment: "Continue studying encouragement"
        )

        // Math prompts
        static let mathFormulas = NSLocalizedString(
            "proactive.coaching.checkpoint.math.formulas",
            value: "Ricordi le formule principali?",
            comment: "Math checkpoint: formulas"
        )

        static let mathSteps = NSLocalizedString(
            "proactive.coaching.checkpoint.math.steps",
            value: "Prova a visualizzare i passaggi del problema.",
            comment: "Math checkpoint: problem steps"
        )

        static let mathProperties = NSLocalizedString(
            "proactive.coaching.checkpoint.math.properties",
            value: "Quali sono le proprietà matematiche chiave?",
            comment: "Math checkpoint: key properties"
        )

        // Italian prompts
        static let italianGrammar = NSLocalizedString(
            "proactive.coaching.checkpoint.italian.grammar",
            value: "Ricordi le regole grammaticali che abbiamo visto?",
            comment: "Italian checkpoint: grammar rules"
        )

        static let italianConjugation = NSLocalizedString(
            "proactive.coaching.checkpoint.italian.conjugation",
            value: "Prova a ripetere le coniugazioni verbali.",
            comment: "Italian checkpoint: verb conjugation"
        )

        static let italianVocabulary = NSLocalizedString(
            "proactive.coaching.checkpoint.italian.vocabulary",
            value: "Quali sono le parole nuove che hai imparato?",
            comment: "Italian checkpoint: new words"
        )

        // History prompts
        static let historySequence = NSLocalizedString(
            "proactive.coaching.checkpoint.history.sequence",
            value: "Ricordi la sequenza degli eventi?",
            comment: "History checkpoint: event sequence"
        )

        static let historyCharacters = NSLocalizedString(
            "proactive.coaching.checkpoint.history.characters",
            value: "Chi sono i personaggi principali?",
            comment: "History checkpoint: main characters"
        )

        static let historyCauses = NSLocalizedString(
            "proactive.coaching.checkpoint.history.causes",
            value: "Quali sono le cause e conseguenze?",
            comment: "History checkpoint: causes and consequences"
        )

        // Science prompts
        static let scienceProcess = NSLocalizedString(
            "proactive.coaching.checkpoint.science.process",
            value: "Ricordi il processo scientifico?",
            comment: "Science checkpoint: scientific process"
        )

        static let scienceConcepts = NSLocalizedString(
            "proactive.coaching.checkpoint.science.concepts",
            value: "Quali sono i concetti fondamentali?",
            comment: "Science checkpoint: fundamental concepts"
        )

        static let scienceHow = NSLocalizedString(
            "proactive.coaching.checkpoint.science.how",
            value: "Come funziona questo fenomeno?",
            comment: "Science checkpoint: how it works"
        )

        // Language prompts
        static let languageWords = NSLocalizedString(
            "proactive.coaching.checkpoint.language.words",
            value: "Ricordi le nuove parole?",
            comment: "Language checkpoint: new words"
        )

        static let languageSentence = NSLocalizedString(
            "proactive.coaching.checkpoint.language.sentence",
            value: "Prova a costruire una frase.",
            comment: "Language checkpoint: build sentence"
        )

        static let languagePronunciation = NSLocalizedString(
            "proactive.coaching.checkpoint.language.pronunciation",
            value: "Come si pronuncia correttamente?",
            comment: "Language checkpoint: pronunciation"
        )

        // General prompts
        static let generalKeyPoints = NSLocalizedString(
            "proactive.coaching.checkpoint.general.key_points",
            value: "Quali sono i punti principali?",
            comment: "General checkpoint: key points"
        )

        static let generalLearned = NSLocalizedString(
            "proactive.coaching.checkpoint.general.learned",
            value: "Cosa hai imparato di importante?",
            comment: "General checkpoint: what learned"
        )

        static let generalDetails = NSLocalizedString(
            "proactive.coaching.checkpoint.general.details",
            value: "Ricordi i dettagli chiave?",
            comment: "General checkpoint: key details"
        )

        static let mentalRepeat = NSLocalizedString(
            "proactive.coaching.checkpoint.mental_repeat",
            value: "Prova a ripetere mentalmente i concetti principali.",
            comment: "Prompt to mentally repeat concepts"
        )

        static let recallKeyPoints = NSLocalizedString(
            "proactive.coaching.checkpoint.recall_key_points",
            value: "Ricordi i punti chiave di questa sezione?",
            comment: "Prompt to recall key points"
        )

        static let whatLearned = NSLocalizedString(
            "proactive.coaching.checkpoint.what_learned",
            value: "Cosa hai imparato finora?",
            comment: "Prompt asking what learned"
        )
    }

    // MARK: - Proactive Prompts

    enum Prompts {
        static let breakSuggestion = NSLocalizedString(
            "proactive.coaching.prompt.break_suggestion",
            value: "Hai studiato molto bene! Che ne dici di una pausa di 5 minuti?",
            comment: "Break suggestion prompt"
        )

        static let frustrated = NSLocalizedString(
            "proactive.coaching.prompt.frustrated",
            value: "Vedo che sei un po' frustrato. Ricorda che è normale! Vuoi che ti aiuti a capire meglio?",
            comment: "Prompt for frustrated state"
        )

        static let confused = NSLocalizedString(
            "proactive.coaching.prompt.confused",
            value: "Nessun problema se sei confuso. Posso spiegarti meglio questi concetti!",
            comment: "Prompt for confused state"
        )

        static let encouragement1 = NSLocalizedString(
            "proactive.coaching.prompt.encouragement1",
            value: "Stai facendo un ottimo lavoro! Continua così!",
            comment: "Encouragement message 1"
        )

        static let encouragement2 = NSLocalizedString(
            "proactive.coaching.prompt.encouragement2",
            value: "Grande! Vedo che stai migliorando!",
            comment: "Encouragement message 2"
        )

        static let encouragement3 = NSLocalizedString(
            "proactive.coaching.prompt.encouragement3",
            value: "Perfetto! Sei sulla strada giusta!",
            comment: "Encouragement message 3"
        )

        static let encouragement4 = NSLocalizedString(
            "proactive.coaching.prompt.encouragement4",
            value: "Bravo! I tuoi sforzi stanno dando i loro frutti!",
            comment: "Encouragement message 4"
        )

        static func nextTopicSuggestion(_ subject: String) -> String {
            String(format: NSLocalizedString(
                "proactive.coaching.prompt.next_topic",
                value: "Vuoi passare a un altro argomento di %@?",
                comment: "Next topic suggestion"
            ), subject)
        }

        static func practiceExercise(_ subject: String) -> String {
            String(format: NSLocalizedString(
                "proactive.coaching.prompt.practice_exercise",
                value: "Che ne dici di fare qualche esercizio pratico su %@?",
                comment: "Practice exercise suggestion"
            ), subject)
        }

        static func reviewConcepts(_ subject: String) -> String {
            String(format: NSLocalizedString(
                "proactive.coaching.prompt.review_concepts",
                value: "Vuoi ripassare i concetti chiave di %@?",
                comment: "Review concepts suggestion"
            ), subject)
        }

        static func createMindMap(_ subject: String) -> String {
            String(format: NSLocalizedString(
                "proactive.coaching.prompt.create_mind_map",
                value: "Potresti provare a creare una mappa mentale per %@!",
                comment: "Mind map creation suggestion"
            ), subject)
        }

        static func celebrateStreak(_ count: Int) -> String {
            String(format: NSLocalizedString(
                "proactive.coaching.prompt.celebrate_streak",
                value: "Fantastico! %d risposte corrette di fila! 🎉",
                comment: "Celebrate correct answer streak"
            ), count)
        }
    }

    // MARK: - Actions

    enum Actions {
        static let continue = NSLocalizedString(
            "proactive.coaching.action.continue",
            value: "Continua",
            comment: "Continue action"
        )

        static let help = NSLocalizedString(
            "proactive.coaching.action.help",
            value: "Aiuto",
            comment: "Help action"
        )

        static let close = NSLocalizedString(
            "proactive.coaching.action.close",
            value: "Chiudi",
            comment: "Close action"
        )

        static let thanks = NSLocalizedString(
            "proactive.coaching.action.thanks",
            value: "Grazie!",
            comment: "Thanks action"
        )

        static let takeBreak = NSLocalizedString(
            "proactive.coaching.action.take_break",
            value: "Pausa",
            comment: "Take break action"
        )

        static let ok = NSLocalizedString(
            "proactive.coaching.action.ok",
            value: "Ok!",
            comment: "OK action"
        )

        static let again = NSLocalizedString(
            "proactive.coaching.action.again",
            value: "Ancora",
            comment: "Again action"
        )

        static let later = NSLocalizedString(
            "proactive.coaching.action.later",
            value: "Dopo",
            comment: "Later action"
        )

        static let summary = NSLocalizedString(
            "proactive.coaching.action.summary",
            value: "Riepilogo",
            comment: "Summary action"
        )

        static let thanksWithEmoji = NSLocalizedString(
            "proactive.coaching.action.thanks_emoji",
            value: "Grazie! 🎉",
            comment: "Thanks with celebration emoji"
        )
    }

    // MARK: - UI

    enum UI {
        static let dashboardTitle = NSLocalizedString(
            "proactive.coaching.ui.dashboard_title",
            value: "Coaching Proattivo",
            comment: "Dashboard title"
        )

        static let coachingStatus = NSLocalizedString(
            "proactive.coaching.ui.coaching_status",
            value: "Stato Coaching",
            comment: "Coaching status label"
        )

        static let active = NSLocalizedString(
            "proactive.coaching.ui.active",
            value: "Attivo",
            comment: "Active status"
        )

        static let paused = NSLocalizedString(
            "proactive.coaching.ui.paused",
            value: "In Pausa",
            comment: "Paused status"
        )

        static let activateCoaching = NSLocalizedString(
            "proactive.coaching.ui.activate_coaching",
            value: "Attiva Coaching",
            comment: "Activate coaching button"
        )

        static let deactivateCoaching = NSLocalizedString(
            "proactive.coaching.ui.deactivate_coaching",
            value: "Disattiva Coaching",
            comment: "Deactivate coaching button"
        )

        static let suggestNextStep = NSLocalizedString(
            "proactive.coaching.ui.suggest_next_step",
            value: "Suggerisci Prossimo Passo",
            comment: "Suggest next step button"
        )

        static let promptHistory = NSLocalizedString(
            "proactive.coaching.ui.prompt_history",
            value: "Cronologia Prompts",
            comment: "Prompt history section title"
        )
    }
}
