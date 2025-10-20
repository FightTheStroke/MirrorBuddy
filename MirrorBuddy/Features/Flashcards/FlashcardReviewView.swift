//
//  FlashcardReviewView.swift
//  MirrorBuddy
//
//  Enhanced flashcard review interface with SM-2 spaced repetition
//  and quality rating system for optimal learning.
//

import SwiftData
import SwiftUI

struct FlashcardReviewView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Query private var allFlashcards: [Flashcard]

    let material: Material?

    @State private var dueFlashcards: [Flashcard] = []
    @State private var currentIndex: Int = 0
    @State private var showAnswer: Bool = false
    @State private var isLoading: Bool = true
    @State private var reviewedCount: Int = 0

    private var currentFlashcard: Flashcard? {
        guard currentIndex < dueFlashcards.count else { return nil }
        return dueFlashcards[currentIndex]
    }

    private var isReviewComplete: Bool {
        currentIndex >= dueFlashcards.count
    }

    var body: some View {
        VStack(spacing: 0) {
            if isLoading {
                ProgressView("Loading flashcards...")
            } else if dueFlashcards.isEmpty {
                EmptyReviewView()
            } else if isReviewComplete {
                CompletedReviewView(reviewedCount: reviewedCount) {
                    dismiss()
                }
            } else if let flashcard = currentFlashcard {
                VStack(spacing: 16) {
                    // Progress bar
                    ProgressBar(
                        current: currentIndex + 1,
                        total: dueFlashcards.count
                    )

                    // Flashcard
                    FlashcardView(
                        flashcard: flashcard,
                        showAnswer: showAnswer
                    ) { showAnswer.toggle() }

                    // Review buttons or show answer button
                    if showAnswer {
                        ReviewButtonsView { quality in
                            reviewFlashcard(flashcard, quality: quality)
                        }
                    } else {
                        Button {
                            withAnimation {
                                showAnswer = true
                            }
                        } label: {
                            HStack {
                                Image(systemName: "eye")
                                Text("Show Answer")
                            }
                            .font(.title3.bold())
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .cornerRadius(12)
                        }
                        .buttonStyle(.childFriendly)
                        .padding(.horizontal)
                    }

                    // Statistics
                    if let flashcard = currentFlashcard {
                        FlashcardStatsView(flashcard: flashcard)
                    }
                }
                .padding()
            }
        }
        .navigationTitle(material?.title ?? "Review Flashcards")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Done") {
                    dismiss()
                }
                .buttonStyle(.icon(color: .blue, size: 44))
            }
        }
        .task {
            await loadDueFlashcards()
        }
    }

    private func loadDueFlashcards() async {
        let service = SpacedRepetitionService.shared

        if let material = material {
            dueFlashcards = await service.getDueFlashcards(
                for: material,
                from: allFlashcards,
                limit: 20
            )
        } else {
            dueFlashcards = await service.getDueFlashcards(
                from: allFlashcards,
                limit: 20
            )
        }

        isLoading = false
    }

    private func reviewFlashcard(_ flashcard: Flashcard, quality: ReviewQuality) {
        Task {
            let service = SpacedRepetitionService.shared
            let result = await service.calculateNextReview(
                for: flashcard,
                quality: quality
            )

            // Update flashcard with new values
            flashcard.repetitions = result.repetitions
            flashcard.interval = result.interval
            flashcard.easeFactor = result.easeFactor
            flashcard.nextReviewDate = result.nextReviewDate
            flashcard.lastReviewedAt = result.lastReviewDate
            flashcard.reviewCount += 1

            if quality.rawValue >= 3 {
                flashcard.correctCount += 1
            }

            try? modelContext.save()

            // Move to next flashcard
            withAnimation {
                reviewedCount += 1
                showAnswer = false
                currentIndex += 1
            }
        }
    }
}

// MARK: - Flashcard View

struct FlashcardView: View {
    let flashcard: Flashcard
    let showAnswer: Bool
    let onFlip: () -> Void

    var body: some View {
        ZStack {
            // Card container
            RoundedRectangle(cornerRadius: 20)
                .fill(showAnswer ? Color.green.opacity(0.1) : Color.blue.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(showAnswer ? Color.green : Color.blue, lineWidth: 3)
                )
                .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 4)

            // Content
            VStack(spacing: 16) {
                // Label
                HStack {
                    Text(showAnswer ? "Answer" : "Question")
                        .font(.caption.bold())
                        .foregroundStyle(showAnswer ? .green : .blue)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(
                            Capsule()
                                .fill(showAnswer ? Color.green.opacity(0.2) : Color.blue.opacity(0.2))
                        )

                    Spacer()

                    // Flip icon
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.top)
                .padding(.horizontal)

                // Question/Answer text
                ScrollView {
                    VStack(spacing: 12) {
                        Text(showAnswer ? flashcard.answer : flashcard.question)
                            .font(.title3)
                            .fontWeight(.medium)
                            .multilineTextAlignment(.center)
                            .padding()

                        // Show explanation if available and answer is shown
                        if showAnswer, let explanation = flashcard.explanation {
                            Divider()
                                .padding(.horizontal)

                            VStack(alignment: .leading, spacing: 8) {
                                Text("Explanation")
                                    .font(.caption.bold())
                                    .foregroundStyle(.secondary)

                                Text(explanation)
                                    .font(.callout)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.horizontal)
                        }
                    }
                }

                Spacer()
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 350)
        .onTapGesture {
            withAnimation {
                onFlip()
            }
        }
    }
}

// MARK: - Review Buttons

struct ReviewButtonsView: View {
    let onReview: (ReviewQuality) -> Void

    var body: some View {
        VStack(spacing: 16) {
            Text("How well did you know this?")
                .font(.headline)

            // Two rows of buttons
            VStack(spacing: 12) {
                // Row 1: Again and Hard
                HStack(spacing: 12) {
                    ReviewButton(
                        quality: .incorrect,
                        onTap: onReview
                    )

                    ReviewButton(
                        quality: .hard,
                        onTap: onReview
                    )
                }

                // Row 2: Good and Easy
                HStack(spacing: 12) {
                    ReviewButton(
                        quality: .good,
                        onTap: onReview
                    )

                    ReviewButton(
                        quality: .easy,
                        onTap: onReview
                    )
                }
            }
        }
        .padding()
    }
}

struct ReviewButton: View {
    let quality: ReviewQuality
    let onTap: (ReviewQuality) -> Void

    var color: Color {
        switch quality {
        case .blackout, .incorrect: return .red
        case .hard: return .orange
        case .good: return .blue
        case .easy, .perfect: return .green
        }
    }

    var body: some View {
        Button {
            onTap(quality)
        } label: {
            VStack(spacing: 6) {
                Text(quality.shortName)
                    .font(.subheadline.bold())

                Text(quality.interval)
                    .font(.caption2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(color)
            .foregroundStyle(.white)
            .cornerRadius(12)
        }
        .buttonStyle(.childFriendly)
    }
}

// MARK: - Progress Bar

struct ProgressBar: View {
    let current: Int
    let total: Int

    var progress: Double {
        guard total > 0 else { return 0 }
        return Double(current) / Double(total)
    }

    var body: some View {
        VStack(spacing: 8) {
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.gray.opacity(0.2))

                    Rectangle()
                        .fill(Color.blue)
                        .frame(width: geometry.size.width * progress)
                }
            }
            .frame(height: 8)
            .cornerRadius(4)

            HStack {
                Text("Progress")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Spacer()

                Text("\(current) / \(total)")
                    .font(.caption.bold())
                    .foregroundStyle(.blue)
            }
        }
        .padding(.horizontal)
    }
}

// MARK: - Flashcard Stats

struct FlashcardStatsView: View {
    let flashcard: Flashcard

    var body: some View {
        HStack(spacing: 20) {
            FlashcardStatItem(
                icon: "repeat",
                label: "Reviews",
                value: "\(flashcard.reviewCount)"
            )

            Divider()
                .frame(height: 30)

            FlashcardStatItem(
                icon: "percent",
                label: "Accuracy",
                value: String(format: "%.0f%%", flashcard.accuracy * 100)
            )

            Divider()
                .frame(height: 30)

            FlashcardStatItem(
                icon: "calendar",
                label: "Next",
                value: "\(flashcard.interval)d"
            )
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
        .padding(.horizontal)
    }
}

struct FlashcardStatItem: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(.secondary)

            Text(value)
                .font(.headline)

            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Empty State

struct EmptyReviewView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(.green)

            Text("All Caught Up!")
                .font(.title.bold())

            Text("No flashcards are due for review right now")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .padding()
    }
}

// MARK: - Completed State

struct CompletedReviewView: View {
    let reviewedCount: Int
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "star.fill")
                .font(.system(size: 72))
                .foregroundStyle(.yellow)

            Text("Review Complete!")
                .font(.title.bold())

            Text("You reviewed \(reviewedCount) flashcard\(reviewedCount == 1 ? "" : "s")")
                .font(.body)
                .foregroundStyle(.secondary)

            Button {
                onDismiss()
            } label: {
                Text("Done")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
            }
            .buttonStyle(.childFriendly)
            .padding(.horizontal, 40)
        }
        .padding()
    }
}

// MARK: - Preview

#Preview {
    @Previewable @State var material: Material = {
        let m = Material(title: "Swift Programming")
        let flashcard1 = Flashcard(
            materialID: m.id,
            question: "What is SwiftUI?",
            answer: "A declarative UI framework by Apple",
            explanation: "SwiftUI allows you to build user interfaces across all Apple platforms with Swift code."
        )
        let flashcard2 = Flashcard(
            materialID: m.id,
            question: "What is SwiftData?",
            answer: "A framework for persistent data management"
        )

        flashcard1.reviewCount = 5
        flashcard1.correctCount = 4
        flashcard1.interval = 6

        m.flashcards = [flashcard1, flashcard2]
        return m
    }()

    NavigationStack {
        FlashcardReviewView(material: material)
    }
}
