import SwiftUI

/// Guided flashcard study view with voice coaching
struct GuidedFlashcardView: View {
    @StateObject private var coachService: GuidedFlashcardService
    @State private var isFlipped = false
    @State private var showCelebration = false

    init(cards: [FlashcardItem], subject: String? = nil) {
        _coachService = StateObject(wrappedValue: GuidedFlashcardService(cards: cards, subject: subject))
    }

    var body: some View {
        ZStack {
            // Main content
            mainContent

            // Celebration overlay
            if showCelebration {
                celebrationOverlay
            }
        }
        .onAppear {
            coachService.startSession()
        }
    }

    // MARK: - Main Content

    private var mainContent: some View {
        VStack(spacing: 24) {
            // Header
            header

            // Phase indicator
            phaseIndicator

            // Progress bar
            progressBar

            Spacer()

            // Card view
            if let card = coachService.currentCard {
                flashcardView(card)
            }

            Spacer()

            // Answer buttons
            if coachService.currentPhase == .practice && isFlipped {
                answerButtons
            }
        }
        .padding()
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Sessione Guidata")
                    .font(.title2)
                    .fontWeight(.bold)

                Text(phaseTitle)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Spacer()

            // Stats
            VStack(alignment: .trailing, spacing: 4) {
                HStack(spacing: 4) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text("\(coachService.correctAnswers)")
                }

                HStack(spacing: 4) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.red)
                    Text("\(coachService.incorrectAnswers)")
                }
            }
            .font(.caption)
        }
    }

    private var phaseTitle: String {
        switch coachService.currentPhase {
        case .warmUp: return "Riscaldamento"
        case .practice: return "Pratica"
        case .wrapUp: return "Riepilogo"
        }
    }

    // MARK: - Phase Indicator

    private var phaseIndicator: some View {
        HStack(spacing: 12) {
            phaseIndicatorCircle(.warmUp)
            phaseIndicatorLine()
            phaseIndicatorCircle(.practice)
            phaseIndicatorLine()
            phaseIndicatorCircle(.wrapUp)
        }
    }

    private func phaseIndicatorCircle(_ phase: FlashcardCoachScript.SessionPhase) -> some View {
        Circle()
            .fill(coachService.currentPhase.rawValue >= phase.rawValue ? Color.blue : Color.gray.opacity(0.3))
            .frame(width: 12, height: 12)
    }

    private func phaseIndicatorLine() -> some View {
        Rectangle()
            .fill(Color.gray.opacity(0.3))
            .frame(height: 2)
    }

    // MARK: - Progress Bar

    private var progressBar: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("Progresso")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                Text("\(coachService.currentCardIndex + 1) / \(coachService.totalCards)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            ProgressView(value: coachService.progress)
                .tint(.blue)
        }
    }

    // MARK: - Flashcard

    private func flashcardView(_ card: FlashcardItem) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.blue.opacity(isFlipped ? 0.2 : 0.1))
                .shadow(radius: 10)

            VStack(spacing: 16) {
                Text(isFlipped ? "Risposta" : "Domanda")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(isFlipped ? card.answer : card.question)
                    .font(.title3)
                    .fontWeight(.medium)
                    .multilineTextAlignment(.center)
                    .padding()

                if !isFlipped, let hint = card.hint {
                    Text("Suggerimento: \(hint)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.top, 8)
                }
            }
            .padding()
        }
        .frame(height: 300)
        .rotation3DEffect(
            .degrees(isFlipped ? 180 : 0),
            axis: (x: 0, y: 1, z: 0)
        )
        .onTapGesture {
            withAnimation(.spring()) {
                isFlipped.toggle()
            }
        }
    }

    // MARK: - Answer Buttons

    private var answerButtons: some View {
        HStack(spacing: 16) {
            Button {
                recordAnswer(correct: false)
            } label: {
                Label("Sbagliato", systemImage: "xmark.circle.fill")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.red.opacity(0.2))
                    .foregroundColor(.red)
                    .cornerRadius(12)
            }

            Button {
                recordAnswer(correct: true)
            } label: {
                Label("Corretto", systemImage: "checkmark.circle.fill")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.green.opacity(0.2))
                    .foregroundColor(.green)
                    .cornerRadius(12)
            }
        }
    }

    private func recordAnswer(correct: Bool) {
        isFlipped = false

        if correct && coachService.currentStreak >= 2 {
            showCelebration = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                showCelebration = false
            }
        }

        coachService.recordAnswer(correct: correct)
    }

    // MARK: - Celebration Overlay

    private var celebrationOverlay: some View {
        ZStack {
            Color.clear

            VStack {
                Text("🎉")
                    .font(.system(size: 80))

                Text("Stai andando alla grande!")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            }
            .padding()
            .background(Color.blue.opacity(0.9))
            .cornerRadius(20)
        }
        .transition(.scale.combined(with: .opacity))
    }
}

// MARK: - Extensions

extension FlashcardCoachScript.SessionPhase: Comparable {
    var rawValue: Int {
        switch self {
        case .warmUp: return 0
        case .practice: return 1
        case .wrapUp: return 2
        }
    }

    static func < (lhs: FlashcardCoachScript.SessionPhase, rhs: FlashcardCoachScript.SessionPhase) -> Bool {
        lhs.rawValue < rhs.rawValue
    }
}

// MARK: - Preview

#Preview {
    GuidedFlashcardView(cards: [
        FlashcardItem(question: "Quanto fa 2+2?", answer: "4", hint: "Pensa ai numeri piccoli"),
        FlashcardItem(question: "Chi ha scritto la Divina Commedia?", answer: "Dante Alighieri"),
        FlashcardItem(question: "Qual è la capitale d'Italia?", answer: "Roma")
    ], subject: "Generale")
}
