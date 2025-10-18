import Combine
import os.log
import PencilKit
import SwiftUI

/// View for marking up photos with Apple Pencil or finger
struct PhotoMarkupView: View {
    let image: UIImage
    let onSave: (UIImage) -> Void
    let onCancel: () -> Void

    @StateObject private var viewModel = PhotoMarkupViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Canvas area with image and drawing
                    GeometryReader { geometry in
                        ZStack {
                            Image(uiImage: image)
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: geometry.size.width, height: geometry.size.height)

                            PencilKitCanvasView(
                                canvasView: viewModel.canvasView,
                                toolPicker: viewModel.toolPicker
                            )
                            .frame(width: geometry.size.width, height: geometry.size.height)
                        }
                    }

                    // Toolbar
                    toolbarView
                        .padding()
                        .background(Color(.systemBackground))
                }
            }
            .navigationTitle("Markup Photo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        onCancel()
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveMarkup()
                    }
                }
            }
        }
        .onAppear {
            viewModel.setupCanvas(for: image)
        }
    }

    private var toolbarView: some View {
        HStack(spacing: 16) {
            // Undo button
            Button {
                viewModel.undo()
            } label: {
                Image(systemName: "arrow.uturn.backward")
                    .font(.title3)
                    .frame(width: 44, height: 44)
            }
            .disabled(!viewModel.canUndo)

            // Redo button
            Button {
                viewModel.redo()
            } label: {
                Image(systemName: "arrow.uturn.forward")
                    .font(.title3)
                    .frame(width: 44, height: 44)
            }
            .disabled(!viewModel.canRedo)

            Spacer()

            // Clear all button
            Button(role: .destructive) {
                viewModel.clearCanvas()
            } label: {
                Label("Clear All", systemImage: "trash")
                    .font(.subheadline)
            }
        }
    }

    private func saveMarkup() {
        if let markedUpImage = viewModel.renderMarkupImage(baseImage: image) {
            onSave(markedUpImage)
            dismiss()
        }
    }
}

// MARK: - PencilKit Canvas View

struct PencilKitCanvasView: UIViewRepresentable {
    let canvasView: PKCanvasView
    let toolPicker: PKToolPicker

    func makeUIView(context: Context) -> PKCanvasView {
        canvasView.drawingPolicy = .anyInput // Support both Pencil and finger
        canvasView.backgroundColor = .clear
        canvasView.isOpaque = false

        // Show tool picker
        toolPicker.setVisible(true, forFirstResponder: canvasView)
        toolPicker.addObserver(canvasView)

        canvasView.becomeFirstResponder()

        return canvasView
    }

    func updateUIView(_ uiView: PKCanvasView, context: Context) {
        // No updates needed
    }
}

// MARK: - Photo Markup View Model

@MainActor
final class PhotoMarkupViewModel: NSObject, ObservableObject {
    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "PhotoMarkup")

    let canvasView = PKCanvasView()
    let toolPicker = PKToolPicker()

    @Published var canUndo = false
    @Published var canRedo = false

    private var undoManager: UndoManager? {
        canvasView.undoManager
    }

    override init() {
        super.init()
        setupCanvasObservers()
    }

    func setupCanvas(for image: UIImage) {
        // Set canvas size to match image
        canvasView.drawing = PKDrawing()
        canvasView.delegate = self
        updateUndoRedoState()

        logger.info("Canvas setup for image: \(image.size.width)x\(image.size.height)")
    }

    private func setupCanvasObservers() {
        // Canvas delegate will handle drawing changes
    }

    func undo() {
        undoManager?.undo()
        updateUndoRedoState()
        logger.debug("Undo performed")
    }

    func redo() {
        undoManager?.redo()
        updateUndoRedoState()
        logger.debug("Redo performed")
    }

    func clearCanvas() {
        canvasView.drawing = PKDrawing()
        updateUndoRedoState()
        logger.info("Canvas cleared")
    }

    private func updateUndoRedoState() {
        canUndo = undoManager?.canUndo ?? false
        canRedo = undoManager?.canRedo ?? false
    }

    func renderMarkupImage(baseImage: UIImage) -> UIImage? {
        // Create graphics context with base image size
        let size = baseImage.size
        let format = UIGraphicsImageRendererFormat()
        format.scale = baseImage.scale
        format.opaque = false

        let renderer = UIGraphicsImageRenderer(size: size, format: format)

        let markedUpImage = renderer.image { _ in
            // Draw base image
            baseImage.draw(in: CGRect(origin: .zero, size: size))

            // Draw canvas drawing on top
            let drawing = canvasView.drawing
            let drawingImage = drawing.image(from: CGRect(origin: .zero, size: size), scale: baseImage.scale)
            drawingImage.draw(in: CGRect(origin: .zero, size: size))
        }

        logger.info("Markup image rendered: \(markedUpImage.size.width)x\(markedUpImage.size.height)")
        return markedUpImage
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}

// MARK: - PKCanvasViewDelegate

extension PhotoMarkupViewModel: PKCanvasViewDelegate {
    func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
        updateUndoRedoState()
    }
}

// MARK: - Preview

#Preview {
    PhotoMarkupView(
        image: UIImage(systemName: "photo")!,
        onSave: { _ in },
        onCancel: {}
    )
}
