//
//  OnboardingVoiceFirstTutorialView.swift
//  MirrorBuddy
//
//  Voice-first conversation tutorial with Siri integration
//  Teaches users about real-time conversation, VAD, barge-in, etc.
//

import SwiftUI

/// Enhanced voice-first tutorial for real-time conversation
struct OnboardingVoiceFirstTutorialView: View {
    @ObservedObject var state: OnboardingState
    @State private var currentPage = 0
    @State private var showingSiriSettings = false

    private let totalPages = 5

    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 12) {
                Text("Coach Vocale MirrorBuddy")
                    .font(.title.bold())

                Text("Conversazioni naturali con AI")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(.ultraThinMaterial)

            // Tab view with pages
            TabView(selection: $currentPage) {
                // Page 1: Siri Integration
                siriIntegrationPage
                    .tag(0)

                // Page 2: Always-On Listening
                alwaysOnListeningPage
                    .tag(1)

                // Page 3: State Feedback
                stateFeedbackPage
                    .tag(2)

                // Page 4: Barge-In
                bargeInPage
                    .tag(3)

                // Page 5: Best Practices
                bestPracticesPage
                    .tag(4)
            }
            .tabViewStyle(.page(indexDisplayMode: .always))
            .indexViewStyle(.page(backgroundDisplayMode: .always))

            // Navigation
            HStack(spacing: 16) {
                if currentPage > 0 {
                    Button {
                        withAnimation {
                            currentPage -= 1
                        }
                    } label: {
                        HStack {
                            Image(systemName: "chevron.left")
                            Text("Indietro")
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }

                Button {
                    if currentPage < totalPages - 1 {
                        withAnimation {
                            currentPage += 1
                        }
                    } else {
                        state.hasCompletedVoiceTutorial = true
                    }
                } label: {
                    HStack {
                        Text(currentPage == totalPages - 1 ? "Completato!" : "Continua")
                        Image(systemName: currentPage == totalPages - 1 ? "checkmark" : "chevron.right")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()
        }
    }

    // MARK: - Pages

    private var siriIntegrationPage: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Icon
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [.blue.opacity(0.2), .purple.opacity(0.2)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 120, height: 120)

                    Image(systemName: "waveform.circle.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.blue, .purple],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                }
                .padding(.top, 32)

                VStack(spacing: 12) {
                    Text("Usa Siri per iniziare")
                        .font(.title2.bold())

                    Text("Avvia conversazioni vocali senza toccare lo schermo")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                // Instructions
                VStack(spacing: 16) {
                    InstructionStep(
                        number: 1,
                        title: "Attiva Siri",
                        description: "Dì \"Hey Siri\" oppure premi il tasto laterale"
                    )

                    InstructionStep(
                        number: 2,
                        title: "Avvia MirrorBuddy",
                        description: "Dì \"Parla con MirrorBuddy\""
                    )

                    InstructionStep(
                        number: 3,
                        title: "Inizia a parlare",
                        description: "L'app si apre e inizia ad ascoltarti automaticamente!"
                    )
                }
                .padding(.horizontal)

                // Example phrases
                VStack(alignment: .leading, spacing: 12) {
                    Text("Frasi di esempio")
                        .font(.headline)

                    VStack(spacing: 8) {
                        ExamplePhraseRow(phrase: "Hey Siri, parla con MirrorBuddy")
                        ExamplePhraseRow(phrase: "Hey Siri, aiutami con la matematica")
                        ExamplePhraseRow(phrase: "Hey Siri, spiegami le scienze")
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal)

                // Setup Siri button
                Button {
                    // Open Siri settings
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                } label: {
                    HStack {
                        Image(systemName: "gear")
                        Text("Configura Siri")
                    }
                }
                .buttonStyle(.bordered)

                Spacer()
            }
        }
    }

    private var alwaysOnListeningPage: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Breathing animation preview
                VStack(spacing: 16) {
                    BreathingAnimationView(
                        state: .passive,
                        size: 120
                    )
                    .padding(.top, 32)

                    VStack(spacing: 8) {
                        Text("Always-On Listening")
                            .font(.title2.bold())

                        Text("L'app ti ascolta in modo passivo, pronta a rispondere")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                }

                // How it works
                VStack(alignment: .leading, spacing: 16) {
                    Text("Come funziona")
                        .font(.headline)

                    FeatureCard(
                        icon: "waveform",
                        color: .blue.opacity(0.6),
                        title: "Ascolto Passivo",
                        description: "L'app è sempre pronta. Vedi l'animazione \"respiro\" calma quando è in ascolto."
                    )

                    FeatureCard(
                        icon: "mic.fill",
                        color: .blue,
                        title: "Rileva Quando Parli",
                        description: "Grazie al VAD (Voice Activity Detection), l'app rileva automaticamente quando inizi a parlare."
                    )

                    FeatureCard(
                        icon: "brain.head.profile",
                        color: .green,
                        title: "Analisi AI",
                        description: "Quando smetti di parlare, l'AI elabora la tua domanda automaticamente."
                    )

                    FeatureCard(
                        icon: "speaker.wave.3.fill",
                        color: .purple,
                        title: "Risposta Vocale",
                        description: "L'AI risponde con voce naturale, mentre puoi seguire il testo sullo schermo."
                    )
                }
                .padding(.horizontal)

                Spacer()
            }
        }
    }

    private var stateFeedbackPage: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(spacing: 12) {
                    Image(systemName: "light.beacon.max.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(.orange)
                        .padding(.top, 32)

                    Text("Feedback Multi-Sensoriale")
                        .font(.title2.bold())

                    Text("Ricevi conferme visive, tattili e audio")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                // State examples
                VStack(spacing: 16) {
                    StateExample(
                        state: .passive,
                        description: "Ascolto passivo - Animazione respiro calma"
                    )

                    StateExample(
                        state: .listening,
                        description: "Ti sto ascoltando - Colore blu, vibrazione leggera"
                    )

                    StateExample(
                        state: .thinking,
                        description: "Sto pensando - Colore verde, tono audio"
                    )

                    StateExample(
                        state: .speaking,
                        description: "Sto parlando - Colore viola, waveform attiva"
                    )
                }
                .padding(.horizontal)

                // Accessibility features
                VStack(alignment: .leading, spacing: 12) {
                    Text("Feedback Accessibili")
                        .font(.headline)

                    FeatureCard(
                        icon: "hand.tap.fill",
                        color: .pink,
                        title: "Feedback Tattile",
                        description: "Pattern di vibrazioni diversi per ogni stato della conversazione."
                    )

                    FeatureCard(
                        icon: "speaker.wave.2.fill",
                        color: .orange,
                        title: "Cues Audio",
                        description: "Toni delicati ti avvisano dei cambiamenti di stato."
                    )

                    FeatureCard(
                        icon: "eye.fill",
                        color: .blue,
                        title: "Indicatori Visivi",
                        description: "Colori e animazioni chiare per ogni fase della conversazione."
                    )
                }
                .padding(.horizontal)

                Spacer()
            }
        }
    }

    private var bargeInPage: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(spacing: 16) {
                    Image(systemName: "hand.raised.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(.red)
                        .padding(.top, 32)

                    Text("Interrompi Quando Vuoi")
                        .font(.title2.bold())

                    Text("Puoi interrompere l'AI mid-sentence per porre una nuova domanda")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                // How to interrupt
                VStack(alignment: .leading, spacing: 16) {
                    Text("Come funziona")
                        .font(.headline)

                    InstructionStep(
                        number: 1,
                        title: "AI sta parlando",
                        description: "Vedi lo stato viola e l'animazione waveform"
                    )

                    InstructionStep(
                        number: 2,
                        title: "Inizia a parlare",
                        description: "Non aspettare che finisca, inizia a parlare quando vuoi"
                    )

                    InstructionStep(
                        number: 3,
                        title: "Interruzione automatica",
                        description: "L'AI si ferma immediatamente e inizia ad ascoltarti"
                    )

                    InstructionStep(
                        number: 4,
                        title: "Nuova domanda",
                        description: "Continua la conversazione con la tua nuova domanda"
                    )
                }
                .padding(.horizontal)

                // Example scenario
                VStack(alignment: .leading, spacing: 12) {
                    Text("Esempio")
                        .font(.headline)

                    VStack(spacing: 12) {
                        ConversationBubble(
                            isUser: true,
                            text: "Spiegami le frazioni"
                        )

                        ConversationBubble(
                            isUser: false,
                            text: "Le frazioni rappresentano parti di un intero. Per esempio, 1/2 significa..."
                        )

                        HStack {
                            Image(systemName: "hand.raised.fill")
                                .foregroundStyle(.orange)
                            Text("Interruzione!")
                                .font(.caption.bold())
                                .foregroundStyle(.orange)
                        }
                        .padding(.vertical, 4)

                        ConversationBubble(
                            isUser: true,
                            text: "Aspetta, puoi spiegarlo come se fossi in Fortnite?"
                        )

                        ConversationBubble(
                            isUser: false,
                            text: "Certo! Immagina di avere uno scudo con 100 HP..."
                        )
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal)

                Spacer()
            }
        }
    }

    private var bestPracticesPage: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(spacing: 16) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(.yellow)
                        .padding(.top, 32)

                    Text("Best Practices")
                        .font(.title2.bold())

                    Text("Suggerimenti per la migliore esperienza")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                // Tips
                VStack(spacing: 16) {
                    TipCard(
                        icon: "checkmark.circle.fill",
                        color: .green,
                        title: "Parla naturalmente",
                        description: "Non serve usare parole chiave o frasi specifiche. Parla come faresti con un amico."
                    )

                    TipCard(
                        icon: "checkmark.circle.fill",
                        color: .green,
                        title: "Ambiente silenzioso",
                        description: "Per risultati migliori, usa l'app in un ambiente tranquillo senza rumori di fondo."
                    )

                    TipCard(
                        icon: "checkmark.circle.fill",
                        color: .green,
                        title: "Interrompi liberamente",
                        description: "Non aspettare che l'AI finisca. Interrompi quando hai una nuova domanda o chiarimento."
                    )

                    TipCard(
                        icon: "checkmark.circle.fill",
                        color: .green,
                        title: "Controlla i feedback",
                        description: "Osserva i colori, senti le vibrazioni e i toni audio per capire lo stato della conversazione."
                    )

                    TipCard(
                        icon: "lightbulb.fill",
                        color: .yellow,
                        title: "Personalizza le frasi",
                        description: "Vai in Impostazioni → Siri per aggiungere frasi personalizzate ai tuoi argomenti preferiti."
                    )
                }
                .padding(.horizontal)

                // Troubleshooting
                VStack(alignment: .leading, spacing: 12) {
                    Text("Risoluzione Problemi")
                        .font(.headline)

                    VStack(alignment: .leading, spacing: 8) {
                        TroubleshootingRow(
                            problem: "L'app non mi sente",
                            solution: "Controlla i permessi del microfono in Impostazioni → Privacy"
                        )

                        TroubleshootingRow(
                            problem: "Siri non trova MirrorBuddy",
                            solution: "Apri l'app una volta, poi riprova con Siri"
                        )

                        TroubleshootingRow(
                            problem: "Troppi rumori di fondo",
                            solution: "Vai in un ambiente più silenzioso o regola la sensibilità VAD nelle impostazioni"
                        )
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal)

                Spacer()
            }
        }
    }
}

// MARK: - Supporting Views

private struct InstructionStep: View {
    let number: Int
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            ZStack {
                Circle()
                    .fill(Color.blue)
                    .frame(width: 32, height: 32)

                Text("\(number)")
                    .font(.headline.bold())
                    .foregroundStyle(.white)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)

                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
    }
}

private struct ExamplePhraseRow: View {
    let phrase: String

    var body: some View {
        HStack {
            Image(systemName: "quote.bubble.fill")
                .foregroundStyle(.blue)

            Text(phrase)
                .font(.subheadline)

            Spacer()
        }
    }
}

private struct FeatureCard: View {
    let icon: String
    let color: Color
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.bold())

                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}

private struct StateExample: View {
    let state: VoiceSessionState
    let description: String

    var body: some View {
        HStack(spacing: 16) {
            VoiceStateVisualization(
                state: state,
                waveformAmplitudes: Array(repeating: 0.6, count: 20),
                size: 60
            )

            VStack(alignment: .leading, spacing: 4) {
                Text(state.statusText)
                    .font(.subheadline.bold())
                    .foregroundStyle(state.primaryColor)

                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding()
        .background(
            LinearGradient(
                colors: [
                    state.primaryColor.opacity(0.1),
                    state.secondaryColor.opacity(0.1)
                ],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .cornerRadius(12)
    }
}

private struct ConversationBubble: View {
    let isUser: Bool
    let text: String

    var body: some View {
        HStack {
            if isUser { Spacer() }

            Text(text)
                .font(.subheadline)
                .padding(12)
                .background(isUser ? Color.blue : Color(.systemGray5))
                .foregroundStyle(isUser ? .white : .primary)
                .cornerRadius(16)
                .frame(maxWidth: 250, alignment: isUser ? .trailing : .leading)

            if !isUser { Spacer() }
        }
    }
}

private struct TipCard: View {
    let icon: String
    let color: Color
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.bold())

                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}

private struct TroubleshootingRow: View {
    let problem: String
    let solution: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(.orange)
                    .font(.caption)

                Text(problem)
                    .font(.caption.bold())
            }

            Text("→ \(solution)")
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.leading, 20)
        }
    }
}

// MARK: - Preview

#Preview {
    OnboardingVoiceFirstTutorialView(state: OnboardingState())
}
