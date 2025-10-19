//
//  EncouragementService.swift
//  MirrorBuddy
//
//  Provides empathetic, child-friendly encouragement messages
//  Subtask 98.4: Personalization and Empathetic Content Guidelines
//

import Foundation

/// Service for providing age-appropriate, encouraging feedback messages
/// All messages follow the CONTENT_STYLE_GUIDE.md principles
@MainActor
final class EncouragementService {
    static let shared = EncouragementService()

    private init() {}

    // MARK: - Success Messages

    /// Get a random success message for immediate achievements
    func successMessage() -> String {
        [
            "Perfetto!",
            "Ottimo lavoro!",
            "Fantastico!",
            "Sei bravissimo!",
            "Continua così!",
            "Grande!",
            "Eccellente!",
            "Ce l'hai fatta!"
        ].randomElement() ?? "Bravo!"
    }

    /// Get a milestone celebration message
    func milestoneMessage(count: Int, activity: String) -> String {
        [
            "Hai fatto \(count) \(activity)! Grande!",
            "Wow, \(count) \(activity) completati!",
            "Incredibile! \(count) \(activity) fatti!",
            "Sei un campione! \(count) \(activity)!"
        ].randomElement() ?? "Ottimo lavoro!"
    }

    /// Get a task completion message
    func completionMessage() -> String {
        [
            "Complimenti! Hai finito tutto!",
            "Missione completata! Sei un campione!",
            "Ce l'hai fatta! Sono fiero di te!",
            "Fantastico! Hai completato tutto!",
            "Bravissimo! Tutto fatto!",
            "Eccezionale! Hai finito!"
        ].randomElement() ?? "Complimenti!"
    }

    // MARK: - Encouragement Messages

    /// Get an encouraging message when user is struggling
    func strugglingMessage() -> String {
        [
            "Va bene, succede a tutti. Riprova!",
            "Non ti preoccupare, stai imparando!",
            "Ogni errore è un passo verso il successo!",
            "Ci sei quasi! Prova ancora!",
            "Benissimo che stai provando!",
            "L'importante è non arrendersi!"
        ].randomElement() ?? "Prova ancora!"
    }

    /// Get a message for taking a break
    func breakMessage() -> String {
        [
            "Ottima idea riposare un po'!",
            "Torna quando sei pronto. Io ti aspetto!",
            "Bene! Il riposo aiuta a imparare meglio.",
            "Perfetto! Fai una pausa e torna più forte!",
            "Bravissimo a prenderti cura di te!"
        ].randomElement() ?? "Buon riposo!"
    }

    /// Get a welcome back message
    func welcomeBackMessage(userName: String? = nil) -> String {
        let name = userName ?? "amico"
        return [
            "Bentornato, \(name)! Sono contento di rivederti!",
            "Ciao \(name)! Pronto per continuare?",
            "Eccoti, \(name)! Riprendiamo da dove avevamo lasciato?",
            "Felice di rivederti, \(name)!",
            "Ciao \(name)! Che bello rivederti!"
        ].randomElement() ?? "Bentornato!"
    }

    // MARK: - Error Messages (Child-Friendly)

    /// Get a gentle error message for input errors
    func inputErrorMessage(expectedType: String) -> String {
        switch expectedType.lowercased() {
        case "numero", "number":
            return "Ops! Prova a scrivere solo numeri."
        case "testo", "text":
            return "Ops! Prova a scrivere delle lettere."
        case "data", "date":
            return "Ops! Prova a scegliere una data."
        default:
            return "Ops! Controlla quello che hai scritto."
        }
    }

    /// Get a reassuring message for system errors
    func systemErrorMessage() -> String {
        [
            "Qualcosa non ha funzionato. Riprovo per te!",
            "Ops, un piccolo problema! Ci riprovo.",
            "Mmm, qualcosa è andato storto. Un momento!",
            "Aspetta, sistemo tutto subito!"
        ].randomElement() ?? "Ops! Riprovo subito."
    }

    /// Get a helpful message for network errors
    func networkErrorMessage() -> String {
        [
            "Non riesco a connettermi. Controlla internet?",
            "Ops, sembra che internet non funzioni.",
            "Non riesco a collegarmi. Controlla la connessione?",
            "Mmm, internet non risponde. Puoi controllare?"
        ].randomElement() ?? "Problema di connessione."
    }

    // MARK: - Contextual Messages

    /// Get a greeting based on time of day
    func greetingMessage(userName: String? = nil) -> String {
        let name = userName ?? "amico"
        let hour = Calendar.current.component(.hour, from: Date())

        switch hour {
        case 5..<12:
            return "Buongiorno, \(name)! Pronto per una giornata di scoperte?"
        case 12..<18:
            return "Ciao \(name)! Come sta andando la giornata?"
        case 18..<22:
            return "Buonasera \(name)! Hai ancora energia per studiare un po'?"
        default:
            return "Ciao \(name)!"
        }
    }

    /// Get a progress encouragement message
    func progressMessage(completedCount: Int, totalCount: Int) -> String {
        let percentage = Int((Double(completedCount) / Double(totalCount)) * 100)

        switch percentage {
        case 0..<25:
            return "Hai iniziato! Continua così!"
        case 25..<50:
            return "Stai andando bene! Quasi a metà!"
        case 50..<75:
            return "Fantastico! Sei oltre la metà!"
        case 75..<100:
            return "Ci sei quasi! Ancora un po'!"
        case 100:
            return completionMessage()
        default:
            return "Continua così!"
        }
    }

    /// Get an achievement message
    func achievementMessage(title: String, description: String) -> String {
        """
        🎉 Fantastico!

        Hai sbloccato: \(title)

        \(description)

        Continua così e diventerai un esperto!
        """
    }

    /// Get a streak message (consecutive days of activity)
    func streakMessage(days: Int) -> String {
        switch days {
        case 1:
            return "Primo giorno! Iniziamo bene! 🔥"
        case 2:
            return "Due giorni di fila! Grande! 🔥🔥"
        case 3...6:
            return "\(days) giorni consecutivi! Sei costante! 🔥"
        case 7:
            return "Una settimana intera! Incredibile! 🔥✨"
        case 8...13:
            return "\(days) giorni! Stai diventando un campione! 🔥⭐"
        case 14:
            return "Due settimane! Che determinazione! 🔥🏆"
        default:
            return "\(days) giorni! Sei inarrestabile! 🔥👑"
        }
    }

    // MARK: - Subject-Specific Encouragement

    /// Get subject-specific encouragement
    func subjectEncouragement(subject: String) -> String {
        switch subject.lowercased() {
        case "matematica", "math":
            return "La matematica è come un puzzle! Ogni pezzo al suo posto!"
        case "italiano", "italian":
            return "Le parole sono magia! Continua a leggere e scrivere!"
        case "storia", "history":
            return "La storia è piena di avventure! Scopriamole insieme!"
        case "scienze", "science":
            return "La scienza spiega il mondo! Sei un piccolo scienziato!"
        case "geografia", "geography":
            return "Il mondo è grande! Esploriamolo insieme!"
        case "inglese", "english":
            return "Imparare una nuova lingua apre tante porte!"
        case "arte", "art":
            return "L'arte è espressione! Mostra la tua creatività!"
        case "musica", "music":
            return "La musica è ritmo e armonia! Divertiamoci!"
        default:
            return "Ogni materia è una nuova avventura!"
        }
    }

    // MARK: - Personalization

    /// Get a personalized study reminder
    func studyReminder(userName: String? = nil, subject: String? = nil) -> String {
        let name = userName ?? "amico"

        if let subject = subject {
            return "Ciao \(name)! Vuoi studiare un po' di \(subject)?"
        } else {
            return "Ciao \(name)! Pronto per studiare insieme?"
        }
    }

    /// Get an empty state message with actionable advice
    func emptyStateMessage(context: EmptyStateContext) -> (title: String, message: String, action: String) {
        switch context {
        case .noMaterials:
            return (
                "Nessun materiale ancora",
                "Importiamone uno insieme! Tocca il pulsante + in alto.",
                "Importa Materiale"
            )
        case .noTasks:
            return (
                "Nessun compito",
                "Aggiungi il tuo primo compito toccando +",
                "Aggiungi Compito"
            )
        case .noFlashcards:
            return (
                "Nessuna flashcard",
                "Crea delle flashcard per studiare meglio!",
                "Crea Flashcard"
            )
        case .noProgress:
            return (
                "Iniziamo!",
                "Fai il primo esercizio per vedere i tuoi progressi!",
                "Inizia"
            )
        }
    }
}

// MARK: - Empty State Contexts

enum EmptyStateContext {
    case noMaterials
    case noTasks
    case noFlashcards
    case noProgress
}

// MARK: - Encouragement Message Model

/// Model for displaying encouragement with optional emoji and action
struct EncouragementMessage: Identifiable {
    let id = UUID()
    let title: String
    let message: String
    let emoji: String?
    let actionTitle: String?
    let action: (() -> Void)?

    init(
        title: String,
        message: String,
        emoji: String? = nil,
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.title = title
        self.message = message
        self.emoji = emoji
        self.actionTitle = actionTitle
        self.action = action
    }
}

// MARK: - SwiftUI View for Displaying Encouragement

import SwiftUI

struct EncouragementBanner: View {
    let message: EncouragementMessage

    var body: some View {
        VStack(spacing: 12) {
            if let emoji = message.emoji {
                Text(emoji)
                    .font(.system(size: 40))
            }

            Text(message.title)
                .font(.title3)
                .fontWeight(.bold)
                .multilineTextAlignment(.center)

            Text(message.message)
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            if let actionTitle = message.actionTitle, let action = message.action {
                Button(actionTitle, action: action)
                    .buttonStyle(.borderedProminent)
                    .padding(.top, 8)
            }
        }
        .padding(24)
        .background(Color.green.opacity(0.1))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }
}

// MARK: - Preview

#Preview("Success Banner") {
    EncouragementBanner(
        message: EncouragementMessage(
            title: "Fantastico!",
            message: "Hai completato 5 esercizi di matematica!",
            emoji: "🎉",
            actionTitle: "Continua"
        ) { print("Continue") }
    )
    .padding()
}

#Preview("Empty State") {
    let (title, message, action) = EncouragementService.shared.emptyStateMessage(context: .noMaterials)

    EncouragementBanner(
        message: EncouragementMessage(
            title: title,
            message: message,
            emoji: "📚",
            actionTitle: action
        ) { print("Import material") }
    )
    .padding()
}

#Preview("Welcome Back") {
    EncouragementBanner(
        message: EncouragementMessage(
            title: EncouragementService.shared.greetingMessage(userName: "Mario"),
            message: "Hai 3 compiti da completare oggi!",
            emoji: "👋",
            actionTitle: "Inizia"
        ) { print("Start") }
    )
    .padding()
}
