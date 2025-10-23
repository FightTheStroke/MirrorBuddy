//
//  FlashcardStudyView.swift
//  MirrorBuddy
//
//  Minimal flashcard study interface for voice command integration
//  TODO: Expand with spaced repetition, flip animations, progress tracking
//

import SwiftUI

/// Minimal flashcard study view (Task 111 follow-up)
struct FlashcardStudyView: View {
    let material: Material
    @Environment(\.dismiss) private var dismiss

    @State private var currentIndex = 0
    @State private var showAnswer = false

    private var flashcards: [Flashcard] {
        material.flashcards ?? []
    }

    private var currentFlashcard: Flashcard? {
        guard !flashcards.isEmpty && currentIndex < flashcards.count else { return nil }
        return flashcards[currentIndex]
    }

    var body: some View {
        VStack(spacing: 0) {
            // Progress indicator
            progressBar

            Spacer()

            if let flashcard = currentFlashcard {
                // Flashcard display
                flashcardView(flashcard)
            } else {
                // No flashcards available
                noFlashcardsView
            }

            Spacer()

            // Navigation controls
            if !flashcards.isEmpty {
                controlsView
            }
        }
        .padding()
        .navigationTitle(material.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Fine") {
                    dismiss()
                }
                .buttonStyle(.icon(color: .blue, size: 44))
            }
        }
    }

    // MARK: - Progress Bar

    private var progressBar: some View {
        VStack(spacing: 8) {
            ProgressView(value: Double(currentIndex + 1), total: Double(flashcards.count))
                .tint(.blue)

            Text("\(currentIndex + 1) di \(flashcards.count)")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Flashcard View

    private func flashcardView(_ flashcard: Flashcard) -> some View {
        VStack(spacing: 24) {
            // Card
            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(showAnswer ? Color.green.opacity(0.1) : Color.blue.opacity(0.1))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(showAnswer ? Color.green : Color.blue, lineWidth: 2)
                    )

                VStack(spacing: 16) {
                    // Question/Answer label
                    Text(showAnswer ? "Risposta" : "Domanda")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(showAnswer ? .green : .blue)
                        .padding(.top)

                    // Content
                    ScrollView {
                        Text(showAnswer ? flashcard.answer : flashcard.question)
                            .font(.title3)
                            .multilineTextAlignment(.center)
                            .padding()
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 300)

            // Flip button
            Button {
                withAnimation {
                    showAnswer.toggle()
                }
            } label: {
                HStack {
                    Image(systemName: "arrow.triangle.2.circlepath")
                    Text(showAnswer ? "Mostra Domanda" : "Mostra Risposta")
                }
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(showAnswer ? Color.green : Color.blue)
                .cornerRadius(12)
            }
            .buttonStyle(.childFriendly)
        }
    }

    // MARK: - No Flashcards View

    private var noFlashcardsView: some View {
        ContentUnavailableView {
            Label("Nessuna Flashcard", systemImage: "rectangle.portrait.on.rectangle.portrait")
        } description: {
            Text("Questo materiale non ha ancora flashcard")
        }
    }

    // MARK: - Controls View

    private var controlsView: some View {
        HStack(spacing: 16) {
            // Previous button
            Button {
                withAnimation {
                    if currentIndex > 0 {
                        currentIndex -= 1
                        showAnswer = false
                    }
                }
            } label: {
                Image(systemName: "chevron.left")
                    .font(.title2)
                    .frame(width: 60, height: 60)
            }
            .buttonStyle(.icon(color: .gray, size: 60))
            .disabled(currentIndex == 0)

            Spacer()

            // Card counter
            VStack(spacing: 4) {
                Text("Flashcard")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Text("\(currentIndex + 1)/\(flashcards.count)")
                    .font(.headline)
            }

            Spacer()

            // Next button
            Button {
                withAnimation {
                    if currentIndex < flashcards.count - 1 {
                        currentIndex += 1
                        showAnswer = false
                    }
                }
            } label: {
                Image(systemName: "chevron.right")
                    .font(.title2)
                    .frame(width: 60, height: 60)
            }
            .buttonStyle(.icon(color: .blue, size: 60))
            .disabled(currentIndex >= flashcards.count - 1)
        }
        .padding(.vertical)
    }
}

// MARK: - Preview

#Preview {
    @Previewable @State var material: Material = {
        let m = Material(title: "Test Material")
        let flashcard1 = Flashcard(
            materialID: m.id,
            question: "Cos'è SwiftUI?",
            answer: "Un framework UI dichiarativo di Apple"
        )
        let flashcard2 = Flashcard(
            materialID: m.id,
            question: "Cos'è SwiftData?",
            answer: "Un framework per la gestione dei dati persistenti"
        )

        m.flashcards = [flashcard1, flashcard2]
        return m
    }()

    NavigationStack {
        FlashcardStudyView(material: material)
    }
}
