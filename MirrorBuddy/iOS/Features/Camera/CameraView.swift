import AVFoundation
import Combine
import SwiftUI

/// One-handed optimized camera interface for homework capture
struct CameraView: View {
    @StateObject private var viewModel = CameraViewModel()
    @Environment(\.dismiss) private var dismiss

    @State private var captureButtonOffset: CGSize = .zero
    @State private var showingMarkup = false
    @State private var capturedImage: UIImage?

    var body: some View {
        ZStack {
            // Camera preview
            CameraPreviewView(previewLayer: viewModel.previewLayer)
                .ignoresSafeArea()
                .onTapGesture { location in
                    viewModel.focusAndExpose(at: location)
                }

            // Overlay UI
            VStack {
                // Top controls
                topControlsView
                    .padding()

                Spacer()

                // Bottom controls
                bottomControlsView
                    .padding()
                    .background(.ultraThinMaterial)
            }

            // Floating capture button
            floatingCaptureButton
        }
        .sheet(isPresented: $showingMarkup) {
            if let image = capturedImage {
                PhotoMarkupView(
                    image: image,
                    onSave: { markedUpImage in
                        viewModel.savePhoto(markedUpImage)
                        dismiss()
                    },
                    onCancel: {
                        showingMarkup = false
                    }
                )
            }
        }
        .alert("Camera Error", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage)
        }
        .task {
            await viewModel.setupCamera()
        }
        .onDisappear {
            viewModel.stopCamera()
        }
    }

    private var topControlsView: some View {
        HStack {
            // Close button
            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.title3)
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(Color.black.opacity(0.5))
                    .clipShape(Circle())
            }

            Spacer()

            // Flash toggle
            Button {
                viewModel.toggleFlash()
            } label: {
                Image(systemName: viewModel.isFlashOn ? "bolt.fill" : "bolt.slash.fill")
                    .font(.title3)
                    .foregroundStyle(viewModel.isFlashOn ? .yellow : .white)
                    .frame(width: 44, height: 44)
                    .background(Color.black.opacity(0.5))
                    .clipShape(Circle())
            }

            // Camera flip button
            Button {
                _Concurrency.Task {
                    await viewModel.switchCamera()
                }
            } label: {
                Image(systemName: "camera.rotate")
                    .font(.title3)
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(Color.black.opacity(0.5))
                    .clipShape(Circle())
            }
        }
    }

    private var bottomControlsView: some View {
        HStack(spacing: 24) {
            // Gallery button
            Button {
                _Concurrency.Task {
                    await viewModel.openGallery()
                }
            } label: {
                Image(systemName: "photo.on.rectangle")
                    .font(.title2)
                    .foregroundStyle(.white)
                    .frame(width: 50, height: 50)
            }

            // Capture mode toggle
            Button {
                viewModel.toggleCaptureMode()
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: viewModel.captureMode == .photo ? "camera.fill" : "video.fill")
                        .font(.title3)
                    Text(viewModel.captureMode == .photo ? "Photo" : "Video")
                        .font(.caption2)
                }
                .foregroundStyle(.white)
                .frame(width: 60)
            }

            // Burst mode button (photo mode only)
            if viewModel.captureMode == .photo {
                Button {
                    viewModel.captureBurst()
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: "camera.burst")
                            .font(.title3)
                        Text("Burst")
                            .font(.caption2)
                    }
                    .foregroundStyle(.white)
                    .frame(width: 60)
                }
            }
        }
        .frame(height: 80)
    }

    private var floatingCaptureButton: some View {
        VStack {
            Spacer()

            HStack {
                Spacer()

                Button {
                    if viewModel.captureMode == .photo {
                        viewModel.capturePhoto { image in
                            capturedImage = image
                            showingMarkup = true
                        }
                    } else {
                        viewModel.toggleVideoRecording()
                    }
                } label: {
                    ZStack {
                        Circle()
                            .fill(viewModel.isRecording ? Color.red : Color.white)
                            .frame(width: 70, height: 70)

                        if viewModel.isRecording {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.white)
                                .frame(width: 24, height: 24)
                        } else {
                            Circle()
                                .strokeBorder(Color.black, lineWidth: 3)
                                .frame(width: 60, height: 60)
                        }
                    }
                    .shadow(radius: 4)
                }
                .sensoryFeedback(.impact, trigger: viewModel.isRecording)
                .offset(captureButtonOffset)
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            captureButtonOffset = value.translation
                        }
                        .onEnded { _ in
                            withAnimation(.spring()) {
                                captureButtonOffset = .zero
                            }
                        }
                )

                Spacer()
                    .frame(width: 40)
            }

            // Recording duration
            if viewModel.isRecording {
                Text(viewModel.recordingDurationText)
                    .font(.system(.title3, design: .monospaced))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.red)
                    .clipShape(Capsule())
                    .padding(.bottom, 8)
            }

            Spacer()
                .frame(height: 100)
        }
    }
}

// MARK: - Camera Preview View

struct CameraPreviewView: UIViewRepresentable {
    let previewLayer: AVCaptureVideoPreviewLayer?

    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        view.backgroundColor = .black

        if let previewLayer {
            previewLayer.frame = view.bounds
            previewLayer.videoGravity = .resizeAspectFill
            view.layer.addSublayer(previewLayer)
        }

        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        if let previewLayer {
            previewLayer.frame = uiView.bounds
        }
    }
}

// MARK: - Camera View Model

@MainActor
final class CameraViewModel: ObservableObject {
    private let cameraManager = CameraManager.shared
    private let photoLibraryManager = PhotoLibraryManager.shared

    @Published var previewLayer: AVCaptureVideoPreviewLayer?
    @Published var captureMode: CaptureMode = .photo
    @Published var isFlashOn = false
    @Published var isRecording = false
    @Published var recordingDurationText = "00:00"
    @Published var showError = false
    @Published var errorMessage = ""

    private var videoURL: URL?

    init() {
        setupCallbacks()
    }

    func setupCamera() async {
        do {
            try await cameraManager.setupCamera(position: .back)
            previewLayer = cameraManager.createPreviewLayer()
            cameraManager.startSession()
        } catch {
            showError(error.localizedDescription)
        }
    }

    func stopCamera() {
        cameraManager.stopSession()
    }

    private func setupCallbacks() {
        cameraManager.onModeChanged = { [weak self] mode in
            self?.captureMode = mode
        }

        cameraManager.onVideoRecordingStarted = { [weak self] in
            self?.isRecording = true
        }

        cameraManager.onVideoRecordingFinished = { [weak self] url in
            self?.isRecording = false
            self?.videoURL = url
            self?.saveVideo(url)
        }

        cameraManager.onRecordingDurationUpdate = { [weak self] duration in
            self?.updateRecordingDuration(duration)
        }

        cameraManager.onError = { [weak self] error in
            self?.showError(error.localizedDescription)
        }
    }

    func capturePhoto(completion: @escaping (UIImage) -> Void) {
        cameraManager.onPhotoCapture = { image in
            completion(image)
        }
        cameraManager.capturePhoto()
    }

    func captureBurst() {
        cameraManager.captureBurst(count: 5)
    }

    func toggleCaptureMode() {
        let newMode: CaptureMode = captureMode == .photo ? .video : .photo
        cameraManager.setCaptureMode(newMode)
    }

    func toggleFlash() {
        isFlashOn.toggle()
        // Flash is automatically handled by CameraManager in photo settings
    }

    func switchCamera() async {
        do {
            try await cameraManager.switchCamera()
        } catch {
            showError(error.localizedDescription)
        }
    }

    func toggleVideoRecording() {
        if isRecording {
            cameraManager.stopVideoRecording()
        } else {
            videoURL = cameraManager.startVideoRecording()
        }
    }

    func openGallery() async {
        // Request permission
        let hasPermission = await photoLibraryManager.requestPermission()
        guard hasPermission else {
            showError("Photo library access denied")
            return
        }

        // Fetch recent photos
        do {
            _ = try await photoLibraryManager.fetchRecentPhotos(limit: 1)
            // TODO: Show photo picker or recent photo
        } catch {
            showError(error.localizedDescription)
        }
    }

    func savePhoto(_ image: UIImage) {
        _Concurrency.Task {
            do {
                _ = try await photoLibraryManager.savePhoto(image)
            } catch {
                showError(error.localizedDescription)
            }
        }
    }

    private func saveVideo(_ url: URL) {
        _Concurrency.Task {
            do {
                _ = try await photoLibraryManager.saveVideo(at: url)
            } catch {
                showError(error.localizedDescription)
            }
        }
    }

    func focusAndExpose(at point: CGPoint) {
        guard let previewLayer else { return }

        // Convert tap point to camera coordinates
        let devicePoint = previewLayer.captureDevicePointConverted(fromLayerPoint: point)

        do {
            try cameraManager.setFocusPoint(devicePoint)
            try cameraManager.setExposurePoint(devicePoint)
        } catch {
            showError(error.localizedDescription)
        }
    }

    private func updateRecordingDuration(_ duration: TimeInterval) {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        recordingDurationText = String(format: "%02d:%02d", minutes, seconds)
    }

    private func showError(_ message: String) {
        errorMessage = message
        showError = true
    }
}

// MARK: - Preview

#Preview {
    CameraView()
}
