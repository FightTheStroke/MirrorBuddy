import Foundation

/// Script for guided flashcard coaching sessions
struct FlashcardCoachScript {
    enum SessionPhase {
        case warmUp
        case practice
        case wrapUp

        var duration: TimeInterval {
            switch self {
            case .warmUp: return 30 // 30 seconds
            case .practice: return 600 // 10 minutes
            case .wrapUp: return 60 // 1 minute
            }
        }
    }

    // MARK: - Warm-up Phase

    static func warmUpPrompt(subject: String?, cardCount: Int) -> String {
        let greeting = NSLocalizedString("flashcard.coach.warmup.greeting", value: "Ciao! Iniziamo la sessione di ripasso.", comment: "Warm-up greeting")

        let intro = String(format: NSLocalizedString("flashcard.coach.warmup.intro", value: "Oggi faremo pratica con %d flashcard", comment: "Warm-up intro"), cardCount)

        let subjectInfo: String
        if let subject = subject {
            subjectInfo = String(format: NSLocalizedString("flashcard.coach.warmup.subject", value: " di %@", comment: "Subject info"), subject)
        } else {
            subjectInfo = ""
        }

        let motivation = NSLocalizedString("flashcard.coach.warmup.motivation", value: "Prenditi il tempo che ti serve e ricorda: ogni errore è un'opportunità per imparare!", comment: "Motivation message")

        return "\(greeting) \(intro)\(subjectInfo). \(motivation)"
    }

    static var readyPrompt: String {
        NSLocalizedString("flashcard.coach.warmup.ready", value: "Sei pronto? Iniziamo!", comment: "Ready prompt")
    }

    // MARK: - Practice Phase

    static var nextCardPrompt: String {
        NSLocalizedString("flashcard.coach.practice.next_card", value: "Prossima domanda...", comment: "Next card prompt")
    }

    static func correctAnswerPrompts(streak: Int) -> String {
        if streak >= 5 {
            return NSLocalizedString("flashcard.coach.practice.excellent_streak", value: "Fantastico! Stai andando alla grande! 🔥", comment: "Excellent streak message")
        } else if streak >= 3 {
            return NSLocalizedString("flashcard.coach.practice.good_streak", value: "Ottimo lavoro! Continua così!", comment: "Good streak message")
        } else {
            let prompts = [
                NSLocalizedString("flashcard.coach.practice.correct1", value: "Esatto!", comment: "Correct answer 1"),
                NSLocalizedString("flashcard.coach.practice.correct2", value: "Perfetto!", comment: "Correct answer 2"),
                NSLocalizedString("flashcard.coach.practice.correct3", value: "Bravo!", comment: "Correct answer 3"),
                NSLocalizedString("flashcard.coach.practice.correct4", value: "Molto bene!", comment: "Correct answer 4")
            ]
            return prompts.randomElement() ?? prompts[0]
        }
    }

    static func incorrectAnswerPrompts(difficulty: DifficultyLevel) -> String {
        switch difficulty {
        case .easy:
            return NSLocalizedString("flashcard.coach.practice.incorrect_easy", value: "Non preoccuparti, riprova! Pensa con calma.", comment: "Incorrect easy")
        case .medium:
            return NSLocalizedString("flashcard.coach.practice.incorrect_medium", value: "Quasi! Ti do un aiuto: rileggi bene la domanda.", comment: "Incorrect medium")
        case .hard:
            return NSLocalizedString("flashcard.coach.practice.incorrect_hard", value: "È difficile, lo so. Vediamo insieme la risposta corretta.", comment: "Incorrect hard")
        }
    }

    static var midSessionEncouragement: String {
        NSLocalizedString("flashcard.coach.practice.mid_session", value: "Sei a metà! Continua così, stai facendo benissimo!", comment: "Mid-session encouragement")
    }

    // MARK: - Wrap-up Phase

    static func wrapUpSummary(correct: Int, total: Int, xpEarned: Int) -> String {
        let completion = NSLocalizedString("flashcard.coach.wrapup.completion", value: "Sessione completata!", comment: "Completion message")

        let score = String(format: NSLocalizedString("flashcard.coach.wrapup.score", value: "Hai risposto correttamente a %d su %d domande.", comment: "Score message"), correct, total)

        let percentage = Int((Double(correct) / Double(total)) * 100)
        let performance: String
        if percentage >= 90 {
            performance = NSLocalizedString("flashcard.coach.wrapup.excellent", value: "Risultato eccellente!", comment: "Excellent performance")
        } else if percentage >= 70 {
            performance = NSLocalizedString("flashcard.coach.wrapup.good", value: "Buon lavoro!", comment: "Good performance")
        } else if percentage >= 50 {
            performance = NSLocalizedString("flashcard.coach.wrapup.fair", value: "Non male, ma puoi fare meglio!", comment: "Fair performance")
        } else {
            performance = NSLocalizedString("flashcard.coach.wrapup.needs_work", value: "Continua a esercitarti, migliorerai!", comment: "Needs work")
        }

        let xpMessage = String(format: NSLocalizedString("flashcard.coach.wrapup.xp", value: "Hai guadagnato %d XP!", comment: "XP message"), xpEarned)

        return "\(completion) \(score) \(performance) \(xpMessage)"
    }

    static var nextStepPrompt: String {
        NSLocalizedString("flashcard.coach.wrapup.next_step", value: "Vuoi ripassare le card sbagliate o fare un'altra sessione?", comment: "Next step prompt")
    }

    enum DifficultyLevel {
        case easy
        case medium
        case hard
    }
}
