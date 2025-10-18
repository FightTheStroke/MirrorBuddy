@preconcurrency import Combine
import SwiftUI

/// Combined vision and voice interaction for homework help
/// Integrates camera capture, vision analysis, and voice coaching (Task 37)
struct HomeworkHelpView: View {
    @StateObject private var viewModel = HomeworkHelpViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: [Color.blue.opacity(0.1), Color.purple.opacity(0.1)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Image preview or camera prompt
                    imagePreviewSection

                    // Analysis results
                    if viewModel.analysisState == .analyzing || viewModel.analysisState == .complete {
                        analysisResultsSection
                    }

                    Spacer()

                    // Action buttons
                    actionButtonsSection
                        .padding()
                }
            }
            .navigationTitle("Homework Help")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        viewModel.stopVoiceSession()
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $viewModel.showingCamera) {
                CameraView()
                    .onDisappear {
                        // Check if image was captured
                        if let capturedImage = viewModel.capturedImage {
                            _Concurrency.Task {
                                await viewModel.analyzeImage(capturedImage)
                            }
                        }
                    }
            }
            .sheet(isPresented: $viewModel.showingVoiceSession) {
                VoiceConversationView()
                    .onAppear {
                        viewModel.startVoiceSessionWithContext()
                    }
            }
            .alert("Error", isPresented: $viewModel.showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(viewModel.errorMessage)
            }
        }
    }

    // MARK: - Image Preview Section

    private var imagePreviewSection: some View {
        Group {
            if let image = viewModel.capturedImage {
                ZStack(alignment: .topTrailing) {
                    Image(uiImage: image)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(maxHeight: 300)
                        .cornerRadius(12)
                        .padding()

                    // Clear button
                    Button {
                        viewModel.clearImage()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2)
                            .foregroundStyle(.white)
                            .background(Circle().fill(Color.black.opacity(0.6)))
                    }
                    .padding(24)
                }
            } else {
                VStack(spacing: 16) {
                    Image(systemName: "camera.viewfinder")
                        .font(.system(size: 60))
                        .foregroundStyle(.secondary)

                    Text("Capture your homework")
                        .font(.headline)
                        .foregroundStyle(.secondary)

                    Text("Take a photo to get started with voice assistance")
                        .font(.subheadline)
                        .foregroundStyle(.tertiary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 300)
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .padding()
            }
        }
    }

    // MARK: - Analysis Results Section

    private var analysisResultsSection: some View {
        VStack(spacing: 16) {
            if viewModel.analysisState == .analyzing {
                ProgressView()
                    .scaleEffect(1.5)
                Text("Analyzing your homework...")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else if viewModel.analysisState == .complete {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Analysis Complete")
                        .font(.headline)

                    if let analysis = viewModel.analysisResult {
                        ScrollView {
                            VStack(alignment: .leading, spacing: 8) {
                                if !analysis.detectedText.isEmpty {
                                    Label("Text detected", systemImage: "text.viewfinder")
                                        .font(.subheadline)
                                        .foregroundStyle(.green)
                                }

                                if !analysis.identifiedConcepts.isEmpty {
                                    Label("\(analysis.identifiedConcepts.count) concepts identified", systemImage: "brain")
                                        .font(.subheadline)
                                        .foregroundStyle(.blue)

                                    ForEach(analysis.identifiedConcepts, id: \.self) { concept in
                                        Text("• \(concept)")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }

                                if !analysis.extractedProblems.isEmpty {
                                    Label("\(analysis.extractedProblems.count) problems found", systemImage: "function")
                                        .font(.subheadline)
                                        .foregroundStyle(.purple)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .frame(maxHeight: 150)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .padding(.horizontal)
            }
        }
    }

    // MARK: - Action Buttons Section

    private var actionButtonsSection: some View {
        VStack(spacing: 16) {
            // Camera button
            if viewModel.capturedImage == nil {
                Button {
                    viewModel.showingCamera = true
                } label: {
                    HStack {
                        Image(systemName: "camera.fill")
                            .font(.title3)
                        Text("Take Photo")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        LinearGradient(
                            colors: [.blue, .purple],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .foregroundStyle(.white)
                    .cornerRadius(12)
                }
            }

            // Analyze button (if image captured but not analyzed)
            if viewModel.capturedImage != nil && viewModel.analysisState == .idle {
                Button {
                    _Concurrency.Task {
                        if let image = viewModel.capturedImage {
                            await viewModel.analyzeImage(image)
                        }
                    }
                } label: {
                    HStack {
                        Image(systemName: "sparkles")
                            .font(.title3)
                        Text("Analyze Homework")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.orange)
                    .foregroundStyle(.white)
                    .cornerRadius(12)
                }
            }

            // Voice help button (if analysis complete)
            if viewModel.analysisState == .complete {
                Button {
                    viewModel.showingVoiceSession = true
                } label: {
                    HStack {
                        Image(systemName: "mic.fill")
                            .font(.title3)
                        Text("Start Voice Help")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        LinearGradient(
                            colors: [.green, .teal],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .foregroundStyle(.white)
                    .cornerRadius(12)
                }
            }

            // Re-capture button (if image exists)
            if viewModel.capturedImage != nil {
                Button {
                    viewModel.showingCamera = true
                } label: {
                    HStack {
                        Image(systemName: "arrow.triangle.2.circlepath.camera")
                            .font(.title3)
                        Text("Retake Photo")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(.systemGray5))
                    .foregroundStyle(.primary)
                    .cornerRadius(12)
                }
            }
        }
    }
}

// MARK: - Homework Help View Model

@MainActor
final class HomeworkHelpViewModel: ObservableObject {
    // MARK: - Published State

    @Published var capturedImage: UIImage?
    @Published var analysisState: AnalysisState = .idle
    @Published var analysisResult: AnalysisResult?
    @Published var showingCamera = false
    @Published var showingVoiceSession = false
    @Published var showError = false
    @Published var errorMessage = ""

    // MARK: - Dependencies

    private let visionService = VisionAnalysisService.shared
    private let coachPersonality = StudyCoachPersonality.shared
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

    init() {
        setupObservers()
    }

    private func setupObservers() {
        // Observe when camera dismisses with captured image
        // This would be handled by the sheet's onDisappear in production
    }

    // MARK: - Image Management

    func clearImage() {
        capturedImage = nil
        analysisResult = nil
        analysisState = .idle
    }

    // MARK: - Vision Analysis

    func analyzeImage(_ image: UIImage) async {
        analysisState = .analyzing

        do {
            // Determine analysis type based on context
            // For now, use general analysis
            let result = try await visionService.analyzeHomework(
                image: image,
                analysisType: .general,
                language: coachPersonality.currentLanguage
            )

            analysisResult = result
            analysisState = .complete

            // Prepare context for voice session
            prepareVoiceContext(with: result)
        } catch {
            analysisState = .failed
            showError(error.localizedDescription)
        }
    }

    // MARK: - Voice Session Management

    private func prepareVoiceContext(with analysis: AnalysisResult) {
        // Extract subject and concepts from analysis
        let subject = extractSubject(from: analysis)
        let concepts = analysis.identifiedConcepts

        // Update coach personality context
        var context = ConversationContext(
            subject: subject,
            material: "Homework captured via camera",
            topicsCovered: [],
            strugglingConcepts: [],
            currentDifficultyLevel: .intermediate
        )

        coachPersonality.updateContext(context)
    }

    private func extractSubject(from analysis: AnalysisResult) -> String {
        // Simple heuristic based on identified concepts
        // In production, this would be more sophisticated

        let concepts = analysis.identifiedConcepts.map { $0.lowercased() }

        if concepts.contains(where: { $0.contains("math") || $0.contains("algebra") || $0.contains("calculus") }) {
            return "Mathematics"
        } else if concepts.contains(where: { $0.contains("physics") || $0.contains("force") || $0.contains("energy") }) {
            return "Physics"
        } else if concepts.contains(where: { $0.contains("chemistry") || $0.contains("molecule") || $0.contains("atom") }) {
            return "Chemistry"
        } else if concepts.contains(where: { $0.contains("history") || $0.contains("war") || $0.contains("century") }) {
            return "History"
        } else if concepts.contains(where: { $0.contains("literature") || $0.contains("poem") || $0.contains("author") }) {
            return "Literature"
        } else {
            return "General Studies"
        }
    }

    func startVoiceSessionWithContext() {
        // Voice session will use the context prepared by prepareVoiceContext
        // The VoiceConversationView will access StudyCoachPersonality.shared
        // which has been updated with the homework context
    }

    func stopVoiceSession() {
        // Clear voice session state
        showingVoiceSession = false
    }

    // MARK: - Error Handling

    private func showError(_ message: String) {
        errorMessage = message
        showError = true
    }
}

// MARK: - Analysis State

enum AnalysisState {
    case idle
    case analyzing
    case complete
    case failed
}

// MARK: - Preview

#Preview {
    HomeworkHelpView()
}
