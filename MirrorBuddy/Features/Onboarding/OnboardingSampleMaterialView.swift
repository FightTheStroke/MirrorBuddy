import SwiftUI

// MARK: - Sample Material Demo View (Task 55.1)

/// Demonstration of app features with sample material
struct OnboardingSampleMaterialView: View {
    @ObservedObject var state: OnboardingState

    @State private var currentFeature: DemoFeature = .summary
    @State private var showDemo = false

    enum DemoFeature: String, CaseIterable {
        case summary = "Riassunto"
        case mindMap = "Mappa Mentale"
        case flashcards = "Flashcard"
        case voiceControl = "Comandi Vocali"

        var icon: String {
            switch self {
            case .summary: return "doc.text.fill"
            case .mindMap: return "map.fill"
            case .flashcards: return "rectangle.stack.fill"
            case .voiceControl: return "mic.fill"
            }
        }

        var color: Color {
            switch self {
            case .summary: return .blue
            case .mindMap: return .green
            case .flashcards: return .orange
            case .voiceControl: return .purple
            }
        }

        var description: String {
            switch self {
            case .summary:
                return "Genera riassunti automatici dei tuoi materiali con Apple Intelligence"
            case .mindMap:
                return "Visualizza concetti complessi con mappe mentali generate da AI"
            case .flashcards:
                return "Studia con flashcard che si adattano al tuo livello di apprendimento"
            case .voiceControl:
                return "Naviga l'app usando solo la tua voce, perfetto per studiare a mani libere"
            }
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                // Header
                VStack(spacing: 16) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 60))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.blue, .purple],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )

                    Text("Scopri le Funzionalità")
                        .font(.title.bold())

                    Text("Esplora cosa può fare MirrorBuddy con un materiale di esempio")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                }
                .padding(.top, 32)

                // Feature selector
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(DemoFeature.allCases, id: \.self) { feature in
                            FeatureChip(
                                feature: feature,
                                isSelected: currentFeature == feature
                            ) {
                                withAnimation {
                                    currentFeature = feature
                                }
                            }
                        }
                    }
                    .padding(.horizontal)
                }

                // Current feature demo
                VStack(spacing: 20) {
                    // Feature icon and title
                    VStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(currentFeature.color.opacity(0.2))
                                .frame(width: 80, height: 80)

                            Image(systemName: currentFeature.icon)
                                .font(.system(size: 40))
                                .foregroundStyle(currentFeature.color)
                        }

                        Text(currentFeature.rawValue)
                            .font(.title2.bold())

                        Text(currentFeature.description)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                    }

                    // Feature preview
                    demoContent(for: currentFeature)
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(12)
                        .shadow(color: .black.opacity(0.05), radius: 8)
                        .padding(.horizontal, 32)
                }
                .transition(.opacity)

                // Mark as completed button
                if !state.hasViewedSampleMaterial {
                    Button {
                        state.hasViewedSampleMaterial = true
                    } label: {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                            Text("Ho capito, continua")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundStyle(.white)
                        .cornerRadius(12)
                    }
                    .padding(.horizontal, 32)
                }

                Spacer(minLength: 32)
            }
        }
    }

    @ViewBuilder
    private func demoContent(for feature: DemoFeature) -> some View {
        switch feature {
        case .summary:
            VStack(alignment: .leading, spacing: 12) {
                Text("Esempio di Riassunto")
                    .font(.headline)

                Text("""
                La fotosintesi è il processo attraverso cui le piante convertono la luce solare in energia chimica.

                • Le piante usano clorofilla per catturare la luce
                • L'anidride carbonica e l'acqua vengono trasformate
                • Il risultato è glucosio e ossigeno
                • L'energia viene immagazzinata nei legami chimici
                """)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }

        case .mindMap:
            VStack(spacing: 12) {
                Text("Mappa Mentale Generata")
                    .font(.headline)

                // Simple mind map representation
                MindMapPreview()
            }

        case .flashcards:
            VStack(spacing: 12) {
                Text("Flashcard di Esempio")
                    .font(.headline)

                // Flashcard preview
                FlashcardPreview()
            }

        case .voiceControl:
            VStack(alignment: .leading, spacing: 12) {
                Text("Comandi Disponibili")
                    .font(.headline)

                VStack(spacing: 8) {
                    VoiceCommandRow(command: "leggi", description: "Ascolta il materiale")
                    VoiceCommandRow(command: "mostra mappa", description: "Visualizza mappa mentale")
                    VoiceCommandRow(command: "flashcard", description: "Inizia ripasso")
                }
            }
        }
    }
}

// MARK: - Feature Chip

private struct FeatureChip: View {
    let feature: OnboardingSampleMaterialView.DemoFeature
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: feature.icon)
                Text(feature.rawValue)
            }
            .font(.subheadline.weight(isSelected ? .semibold : .regular))
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(isSelected ? feature.color : Color.gray.opacity(0.2))
            .foregroundStyle(isSelected ? .white : .primary)
            .cornerRadius(20)
        }
    }
}

// MARK: - Mind Map Preview

private struct MindMapPreview: View {
    var body: some View {
        VStack {
            // Central concept
            Text("Fotosintesi")
                .font(.headline)
                .padding(12)
                .background(Color.green)
                .foregroundStyle(.white)
                .cornerRadius(8)

            HStack(spacing: 40) {
                // Branch 1
                VStack {
                    Text("Input")
                        .font(.caption)
                        .padding(8)
                        .background(Color.blue.opacity(0.2))
                        .cornerRadius(6)

                    Text("• Luce\n• CO₂\n• H₂O")
                        .font(.caption)
                }

                // Branch 2
                VStack {
                    Text("Output")
                        .font(.caption)
                        .padding(8)
                        .background(Color.orange.opacity(0.2))
                        .cornerRadius(6)

                    Text("• Glucosio\n• O₂")
                        .font(.caption)
                }
            }
        }
        .padding()
    }
}

// MARK: - Flashcard Preview

private struct FlashcardPreview: View {
    @State private var isFlipped = false

    var body: some View {
        Button {
            withAnimation(.spring()) {
                isFlipped.toggle()
            }
        } label: {
            VStack {
                if !isFlipped {
                    VStack(spacing: 8) {
                        Text("Domanda")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        Text("Cosa produce la fotosintesi?")
                            .font(.headline)
                            .multilineTextAlignment(.center)
                    }
                } else {
                    VStack(spacing: 8) {
                        Text("Risposta")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        Text("Glucosio e Ossigeno")
                            .font(.headline)
                            .multilineTextAlignment(.center)
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 120)
            .padding()
            .background(isFlipped ? Color.green.opacity(0.1) : Color.blue.opacity(0.1))
            .cornerRadius(12)
            .rotation3DEffect(
                .degrees(isFlipped ? 180 : 0),
                axis: (x: 0, y: 1, z: 0)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Voice Command Row

private struct VoiceCommandRow: View {
    let command: String
    let description: String

    var body: some View {
        HStack {
            Image(systemName: "mic.fill")
                .foregroundStyle(.purple)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text("\"\(command)\"")
                    .font(.subheadline.bold())

                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
    }
}

// MARK: - Preview

#Preview {
    OnboardingSampleMaterialView(state: OnboardingState())
}
